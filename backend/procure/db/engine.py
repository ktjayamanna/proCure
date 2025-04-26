"""
Database engine and connection configuration module for proCure.
Supports both local Docker-based PostgreSQL and AWS RDS with IAM authentication.
"""

import boto3
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from procure.configs.app_configs import (
    DB_USE_IAM_AUTH,
    LOCAL_DATABASE_URL,
    AWS_DATABASE_URL,
    AWS_REGION
)


def get_iam_auth_token(host, port, user, region=AWS_REGION):
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


DATABASE_URL = get_db_connection_string()

connect_args = {
    "connect_timeout": 10  # Connection timeout in seconds
}

if DB_USE_IAM_AUTH:
    connect_args["sslmode"] = "require"  # Require SSL for AWS RDS connections

engine = create_engine(
    DATABASE_URL,
    pool_size=10,         # Maximum number of connections in the pool
    max_overflow=5,       # Extra connections beyond pool_size
    pool_timeout=30,      # Timeout for getting a connection from the pool
    pool_recycle=1800,    # Recycle connections after 30 minutes
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
