"""
Organization management routes for the proCure application.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from procure.auth.users import authenticate_user_by_token
from procure.server.manage.schemas import OrganizationNameResponse
from procure.server.manage import orgs
from procure.utils.db_utils import get_db
from procure.configs.app_configs import API_PREFIX

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix=API_PREFIX, tags=["manage"])

@router.get("/organizations/{organization_id}/name", response_model=OrganizationNameResponse)
async def get_organization_name(
    organization_id: str,
    db: Session = Depends(get_db),
    email: str = Depends(authenticate_user_by_token)
):
    """
    Get an organization name by its ID.

    Args:
        organization_id: The organization ID to look up
        db: Database session dependency
        email: Authenticated user email from token

    Returns:
        Organization name information
    """
    try:
        # Get organization name from database
        result = orgs.get_organization_name_by_id(db, organization_id)

        # Handle error case
        if not result.get("success", True):
            raise HTTPException(
                status_code=result.get("status_code", status.HTTP_500_INTERNAL_SERVER_ERROR),
                detail=result.get("error", "Unknown error retrieving organization")
            )

        # Return organization name
        return result["organization"]

    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving organization: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


def register_manage_routes(app):
    """Register organization management routes with the main FastAPI app"""
    app.include_router(router)
