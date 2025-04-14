from typing import Optional
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

def get_current_user_email(request: Request) -> str:
    """
    Authenticate the request and return the user's email.
    This function merges the functionality of checking if the user
    is signed in and extracting the email from the token payload.
    """
    try:
        sdk = Clerk(bearer_auth=os.getenv('CLERK_SECRET_KEY'))
        token_state = sdk.authenticate_request(
            request,
            AuthenticateRequestOptions(
                # authorized_parties=[os.getenv('CLERK_AUTHORIZED_PARTY')]
            )
        )
        if not token_state.is_signed_in or not getattr(token_state, 'is_valid', True):
            logger.error("Authentication failed. Invalid or missing token.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed. Invalid or missing token."
            )

        user_id = token_state.payload.get("sub")
        if not user_id:
            logger.error("User identifier ('sub') not found in token payload.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User identifier not found in token payload."
            )

        user_details = sdk.users.get(user_id=user_id)
        if user_details.email_addresses and len(user_details.email_addresses) > 0:
            email = user_details.email_addresses[0].email_address
        else:
            email = None

        if not email:
            logger.error("Email not found in user details.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email not found in user details."
            )

        return email
    except Exception as exc:
        logger.exception("Error authenticating request: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing authentication."
        )

# Create router
router = APIRouter(prefix="/api/v1", tags=["core"])

@router.post("/url-visits", response_model=UrlVisitResponse)
async def log_url_visits(
    log_data: UrlVisitLog,
    request: Request,
    db: Session = Depends(get_db),
    email: str = Depends(get_current_user_email)
):
    """
    Receive daily URL visit logs from users and update the database
    if the URLs are from purchased SaaS.
    """
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with email {email} not found"
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
                    activity = UserActivity(
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
