import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    CookieTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase

from procure.db.models import User, get_user_db
from procure.configs.app_configs import AUTH_SECRET, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE, AUTH_API_PREFIX

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
