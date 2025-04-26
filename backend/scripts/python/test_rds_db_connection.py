#!/usr/bin/env python3
"""
Test script to verify database connection with both Docker and AWS RDS configurations.
"""

from sqlalchemy import text

# Import the database engine and configuration
from procure.db.engine import engine
from procure.configs.app_configs import DB_USE_IAM_AUTH, LOCAL_DATABASE_URL, AWS_DATABASE_URL

def test_connection():
    """Test the database connection."""
    print("Database Configuration:")
    print(f"- Using IAM Authentication: {DB_USE_IAM_AUTH}")
    print(f"- Local Database URL: {LOCAL_DATABASE_URL}")
    print(f"- AWS Database URL: {AWS_DATABASE_URL}")
    print(f"- Active Database: {'AWS RDS' if DB_USE_IAM_AUTH else 'Local Docker'}")
    print(f"- SSL Mode: {'require' if DB_USE_IAM_AUTH else 'prefer'}")

    # Try to connect to the database
    print("\nTesting connection...")
    try:
        # Execute a simple query
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version()"))
            version = result.scalar()

            print("\nConnection successful!")
            print(f"Database version: {version}")

            # Test a simple query
            result = connection.execute(text("SELECT current_timestamp"))
            timestamp = result.scalar()
            print(f"Current timestamp: {timestamp}")

    except Exception as e:
        print("\nConnection failed!")
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_connection()
