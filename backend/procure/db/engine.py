"""
Database engine and connection configuration module for proCure.
Supports both local Docker-based PostgreSQL and AWS RDS with master password authentication.
"""

import boto3
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from procure.configs.app_configs import (
    USE_RDS,
    LOCAL_DATABASE_URL,
    AWS_DATABASE_URL,
    AWS_REGION
)

def get_db_connection_string():
    """
    Get the appropriate database connection string based on configuration.

    For local development with Docker, uses the LOCAL_DATABASE_URL as is.
    For AWS RDS, uses AWS_DATABASE_URL with the master password included in the URL.

    Returns:
        str: The database connection string
    """
    # Use local database URL for development
    if not USE_RDS:
        return LOCAL_DATABASE_URL

    # Use AWS database URL for production
    # Check if AWS_DATABASE_URL is properly set
    if not AWS_DATABASE_URL:
        raise ValueError("AWS_DATABASE_URL is not set. Please set it in your .env file.")

    # Parse the AWS_DATABASE_URL to extract components
    parsed_url = urlparse(AWS_DATABASE_URL)

    # Extract components to validate URL
    user = parsed_url.username
    password = parsed_url.password
    host = parsed_url.hostname
    db_name = parsed_url.path.lstrip('/')

    # Check if required components are present
    if not user or not host or not db_name or not password:
        raise ValueError(f"Invalid AWS_DATABASE_URL: {AWS_DATABASE_URL}. Missing required components (username, password, host, or database name).")

    # Use AWS_DATABASE_URL directly as it already contains the master password
    return AWS_DATABASE_URL


DATABASE_URL = get_db_connection_string()

connect_args = {
    "connect_timeout": 10  # Connection timeout in seconds
}

if USE_RDS:
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
