#!/usr/bin/env python3
"""
Test database connections for both development and production environments.
This script attempts to connect to both databases to verify configuration.
"""

import os
import sys
import time
import psycopg2
from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Try to load environment variables from different possible locations
env_files = [
    ".env",
    ".vscode/.env",
    "backend/.vscode/.env",
    "deployment/aws_rds/env_templates/development.env",
    "deployment/aws_rds/env_templates/production.env"
]

env_loaded = False
for env_file in env_files:
    if os.path.exists(env_file):
        load_dotenv(env_file)
        print(f"Loaded environment from {env_file}")
        env_loaded = True

if not env_loaded:
    print("Warning: No .env file found. Using environment variables from the system.")

# Get environment variables
db_environment = os.getenv("DB_ENVIRONMENT", "development")

# Development database connection parameters
db_host_dev = os.getenv("DB_HOST_DEV", "localhost")
db_port_dev = os.getenv("DB_PORT_DEV", "5432")
db_user_dev = os.getenv("DB_USER_DEV", "procure_user")
db_password_dev = os.getenv("DB_PASSWORD_DEV", "procure_password")
db_name_dev = os.getenv("DB_NAME_DEV", "procure_db")

# Production database connection parameters
db_host_prod = os.getenv("DB_HOST_PROD", "")
db_port_prod = os.getenv("DB_PORT_PROD", "5432")
db_user_prod = os.getenv("DB_USER_PROD", "")
db_password_prod = os.getenv("DB_PASSWORD_PROD", "")
db_name_prod = os.getenv("DB_NAME_PROD", "procure_db")
db_ssl_prod = os.getenv("DB_SSL_PROD", "require")

def test_connection(host, port, user, password, dbname, sslmode=None):
    """Test connection to a PostgreSQL database."""
    conn_string = f"host={host} port={port} user={user} password={password} dbname={dbname}"
    if sslmode:
        conn_string += f" sslmode={sslmode}"
    
    try:
        print(f"Attempting to connect to {host}:{port}/{dbname} as {user}...")
        conn = psycopg2.connect(conn_string)
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        cursor.close()
        conn.close()
        print(f"✅ Connection successful!")
        print(f"Database version: {db_version[0]}")
        return True
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False

def main():
    """Main function to test database connections."""
    print("\n=== Database Connection Test ===\n")
    
    print(f"Current environment: {db_environment}")
    
    # Test development database connection
    print("\n--- Testing Development Database Connection ---")
    dev_success = test_connection(
        db_host_dev, db_port_dev, db_user_dev, db_password_dev, db_name_dev
    )
    
    # Test production database connection if credentials are provided
    if db_host_prod and db_user_prod and db_password_prod:
        print("\n--- Testing Production Database Connection ---")
        prod_success = test_connection(
            db_host_prod, db_port_prod, db_user_prod, db_password_prod, db_name_prod, db_ssl_prod
        )
    else:
        print("\n--- Skipping Production Database Test ---")
        print("Production database credentials not fully configured.")
        prod_success = False
    
    # Summary
    print("\n=== Connection Test Summary ===")
    print(f"Development Database: {'✅ Connected' if dev_success else '❌ Failed'}")
    if db_host_prod and db_user_prod and db_password_prod:
        print(f"Production Database:  {'✅ Connected' if prod_success else '❌ Failed'}")
    else:
        print("Production Database:  ⚠️ Not Configured")
    
    return 0 if (dev_success or prod_success) else 1

if __name__ == "__main__":
    sys.exit(main())
