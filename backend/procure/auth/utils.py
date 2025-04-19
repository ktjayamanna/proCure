import secrets
from typing import Optional
from fastapi import Request
from fastapi_users.password import PasswordHelper
from fastapi_users.jwt import generate_jwt

from procure.configs.constants import AUTH_SECRET, AUTH_COOKIE_MAX_AGE

def get_token_from_request(request: Request) -> Optional[str]:
    """Extract the device token from the Authorization header."""
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.replace("Bearer ", "")

def generate_device_token():
    """Generate a secure random token for device authentication"""
    return secrets.token_urlsafe(32)  # 256 bits of entropy

def hash_password(password: str) -> str:
    """Hash a password for storing"""
    # Use FastAPI-Users password helper
    password_helper = PasswordHelper()
    return password_helper.hash(password)

def generate_jwt_token(user_id: str) -> str:
    """Generate a JWT token for the user"""
    # Create the JWT token
    data = {"sub": user_id, "aud": ["fastapi-users:auth"]}
    return generate_jwt(data, AUTH_SECRET, AUTH_COOKIE_MAX_AGE)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a stored password against a provided password"""
    password_helper = PasswordHelper()
    verified, _ = password_helper.verify_and_update(plain_password, hashed_password)
    return verified
