"""
Authentication module for the proCure application.
Provides user authentication, registration, and token management.
"""

from procure.server.auth.dependencies import get_current_user_email
from procure.server.auth.routes import router
from procure.server.auth.utils import (
    SECRET, COOKIE_NAME, COOKIE_MAX_AGE,
    generate_device_token, hash_password, verify_password, generate_jwt_token
)

def register_auth_routes(app):
    """Register authentication routes with the main FastAPI app"""
    app.include_router(router)

# Export all necessary components for backward compatibility
__all__ = [
    'get_current_user_email',
    'register_auth_routes',
    'SECRET',
    'COOKIE_NAME',
    'COOKIE_MAX_AGE',
    'generate_device_token',
    'hash_password',
    'verify_password',
    'generate_jwt_token',
]
