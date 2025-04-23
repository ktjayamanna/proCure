"""
Contract routes for the proCure application.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from datetime import datetime

from procure.server.utils import normalize_url

from procure.auth.users import authenticate_user_by_token
from procure.server.contract.schemas import ContractRequest, ContractResponse
from procure.utils.db_utils import get_db
from procure.db.models import Contract
from procure.db import core as db_core
from procure.configs.app_configs import API_PREFIX

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix=API_PREFIX, tags=["contract"])

@router.post("/contract", response_model=ContractResponse)
async def add_contract(
    contract_data: ContractRequest,
    db: Session = Depends(get_db),
    email: str = Depends(authenticate_user_by_token)
):
    """
    Add a contract to the database.

    If a contract with the same organization_id and product_url already exists,
    the existing contract will be updated with the new data.

    Args:
        contract_data: The contract data to add
        db: Database session dependency
        email: Authenticated user email from token

    Returns:
        The result of the operation
    """
    try:
        # Get the user
        user = db_core.get_user_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with email {email} not found"
            )

        # Normalize the product URL
        try:
            normalized_url = normalize_url(contract_data.product_url)
        except ValueError as url_error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(url_error)
            )

        # Create a new contract record
        new_contract = Contract(
            vendor_name=contract_data.vendor_name,
            product_url=normalized_url,
            organization_id=contract_data.organization_id,
            owner_id=user.id,
            annual_spend=contract_data.annual_spend,
            contract_type=contract_data.contract_type,
            contract_status=contract_data.contract_status,
            payment_type=contract_data.payment_type,
            num_seats=contract_data.num_seats,
            notes=contract_data.notes
        )

        # Set date fields if provided
        if contract_data.expire_at:
            new_contract.expire_at = contract_data.expire_at

        if contract_data.created_at:
            new_contract.created_at = contract_data.created_at

        # Try to add the new contract
        db.add(new_contract)
        db.flush()
        db.commit()

        # Return success response for new contract
        return ContractResponse(
            success=True,
            contract_id=new_contract.contract_id,
            vendor_name=new_contract.vendor_name,
            product_url=normalized_url,
            message="Contract created successfully",
            created=True
        )

    except IntegrityError as e:
        # Rollback the transaction
        db.rollback()

        # Check if the error is due to the unique constraint
        if "uq_org_product_url" in str(e):
            try:
                # Find the existing contract record
                existing_contract = db.query(Contract).filter(
                    Contract.organization_id == contract_data.organization_id,
                    Contract.product_url == normalized_url
                ).first()

                if existing_contract:
                    # Update the existing contract record
                    existing_contract.vendor_name = contract_data.vendor_name
                    existing_contract.annual_spend = contract_data.annual_spend
                    existing_contract.contract_type = contract_data.contract_type
                    existing_contract.contract_status = contract_data.contract_status
                    existing_contract.payment_type = contract_data.payment_type
                    existing_contract.num_seats = contract_data.num_seats
                    existing_contract.notes = contract_data.notes
                    existing_contract.owner_id = user.id  # Update the owner to the current user

                    # Update date fields if provided
                    if contract_data.expire_at:
                        existing_contract.expire_at = contract_data.expire_at

                    if contract_data.created_at:
                        existing_contract.created_at = contract_data.created_at

                    # Commit the changes
                    db.commit()

                    # Return success response for updated contract
                    return ContractResponse(
                        success=True,
                        contract_id=existing_contract.contract_id,
                        vendor_name=existing_contract.vendor_name,
                        product_url=normalized_url,
                        message="Contract updated successfully",
                        created=False
                    )

            except SQLAlchemyError as update_error:
                logger.error(f"Error updating existing contract: {str(update_error)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error updating contract: {str(update_error)}"
                )

        # If we get here, it's another type of integrity error
        logger.error(f"Database integrity error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e)}"
        )

    except SQLAlchemyError as e:
        # Rollback the transaction
        db.rollback()

        # Log the error and return a 500 response
        logger.error(f"Database error adding contract: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

def register_contract_routes(app):
    """Register contract routes with the main FastAPI app"""
    app.include_router(router)
