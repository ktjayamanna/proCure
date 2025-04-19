import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional

from procure.db.models import User
from procure.db import auth as db_auth
from procure.auth.dependencies import get_db, get_current_user_email
from procure.auth.schemas import (
    CreateUserRequest, CreateUserResponse,
    SignInRequest, SignInResponse,
    UserResponse
)
from procure.auth.utils import (
    hash_password, verify_password, generate_device_token,
    generate_jwt_token, COOKIE_NAME, COOKIE_MAX_AGE
)

# Set up logging
logger = logging.getLogger(__name__)

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
        # Check if user with this email already exists
        existing_user = db_auth.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with email {user_data.email} already exists"
            )

        # Create new employee and device token
        hashed_password = hash_password(user_data.password)

        # Extract domain from email to find matching organization
        email_parts = user_data.email.split('@')
        domain = email_parts[1] if len(email_parts) > 1 else 'unknown'

        # Find organization by domain name
        organization = db_auth.get_organization_by_name(db, domain)
        if not organization:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No organization found for domain {domain}. Sign up failed."
            )

        organization_id = organization.organization_id

        # Check if user can be added with the requested role
        role = user_data.role.lower()
        if role not in ["admin", "member"]:
            role = "member"  # Default to member if invalid role

        # Check if there are slots available for the requested role
        if role == "admin" and organization.admins_remaining <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No admin slots remaining in this organization. Sign up failed."
            )
        elif role == "member" and organization.members_remaining <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No member slots remaining in this organization. Sign up failed."
            )

        # Decrement the appropriate counter
        if role == "admin":
            organization.admins_remaining -= 1
        else:  # member
            organization.members_remaining -= 1

        # Create the user
        try:
            new_user = db_auth.create_user(
                db,
                user_data.email,
                hashed_password,
                organization_id,
                role
            )
        except ValueError as e:
            # Rollback the transaction
            db.rollback()
            # Convert ValueError to HTTPException
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e) + ". Sign up failed."
            )

        # Generate and store device token
        device_token = generate_device_token()
        db_auth.create_device_token(
            db,
            new_user.id,
            user_data.device_id,
            device_token
        )

        # Commit the transaction
        db.commit()

        return CreateUserResponse(
            id=new_user.id,
            email=new_user.email,
            organization_id=new_user.organization_id,
            device_token=device_token
        )

    except HTTPException as e:
        # HTTPExceptions are already properly formatted, just re-raise them
        # The transaction is already rolled back in the inner try-except block
        raise e
    except SQLAlchemyError as e:
        # Rollback the transaction
        db.rollback()
        logger.error(f"Database error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}. Sign up failed."
        )
    except Exception as e:
        # Rollback the transaction
        db.rollback()
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}. Sign up failed."
        )

@router.post("/sign-in", response_model=SignInResponse)
async def sign_in(
    sign_in_data: SignInRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Sign in a user using either email/password or a device token.
    """
    try:
        user: Optional[User] = None
        device_token = sign_in_data.device_token
        success = False

        # Try to authenticate with device token first
        if device_token:
            success, user = db_auth.authenticate_with_token(db, device_token)

        # If device token authentication failed, try email/password
        if not success and not user and sign_in_data.email and sign_in_data.password:
            # Get user by email
            user = db_auth.get_user_by_email(db, sign_in_data.email)

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

            # Verify password
            if not verify_password(sign_in_data.password, user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

            success = True

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed"
            )

        # If we authenticated with email/password, generate a new device token
        if not device_token:
            # Check if a token already exists for this device
            existing_token = db_auth.get_user_device_token(db, user.id, sign_in_data.device_id)

            if existing_token:
                # Update the existing token
                device_token = generate_device_token()
                db_auth.update_device_token(db, existing_token, device_token)
            else:
                # Create a new token
                device_token = generate_device_token()
                db_auth.create_device_token(
                    db,
                    user.id,
                    sign_in_data.device_id,
                    device_token
                )

            # Commit the transaction
            db.commit()

        # Set JWT cookie for browser-based authentication
        response.set_cookie(
            key=COOKIE_NAME,
            value=generate_jwt_token(user.id),
            max_age=COOKIE_MAX_AGE,
            path="/",
            domain=None,         # host‑only (127.0.0.1)
            secure=True,         # Must be True when SameSite=none, even for localhost
            httponly=True,
            samesite="none",     # <— allow on cross‑origin fetches
        )


        return SignInResponse(
            id=user.id,
            email=user.email,
            organization_id=user.organization_id,
            role=user.role,
            device_token=device_token
        )

    except HTTPException:
        raise
    except SQLAlchemyError as e:
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

@router.post("/logout")
async def logout(response: Response):
    """Log out the current user by clearing the auth cookie"""
    response.set_cookie(
        key=COOKIE_NAME,
        value="",
        max_age=0,
        path="/",
        domain=None,
        secure=True,  # Must be True when SameSite=none
        httponly=True,
        samesite="none",
    )
    return {"detail": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    email: str = Depends(get_current_user_email),
    db: Session = Depends(get_db)
):
    """Get the current authenticated user"""
    try:
        user = db_auth.get_user_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return UserResponse(
            id=user.id,
            email=user.email,
            organization_id=user.organization_id,
            role=user.role
        )
    except SQLAlchemyError as e:
        logger.error(f"Database error getting current user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Error getting current user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting current user: {str(e)}"
        )
