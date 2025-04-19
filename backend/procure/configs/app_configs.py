"""
Application configuration settings for the proCure application.
This file contains settings related to API endpoints, URLs, and other application-specific configurations.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".vscode/.env")

# Authentication constants
AUTH_SECRET = os.getenv("JWT_SECRET", "SECRET_KEY_FOR_JWT_PLEASE_CHANGE_IN_PRODUCTION")
AUTH_COOKIE_NAME = "procure_auth"
AUTH_COOKIE_MAX_AGE = 3600 * 24 * 30  # 30 days (in seconds)

# API endpoints
API_PREFIX = "/api/v1"
AUTH_API_PREFIX = f"{API_PREFIX}/auth"
