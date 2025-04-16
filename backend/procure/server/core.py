from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, and_, func
from datetime import datetime, timezone
from typing import List, Tuple, Optional, Set
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
        user_stmt = select(Employee).where(Employee.email == email)
        user: Optional[Employee] = db.scalars(user_stmt).one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with email {email} not found"
            )

        # Get purchased SaaS URLs using select
        purchased_urls_stmt = (
            select(PurchasedSaas.url)
            .where(PurchasedSaas.owner == user.user_id)
        )
        purchased_urls: Set[str] = {row[0] for row in db.execute(purchased_urls_stmt)}

        today = datetime.now(timezone.utc).date()

        # Process entries and find matches
        matched_entries: List[Tuple[str, str, int]] = []  # [(url, browser, timestamp)]
        for entry in log_data.entries:
            matching_url = next(
                (url for url in purchased_urls if url in entry.url),
                None
            )
            if matching_url:
                matched_entries.append((
                    matching_url,
                    entry.browser,
                    entry.timestamp
                ))

        if not matched_entries:
            return UrlVisitResponse(
                processed=len(log_data.entries),
                matched=0,
                message="No matching URLs found"
            )

        # Check existing activities for today in bulk
        existing_activities_stmt = (
            select(EmployeeActivity.url)
            .where(and_(
                EmployeeActivity.user_id == user.user_id,
                EmployeeActivity.url.in_([url for url, _, _ in matched_entries]),
                func.date(EmployeeActivity.date) == today
            ))
        )
        existing_urls: Set[str] = {row[0] for row in db.execute(existing_activities_stmt)}

        # Create new activities for URLs not yet recorded today
        new_activities = [
            EmployeeActivity(
                user_id=user.user_id,
                url=url,
                browser=browser,
                date=datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
            )
            for url, browser, timestamp in matched_entries
            if url not in existing_urls
        ]

        if new_activities:
            # Use a context manager for transaction management
            with db.begin():
                # Bulk insert new activities
                db.bulk_save_objects(
                    new_activities,
                    return_defaults=False
                )

        return UrlVisitResponse(
            processed=len(log_data.entries),
            matched=len(new_activities),
            message="URL visit logs processed successfully"
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
