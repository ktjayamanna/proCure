"""
Authentication module for the proCure application.
Provides user authentication, registration, and token management.
"""

from procure.server.auth.routes import router

def register_auth_routes(app):
    """Register authentication routes with the main FastAPI app"""
    app.include_router(router)
