import logging
import secrets
import hashlib
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel, EmailStr, Field, field_validator

from procure.db.engine import SessionLocal
from procure.db.models import Employee, EmployeeDeviceToken

# Set up logging
logger = logging.getLogger(__name__)

# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models for request/response
class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    company_name: str = Field(..., pattern=r'^\d{6}$')
    device_id: str

    @field_validator('company_name')
    @classmethod
    def validate_company_name(cls, v):
        """Validate company_name is a 6-digit number"""
        if not v.isdigit() or len(v) != 6:
            raise ValueError('Organization Code must be a 6-digit number')
        return v

    @field_validator('password')
    @classmethod
    def password_strength(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        return v

class CreateUserResponse(BaseModel):
    user_id: int
    email: str
    company_name: str
    device_token: str

class SignInRequest(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    device_token: Optional[str] = None
    device_id: str

class SignInResponse(BaseModel):
    user_id: int
    email: str
    company_name: Optional[str]
    device_token: str

# Helper functions
def get_token_from_request(request: Request) -> Optional[str]:
    """Extract the device token from the Authorization header."""
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.replace("Bearer ", "")

async def get_current_user_email(request: Request, db: Session = Depends(get_db)) -> str:
    """Get the current user's email from the device token in the request."""
    # For development/testing, set this to True to bypass authentication
    BYPASS_AUTH = True
    if BYPASS_AUTH:
        return "kaveen.jayamanna@gmail.com"

    token = get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing"
        )

    try:
        # Find the device token in the database
        token_record = db.query(EmployeeDeviceToken).filter(EmployeeDeviceToken.token == token).first()
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

        # Get the employee associated with the token
        user = db.query(Employee).filter(Employee.user_id == token_record.user_id).first()
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

def generate_device_token():
    """Generate a secure random token for device authentication"""
    return secrets.token_urlsafe(32)  # 256 bits of entropy

def hash_password(password: str) -> str:
    """Hash a password for storing"""
    # In a production environment, use a proper password hashing library like passlib
    # This is a simple example using hashlib
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a stored password against a provided password"""
    return hash_password(plain_password) == hashed_password

# Create router
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/create-user", response_model=CreateUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: CreateUserRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new user with the provided information.
    """
    try:
        # Check if employee with this email already exists
        existing_user = db.query(Employee).filter(Employee.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee with email {user_data.email} already exists"
            )

        # Create new employee
        hashed_password = hash_password(user_data.password)
        new_user = Employee(
            email=user_data.email,
            password_hash=hashed_password,
            company_name=user_data.company_name
        )
        db.add(new_user)
        db.flush()  # Flush to get the user_id

        # Generate and store device token
        device_token = generate_device_token()
        new_token = EmployeeDeviceToken(
            user_id=new_user.user_id,
            device_id=user_data.device_id,
            token=device_token
        )
        db.add(new_token)
        db.commit()

        return CreateUserResponse(
            user_id=new_user.user_id,
            email=new_user.email,
            company_name=new_user.company_name,
            device_token=device_token
        )

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@router.post("/sign-in", response_model=SignInResponse)
async def sign_in(
    sign_in_data: SignInRequest,
    db: Session = Depends(get_db)
):
    """
    Sign in a user using either email/password or a device token.
    """
    try:
        user = None
        device_token = sign_in_data.device_token

        # Try to authenticate with device token first
        if device_token:
            token_record = db.query(EmployeeDeviceToken).filter(EmployeeDeviceToken.token == device_token).first()
            if token_record:
                user = db.query(Employee).filter(Employee.user_id == token_record.user_id).first()

        # If device token authentication failed, try email/password
        if not user and sign_in_data.email and sign_in_data.password:
            user = db.query(Employee).filter(Employee.email == sign_in_data.email).first()
            if not user or not verify_password(sign_in_data.password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed"
            )

        # If we authenticated with email/password, generate a new device token
        if not device_token:
            # Check if a token already exists for this device
            existing_token = db.query(EmployeeDeviceToken).filter(
                EmployeeDeviceToken.user_id == user.user_id,
                EmployeeDeviceToken.device_id == sign_in_data.device_id
            ).first()

            if existing_token:
                # Update the existing token
                device_token = generate_device_token()
                existing_token.token = device_token
            else:
                # Create a new token
                device_token = generate_device_token()
                new_token = EmployeeDeviceToken(
                    user_id=user.user_id,
                    device_id=sign_in_data.device_id,
                    token=device_token
                )
                db.add(new_token)

            db.commit()

        return SignInResponse(
            user_id=user.user_id,
            email=user.email,
            company_name=user.company_name,
            device_token=device_token
        )

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error during sign-in: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error during sign-in: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during sign-in: {str(e)}"
        )

def register_auth_routes(app):
    """Register authentication routes with the main FastAPI app"""
    app.include_router(router)
