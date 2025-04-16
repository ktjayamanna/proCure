import logging
from typing import Optional
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from procure.db.engine import SessionLocal
from procure.db.models import User, UserDeviceToken

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_token_from_request(request: Request) -> Optional[str]:
    """Extract the device token from the Authorization header."""
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.replace("Bearer ", "")

async def get_current_user_email(request: Request, db: Session = Depends(get_db)) -> str:
    """Get the current user's email from the device token in the request."""
    # For development/testing, you can uncomment this to bypass authentication
    # return "kaveen.jayamanna@gmail.com"

    token = get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing"
        )

    try:
        # Find the device token in the database
        token_record = db.query(UserDeviceToken).filter(UserDeviceToken.token == token).first()
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

        # Get the user associated with the token
        user = db.query(User).filter(User.user_id == token_record.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
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
