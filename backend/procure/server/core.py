from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, tuple_
from datetime import datetime, timezone
from typing import List, Tuple
from sqlalchemy import func
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
    try:
        # Get user using select
        user_query = select(Employee).where(Employee.email == email)
        user = db.scalars(user_query).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with email {email} not found"
            )

        # Get purchased SaaS URLs using select
        purchased_urls_query = select(PurchasedSaas.url)
        purchased_urls = {row[0] for row in db.execute(purchased_urls_query)}

        today = datetime.now(timezone.utc).date()
        matched_urls: List[Tuple[str, str]] = []  # [(url, browser)]

        # Collect matched URLs
        for entry in log_data.entries:
            for purchased_url in purchased_urls:
                if purchased_url in entry.url:
                    matched_urls.append((purchased_url, entry.browser))
                    break

        if not matched_urls:
            return UrlVisitResponse(
                processed=len(log_data.entries),
                matched=0,
                message="No matching URLs found"
            )

        # Check existing activities for today in bulk
        existing_activities_query = select(EmployeeActivity.url).where(
            tuple_(
                EmployeeActivity.user_id,
                EmployeeActivity.url,
                func.date(EmployeeActivity.date)
            ).in_([
                (user.user_id, url, today) for url, _ in matched_urls
            ])
        )
        existing_urls = {row[0] for row in db.execute(existing_activities_query)}

        # Filter out URLs that already have entries today
        new_activities = [
            EmployeeActivity(
                user_id=user.user_id,
                url=url,
                browser=browser,
                date=datetime.now(timezone.utc)
            )
            for url, browser in matched_urls
            if url not in existing_urls
        ]

        if new_activities:
            db.bulk_save_objects(new_activities)
            db.commit()

        return UrlVisitResponse(
            processed=len(log_data.entries),
            matched=len(new_activities),
            message="URL visit logs processed successfully"
        )

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error processing URL visits: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

def register_core_routes(app):
    """Register core routes with the main FastAPI app"""
    app.include_router(router)
