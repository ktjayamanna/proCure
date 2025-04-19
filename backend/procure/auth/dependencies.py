import logging
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from procure.db.engine import SessionLocal
from procure.db.models import User
from procure.db import auth as db_auth
from procure.auth.utils import get_token_from_request, SECRET, COOKIE_NAME
from fastapi_users.jwt import decode_jwt

# Set up logging
logger = logging.getLogger(__name__)

# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user_email(request: Request, db: Session = Depends(get_db)) -> str:
    """Get the current user's email from the device token in the request or JWT cookie."""

    # First try to get token from Authorization header
    token = get_token_from_request(request)

    # If no token in header, try to get from cookie
    if not token:
        cookies = request.cookies
        jwt_token = cookies.get(COOKIE_NAME)

        if jwt_token:
            # Validate JWT token
            try:
                payload = decode_jwt(jwt_token, SECRET, ["fastapi-users:auth"])

                if payload and "sub" in payload:
                    # Get user by ID from JWT token
                    user_id = payload["sub"]
                    user = db_auth.get_user_by_id(db, user_id)
                    if user:
                        return user.email
            except Exception as e:
                logger.error(f"Error validating JWT token: {str(e)}")
                # Continue to try device token authentication

        # If no valid JWT token, require device token
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is missing"
            )

    try:
        # Authenticate with device token using the database module
        success, user = db_auth.authenticate_with_token(db, token)

        if not success or not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

        return user.email

    except SQLAlchemyError as e:
        logger.error(f"Database error during authentication: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during authentication: {str(e)}"
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Error during authentication: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during authentication: {str(e)}"
        )
