"""
Analytics routes for the proCure application.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from procure.auth.users import authenticate_user_by_token
from procure.server.analytics.schemas import ContractUsageResponse
from procure.server.analytics import analytics
from procure.utils.db_utils import get_db
from procure.configs.app_configs import API_PREFIX

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix=API_PREFIX, tags=["analytics"])

@router.get("/organizations/{organization_id}/contract-usage", response_model=ContractUsageResponse)
async def get_contract_usage(
    organization_id: str,
    db: Session = Depends(get_db),
    email: str = Depends(authenticate_user_by_token)
):
    """
    Get contract usage statistics for an organization.

    This endpoint returns:
    - The count of unique users per contract for the current month
    - The total number of seats purchased per contract
    - The usage ratio (active users / total seats)

    Args:
        organization_id: The organization ID to analyze
        db: Database session dependency
        email: Authenticated user email from token

    Returns:
        Contract usage statistics
    """
    try:
        # Get contract usage statistics from database
        result = analytics.get_contract_usage_by_org_id(db, organization_id)

        # Handle error case
        if not result.get("success", True):
            raise HTTPException(
                status_code=result.get("status_code", status.HTTP_500_INTERNAL_SERVER_ERROR),
                detail=result.get("error", "Unknown error retrieving contract usage")
            )

        # Return contract usage statistics
        return ContractUsageResponse(
            organization_id=result["organization"]["organization_id"],
            company_name=result["organization"]["company_name"],
            contracts=result["contracts"]
        )

    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving contract usage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

def register_analytics_routes(app):
    """Register analytics routes with the main FastAPI app"""
    app.include_router(router)
