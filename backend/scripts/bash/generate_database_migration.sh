#!/bin/bash

# Exit on any error
set -e

# Check if description is provided
if [ -z "$1" ]; then
    echo "❌ Error: Migration description required"
    echo "Usage: ./create_migration.sh \"your migration description\""
    echo "Example: ./create_migration.sh \"add email to users\""
    exit 1
fi

# Store the description
DESCRIPTION="$1"

# Navigate to backend directory where alembic.ini is located
cd "$(dirname "$0")/../../"

# Ensure we're in the correct directory
if [ ! -f "alembic.ini" ]; then
    echo "❌ Error: alembic.ini not found! Make sure you're running this from the project root."
    exit 1
fi

# Check for .env file
ENV_FILE=".vscode/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found at $ENV_FILE"
    exit 1
fi

# Load environment variables from .env
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Verify DATABASE_URL was loaded
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env file"
    exit 1
fi

# Set Python path
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Check if database is up to date
echo "🔍 Checking database status..."
if ! alembic current 2>/dev/null | grep -q "(head)"; then
    echo "⚠️  Database is not up to date. Applying pending migrations..."
    alembic upgrade head
fi

# Create the migration
echo "📝 Creating migration: $DESCRIPTION"
echo "🔗 Using database: $DATABASE_URL"
alembic revision --autogenerate -m "$DESCRIPTION"

# Check if migration was created successfully
if [ $? -eq 0 ]; then
    echo "✅ Migration created successfully!"
    echo "📂 Check the alembic/versions directory for your new migration file"
    echo "⚠️  Remember to review the generated migration before applying it"
else
    echo "❌ Failed to create migration"
    exit 1
fi
