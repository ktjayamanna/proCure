#!/bin/bash

# Exit on any error
set -e

# Default values
USE_RDS=false
DESCRIPTION=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --use-rds)
      USE_RDS=true
      shift
      ;;
    -*|--*)
      echo "❌ Unknown option: $1" >&2
      exit 1
      ;;
    *)
      DESCRIPTION="$1"
      shift
      ;;
  esac
done

# Check if description is provided
if [ -z "$DESCRIPTION" ]; then
    echo "❌ Error: Migration description required"
    echo "Usage: ./create_migration.sh \"your migration description\" [--use-rds]"
    echo "Example: ./create_migration.sh \"add email to users\""
    exit 1
fi

# Navigate to backend directory where alembic.ini is located
cd "$(dirname "$0")/../../.."

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

# Check for required environment variables
if $USE_RDS; then
    if [ -z "$AWS_DATABASE_URL" ]; then
        echo "❌ Error: AWS_DATABASE_URL not found in .env file"
        exit 1
    fi
    DB_URL="$AWS_DATABASE_URL"
    echo "🌐 Using AWS RDS database"
else
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ Error: DATABASE_URL not found in .env file"
        exit 1
    fi
    DB_URL="$DATABASE_URL"
    echo "💻 Using local database"
fi

# Set the database URL for alembic
export DATABASE_URL="$DB_URL"

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
echo "🔗 Using database: $DB_URL"

# Add SSL mode for RDS connections if needed
if $USE_RDS; then
    # Set SSL mode for SQLAlchemy
    export SQLALCHEMY_DATABASE_URI="$DB_URL?sslmode=require"
    alembic revision --autogenerate -m "$DESCRIPTION"
else
    alembic revision --autogenerate -m "$DESCRIPTION"
fi

# Check if migration was created successfully
if [ $? -eq 0 ]; then
    echo "✅ Migration created successfully!"
    echo "📂 Check the alembic/versions directory for your new migration file"
    echo "⚠️  Remember to review the generated migration before applying it"
else
    echo "❌ Failed to create migration"
    exit 1
fi
