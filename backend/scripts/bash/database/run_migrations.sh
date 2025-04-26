#!/bin/bash

# Script to run database migrations

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
    export DB_USE_IAM_AUTH="false"
fi

# Set Python path
export PYTHONPATH=$PYTHONPATH:$(pwd)

# If using local database, check if PostgreSQL is ready
if [ "$DB_USE_IAM_AUTH" != "true" ]; then
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
    alembic revision --autogenerate -m "initial schema"
    alembic upgrade head
else
    echo "🔄 Running database migrations..."
    alembic upgrade head
fi

echo "✅ Database migrations completed successfully!"
echo "🌟 You can now access the application at http://localhost:8000"
