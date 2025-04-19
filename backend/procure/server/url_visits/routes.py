"""
URL visits routes for the proCure application.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import logging

from procure.auth.users import authenticate_user_by_token
from procure.server.url_visits.models import UrlVisitLog, UrlVisitResponse
from procure.utils.db_utils import get_db
from procure.db import core as db_core
from procure.configs.app_configs import API_PREFIX

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix=API_PREFIX, tags=["url_visits"])

@router.post("/url-visits", response_model=UrlVisitResponse)
async def log_url_visits(
    log_data: UrlVisitLog,
    db: Session = Depends(get_db),
    email: str = Depends(authenticate_user_by_token)
):
    try:
        # Convert Pydantic model to dict for processing
        entries = [
            {
                "url": entry.url,
                "browser": entry.browser,
                "timestamp": entry.timestamp
            } for entry in log_data.entries
        ]

        # Process URL visits using the database module
        result = db_core.process_url_visits(db, email, entries)

        # Handle error case
        if not result.get("success", True):
            raise HTTPException(
                status_code=result.get("status_code", status.HTTP_500_INTERNAL_SERVER_ERROR),
                detail=result.get("error", "Unknown error processing URL visits")
            )

        # Return success response
        return UrlVisitResponse(
            processed=result["processed"],
            matched=result["matched"],
            message=result["message"]
        )

    except SQLAlchemyError as e:
        logger.error(f"Database error processing URL visits: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

def register_url_visits_routes(app):
    """Register URL visits routes with the main FastAPI app"""
    app.include_router(router)
