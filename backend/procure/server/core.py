from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import logging

from procure.server.auth import get_current_user_email
from procure.server.models import UrlVisitLog, UrlVisitResponse
from procure.db.engine import SessionLocal
from procure.db.models import Employee, PurchasedSaas, EmployeeActivity

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
    """
    Receive daily URL visit logs from users and update the database
    if the URLs are from purchased SaaS.
    """
    try:
        user = db.query(Employee).filter(Employee.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with email {email} not found"
            )

        # Get all purchased SaaS URLs
        purchased_saas_urls = db.query(PurchasedSaas.url).all()

        # Extract URLs into a set for faster lookup
        purchased_urls = {saas.url for saas in purchased_saas_urls}

        # Process each URL visit entry
        matched_count = 0
        for entry in log_data.entries:
            # Check if the entry URL contains any of the purchased SaaS URLs
            for purchased_url in purchased_urls:
                if purchased_url in entry.url:
                    activity = EmployeeActivity(
                        user_id=user.user_id,
                        browser=entry.browser,
                        url=purchased_url,  # Use the matched purchased URL
                        date=datetime.fromtimestamp(entry.timestamp / 1000)  # Convert from milliseconds
                    )
                    db.add(activity)
                    matched_count += 1
                    break

        db.commit()

        return UrlVisitResponse(
            processed=len(log_data.entries),
            matched=matched_count,
            message="URL visit logs processed successfully"
        )

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error processing URL visits: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error processing URL visits: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing URL visits: {str(e)}"
        )

def register_core_routes(app):
    """Register core routes with the main FastAPI app"""
    app.include_router(router)
