"""
Application configuration settings for the proCure application.
This file contains settings related to API endpoints, URLs, database connections,
and other application-specific configurations.
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

# Database configuration
DB_USE_IAM_AUTH = os.getenv("DB_USE_IAM_AUTH", "false").lower() == "true"
LOCAL_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://procure_user:procure_password@localhost:5432/procure_db")
AWS_DATABASE_URL = os.getenv("AWS_DATABASE_URL")
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")
