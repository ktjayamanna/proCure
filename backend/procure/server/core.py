from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
# No type imports needed
import logging

from procure.auth.dependencies import get_current_user_email
from procure.server.models import UrlVisitLog, UrlVisitResponse
from procure.db.engine import SessionLocal
from procure.db import core as db_core

# Set up logging
logger = logging.getLogger(__name__)

# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create router
router = APIRouter(prefix="/api/v1", tags=["core"])

@router.post("/url-visits", response_model=UrlVisitResponse)
async def log_url_visits(
    log_data: UrlVisitLog,
    db: Session = Depends(get_db),
    email: str = Depends(get_current_user_email)
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

def register_core_routes(app):
    """Register core routes with the main FastAPI app"""
    app.include_router(router)
