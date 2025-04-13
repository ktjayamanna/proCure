#!/bin/bash
# How to use it
# add your query files to backend/scripts/sql/
# ./run_query.sh                             # uses default query file
# ./run_query.sh backend/scripts/sql/my.sql # uses custom query


set -euo pipefail

# Path to .env file
ENV_FILE="backend/.vscode/.env"

# Allow passing query file as an argument
QUERY_FILE="${1:-backend/scripts/sql/add_test_data.sql}"

# Check .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Check .sql file exists
if [ ! -f "$QUERY_FILE" ]; then
    echo "❌ SQL file '$QUERY_FILE' not found!"
    exit 1
fi

# Load env vars
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Parse DATABASE_URL
regex="postgresql:\/\/([^:]+):([^@]+)@([^:]+):([0-9]+)\/(.+)"
if [[ "$DATABASE_URL" =~ $regex ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ Failed to parse DATABASE_URL from .env"
    exit 1
fi

export PGPASSWORD="$DB_PASS"

# Run query
echo "📄 Running query from: $QUERY_FILE"
echo ""
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "$QUERY_FILE"
