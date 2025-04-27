#!/bin/bash

# Script to run database migrations
# Usage:
#   ./run_migrations.sh             # Run migrations using settings from .env
#   ./run_migrations.sh --use-rds   # Force using AWS RDS for migrations

# Default values
USE_RDS_FLAG=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --use-rds)
      USE_RDS_FLAG=true
      shift
      ;;
    -*|--*)
      echo "❌ Unknown option: $1" >&2
      exit 1
      ;;
    *)
      shift
      ;;
  esac
done

# Set working directory to backend
cd "$(dirname "$0")/../../.." || exit 1

# Load environment variables from .env if it exists
ENV_FILE=".vscode/.env"
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment variables from $ENV_FILE"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    # Use default local database URL if .env doesn't exist
    echo "No .env file found, using default local database URL"
    export DATABASE_URL="postgresql://procure_user:procure_password@localhost:5432/procure_db"
    export USE_RDS="false"
fi

# Override USE_RDS if --use-rds flag was provided
if $USE_RDS_FLAG; then
    export USE_RDS="true"
    echo "🌐 Forcing AWS RDS usage due to --use-rds flag"

    # Check if AWS_DATABASE_URL is set
    if [ -z "${AWS_DATABASE_URL:-}" ]; then
        echo "❌ AWS_DATABASE_URL is not set in .env file"
        exit 1
    fi
fi

# Display which database we're using
if [ "$USE_RDS" = "true" ]; then
    echo "🌐 Using AWS RDS database"
else
    echo "💻 Using local database"
fi

# Set Python path
export PYTHONPATH=$PYTHONPATH:$(pwd)

# If using local database, check if PostgreSQL is ready
if [ "$USE_RDS" != "true" ]; then
    echo "⏳ Checking if PostgreSQL is ready..."

    # Check if Docker is running and PostgreSQL container exists
    if docker ps | grep -q procure_postgres; then
        # Wait for PostgreSQL to be ready
        MAX_RETRIES=30
        COUNT=0
        while ! docker exec procure_postgres pg_isready -U procure_user -d procure_db 2>/dev/null; do
            echo "PostgreSQL is unavailable - sleeping"
            sleep 2
            COUNT=$((COUNT+1))
            if [ $COUNT -ge $MAX_RETRIES ]; then
                echo "❌ Timed out waiting for PostgreSQL to be ready"
                echo "Make sure the development environment is running with:"
                echo "./backend/scripts/bash/start_dev_environment.sh --background"
                exit 1
            fi
        done
        echo "✅ PostgreSQL is ready!"
    else
        echo "⚠️ PostgreSQL container not found. Starting development environment..."
        (cd "$(dirname "$0")/../../.." && ./backend/scripts/bash/docker/start_dev_environment.sh --background)

        # Wait for PostgreSQL to be ready
        echo "⏳ Waiting for PostgreSQL to start..."
        sleep 5  # Give Docker some time to start the container

        MAX_RETRIES=30
        COUNT=0
        while ! docker exec procure_postgres pg_isready -U procure_user -d procure_db 2>/dev/null; do
            echo "PostgreSQL is unavailable - sleeping"
            sleep 2
            COUNT=$((COUNT+1))
            if [ $COUNT -ge $MAX_RETRIES ]; then
                echo "❌ Timed out waiting for PostgreSQL to be ready"
                exit 1
            fi
        done
        echo "✅ PostgreSQL is ready!"
    fi
fi

# Check if migrations directory exists
if [ -z "$(ls -A alembic/versions/ 2>/dev/null)" ]; then
    echo "🔄 Generating initial migration..."

    # Add SSL mode for RDS connections if needed
    if [ "$USE_RDS" = "true" ]; then
        # Set SSL mode for SQLAlchemy
        export SQLALCHEMY_DATABASE_URI="${AWS_DATABASE_URL}?sslmode=require"
        alembic revision --autogenerate -m "initial schema"
        alembic upgrade head
    else
        alembic revision --autogenerate -m "initial schema"
        alembic upgrade head
    fi
else
    echo "🔄 Running database migrations..."

    # Add SSL mode for RDS connections if needed
    if [ "$USE_RDS" = "true" ]; then
        # Set SSL mode for SQLAlchemy
        export SQLALCHEMY_DATABASE_URI="${AWS_DATABASE_URL}?sslmode=require"
        alembic upgrade head
    else
        alembic upgrade head
    fi
fi

echo "✅ Database migrations completed successfully!"
echo "🌟 You can now access the application at http://localhost:8000"
