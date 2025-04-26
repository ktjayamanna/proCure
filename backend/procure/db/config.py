"""
Database configuration module for proCure.
Supports both local Docker-based PostgreSQL and AWS RDS with IAM authentication.
"""

import os
import boto3
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".vscode/.env")

# Database configuration constants
DB_USE_IAM_AUTH = os.getenv("DB_USE_IAM_AUTH", "false").lower() == "true"
LOCAL_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://procure_user:procure_password@localhost:5432/procure_db")
AWS_DATABASE_URL = os.getenv("AWS_DATABASE_URL")
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")


def get_iam_auth_token(host, port, user, region="us-east-2"):
    """
    Generate an IAM authentication token for AWS RDS.

    Args:
        host (str): The RDS instance hostname
        port (int): The RDS instance port
        user (str): The database username
        region (str): The AWS region where the RDS instance is located

    Returns:
        str: The IAM authentication token
    """
    client = boto3.client("rds", region_name=region)
    token = client.generate_db_auth_token(
        DBHostname=host,
        Port=int(port),
        DBUsername=user
    )
    return token


def get_db_connection_string():
    """
    Get the appropriate database connection string based on configuration.

    For local development with Docker, uses the LOCAL_DATABASE_URL as is.
    For AWS RDS with IAM authentication, uses AWS_DATABASE_URL and generates an IAM token for authentication.

    Returns:
        str: The database connection string
    """
    # Use local database URL for development
    if not DB_USE_IAM_AUTH:
        return LOCAL_DATABASE_URL

    # Use AWS database URL with IAM authentication for production
    # Parse the AWS_DATABASE_URL to extract components
    parsed_url = urlparse(AWS_DATABASE_URL)

    # Extract components
    user = parsed_url.username
    host = parsed_url.hostname
    port = parsed_url.port
    db_name = parsed_url.path.lstrip('/')

    # Generate IAM token
    token = get_iam_auth_token(host, port, user, region=AWS_REGION)

    # Construct new connection string with IAM token as password
    connection_string = f"postgresql://{user}:{token}@{host}:{port}/{db_name}"

    return connection_string
