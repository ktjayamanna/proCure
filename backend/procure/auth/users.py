import uuid
import logging
from typing import Optional

from fastapi import Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    CookieTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.jwt import decode_jwt

from procure.db.models import User, get_user_db
from procure.db import auth as db_auth
from procure.auth.utils import get_token_from_request
from procure.configs.app_configs import AUTH_SECRET, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE, AUTH_API_PREFIX
from procure.utils.db_utils import get_db

# Set up logging
logger = logging.getLogger(__name__)

# User manager for handling user operations
class UserManager(BaseUserManager[User, str]):
    reset_password_token_secret = AUTH_SECRET
    verification_token_secret = AUTH_SECRET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"Verification requested for user {user.id}. Verification token: {token}")

    async def create(
        self, user_create, safe: bool = False, request: Optional[Request] = None
    ) -> User:
        """Create a user in database."""
        # Generate a UUID for the user ID
        existing_user = await self.user_db.get_by_email(user_create.email)
        if existing_user is not None:
            raise ValueError("A user with this email already exists")

        user_dict = user_create.create_update_dict() if safe else user_create.create_update_dict_superuser()
        user_dict["id"] = str(uuid.uuid4())

        created_user = await self.user_db.create(user_dict)

        await self.on_after_register(created_user, request)

        return created_user

# Get user manager
def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)

# JWT strategy for token authentication
def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=AUTH_SECRET, lifetime_seconds=AUTH_COOKIE_MAX_AGE)

# Cookie transport for HTTP-only cookies
cookie_transport = CookieTransport(
    cookie_name=AUTH_COOKIE_NAME,
    cookie_max_age=AUTH_COOKIE_MAX_AGE,
    cookie_secure=True,  # Must be True when SameSite=none
    cookie_httponly=True,
    cookie_samesite="none",
)

# Bearer transport for API access
bearer_transport = BearerTransport(tokenUrl=f"{AUTH_API_PREFIX}/jwt/login")

# Authentication backends
auth_cookie_backend = AuthenticationBackend(
    name="jwt-cookie",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

auth_bearer_backend = AuthenticationBackend(
    name="jwt-bearer",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

# FastAPI Users instance
fastapi_users = FastAPIUsers[User, str](get_user_manager, [auth_cookie_backend, auth_bearer_backend])

# Current user dependencies
current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)

# For backward compatibility with existing code
def get_current_user_email(user: User = Depends(current_active_user)) -> str:
    return user.email

# Authentication using device token or JWT cookie
async def authenticate_user_by_token(request: Request, db: Session = Depends(get_db)) -> str:
    """Get the current user's email from the device token in the request or JWT cookie."""

    # First try to get token from Authorization header
    token = get_token_from_request(request)

    # If no token in header, try to get from cookie
    if not token:
        cookies = request.cookies
        jwt_token = cookies.get(AUTH_COOKIE_NAME)

        if jwt_token:
            # Validate JWT token
            try:
                payload = decode_jwt(jwt_token, AUTH_SECRET, ["fastapi-users:auth"])

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
