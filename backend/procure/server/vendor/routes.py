"""
Vendor routes for the proCure application.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from procure.server.utils import normalize_url

from procure.auth.users import authenticate_user_by_token
from procure.server.vendor.schemas import VendorContractRequest, VendorContractResponse
from procure.utils.db_utils import get_db
from procure.db.models import Vendor
from procure.db import core as db_core
from procure.configs.app_configs import API_PREFIX

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix=API_PREFIX, tags=["vendor"])

@router.post("/vendor/contract", response_model=VendorContractResponse)
async def add_vendor_contract(
    contract_data: VendorContractRequest,
    db: Session = Depends(get_db),
    email: str = Depends(authenticate_user_by_token)
):
    """
    Add a vendor contract to the database.

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

        # Create a new vendor record
        new_vendor = Vendor(
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

        # Try to add the new vendor
        db.add(new_vendor)
        db.flush()
        db.commit()

        # Return success response for new contract
        return VendorContractResponse(
            success=True,
            contract_id=new_vendor.contract_id,
            vendor_name=new_vendor.vendor_name,
            product_url=normalized_url,
            message="Vendor contract created successfully",
            created=True
        )

    except IntegrityError as e:
        # Rollback the transaction
        db.rollback()

        # Check if the error is due to the unique constraint
        if "uq_org_product_url" in str(e):
            try:
                # Find the existing vendor record
                existing_vendor = db.query(Vendor).filter(
                    Vendor.organization_id == contract_data.organization_id,
                    Vendor.product_url == normalized_url
                ).first()

                if existing_vendor:
                    # Update the existing vendor record
                    existing_vendor.vendor_name = contract_data.vendor_name
                    existing_vendor.annual_spend = contract_data.annual_spend
                    existing_vendor.contract_type = contract_data.contract_type
                    existing_vendor.contract_status = contract_data.contract_status
                    existing_vendor.payment_type = contract_data.payment_type
                    existing_vendor.num_seats = contract_data.num_seats
                    existing_vendor.notes = contract_data.notes
                    existing_vendor.owner_id = user.id  # Update the owner to the current user

                    # Commit the changes
                    db.commit()

                    # Return success response for updated contract
                    return VendorContractResponse(
                        success=True,
                        contract_id=existing_vendor.contract_id,
                        vendor_name=existing_vendor.vendor_name,
                        product_url=normalized_url,
                        message="Vendor contract updated successfully",
                        created=False
                    )

            except SQLAlchemyError as update_error:
                logger.error(f"Error updating existing vendor: {str(update_error)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error updating vendor: {str(update_error)}"
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
        logger.error(f"Database error adding vendor contract: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

def register_vendor_routes(app):
    """Register vendor routes with the main FastAPI app"""
    app.include_router(router)
