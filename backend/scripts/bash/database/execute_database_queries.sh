#!/bin/bash
# How to use it
# add your query files to backend/scripts/sql/
# ./run_query.sh                             # uses default query file
# ./run_query.sh backend/scripts/sql/my.sql # uses custom query
# ./run_query.sh --use-rds                  # use AWS RDS instead of local database
# ./run_query.sh backend/scripts/sql/my.sql --use-rds # use custom query with AWS RDS


set -euo pipefail

# Path to .env file
ENV_FILE=".vscode/.env"

# Set working directory to project root
cd "$(dirname "$0")/../../.." || exit 1

# Default values
USE_RDS=false
QUERY_FILE="scripts/sql/add_test_data.sql"

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
      # If the path starts with 'backend/', remove it
      if [[ "$1" == backend/* ]]; then
        QUERY_FILE="${1#backend/}"
      else
        QUERY_FILE="$1"
      fi
      shift
      ;;
  esac
done

# Check .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Debug current directory
echo "Current directory: $(pwd)"
echo "Looking for SQL file: $QUERY_FILE"

# Check .sql file exists
if [ ! -f "$QUERY_FILE" ]; then
    echo "❌ SQL file '$QUERY_FILE' not found!"
    exit 1
fi

# Load env vars
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Check for required environment variables
if $USE_RDS; then
    [[ -n "${AWS_DATABASE_URL:-}" ]] || { echo "❌ AWS_DATABASE_URL missing in .env"; exit 1; }
    DB_URL="$AWS_DATABASE_URL"
    echo "🌐 Using AWS RDS database"
else
    [[ -n "${DATABASE_URL:-}" ]] || { echo "❌ DATABASE_URL missing in .env"; exit 1; }
    DB_URL="$DATABASE_URL"
    echo "💻 Using local database"
fi

# Parse DATABASE_URL
regex="postgresql:\/\/([^:]+):([^@]+)@([^:]+):([0-9]+)\/(.+)"
if [[ "$DB_URL" =~ $regex ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ Failed to parse database URL"
    exit 1
fi

export PGPASSWORD="$DB_PASS"

# Run query
echo "📄 Running query from: $QUERY_FILE"
echo ""

# Add SSL mode for RDS connections
if $USE_RDS; then
    psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "$QUERY_FILE" --set=sslmode=require
else
    psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "$QUERY_FILE"
fi
