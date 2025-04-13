from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import logging
import os
from clerk_backend_api import Clerk
from clerk_backend_api.jwks_helpers import AuthenticateRequestOptions


from procure.server.models import UrlVisitLog, UrlVisitResponse
from procure.db.engine import SessionLocal
from procure.db.models import User, PurchasedSaas, UserActivity

from dotenv import load_dotenv
load_dotenv(".vscode/.env")

# Set up logging
logger = logging.getLogger(__name__)

# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def is_signed_in(request: Request):
    sdk = Clerk(bearer_auth=os.getenv('CLERK_SECRET_KEY'))
    request_state = sdk.authenticate_request(
        request,
        AuthenticateRequestOptions(
            # authorized_parties=[os.getenv('CLERK_AUTHORIZED_PARTY')] # works without this being empty.
        )
    )
    is_authenticated = request_state.is_signed_in
    if not is_authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return is_authenticated


# Create router
router = APIRouter(prefix="/api/v1", tags=["core"])

@router.post("/url-visits", response_model=UrlVisitResponse)
async def log_url_visits(
    log_data: UrlVisitLog,
    db: Session = Depends(get_db),
    _: bool = Depends(is_signed_in)
):
    """
    Receive daily URL visit logs from users and update the database
    if the URLs are from purchased SaaS.
    """
    try:
        # Find the user by email
        user = db.query(User).filter(User.email == log_data.user_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with email {log_data.user_email} not found"
            )

        # Get all purchased SaaS URLs
        purchased_saas_urls = db.query(PurchasedSaas.url).all()

        # Extract URLs into a set for faster lookup
        purchased_urls = {saas.url for saas in purchased_saas_urls}

        # Process each URL visit entry
        matched_count = 0
        for entry in log_data.entries:
            # Check if the URL matches any purchased SaaS
            # We need to check if the hostname from the entry URL is in any of the purchased URLs
            # This is a simplified check - in a real implementation, you might want to use
            # a more sophisticated URL matching algorithm

            # For now, we'll do a simple check if the entry URL contains any of the purchased URLs
            for purchased_url in purchased_urls:
                if purchased_url in entry.url:
                    # Create a new user activity record
                    activity = UserActivity(
                        user_id=user.user_id,
                        browser=entry.browser,
                        url=purchased_url,  # Use the matched purchased URL
                        date=datetime.fromtimestamp(entry.timestamp / 1000)  # Convert from milliseconds
                    )
                    db.add(activity)
                    matched_count += 1
                    break

        # Commit the changes
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
