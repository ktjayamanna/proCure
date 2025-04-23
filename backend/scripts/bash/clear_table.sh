#!/bin/bash
# Script to clear (delete all rows from) a specified table
# Usage:
#   ./backend/scripts/bash/clear_table.sh                # Clears user_activities table (default)
#   ./backend/scripts/bash/clear_table.sh <table_name>   # Clears the specified table
#
# Examples:
#   ./backend/scripts/bash/clear_table.sh user_activities    # Clears the user_activities table
#   ./backend/scripts/bash/clear_table.sh contracts          # Clears the contracts table
#   ./backend/scripts/bash/clear_table.sh organizations      # Clears the organizations table

set -euo pipefail

# Get the table name from command line argument or use default
TABLE_NAME="${1:-user_activities}"

# Determine script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Path to SQL script
SQL_SCRIPT="$SCRIPT_DIR/../sql/clear_table.sql"

# Path to .env file
ENV_FILE="$PROJECT_ROOT/backend/.vscode/.env"

# Check if SQL script exists
if [[ ! -f "$SQL_SCRIPT" ]]; then
    echo "❌ Error: SQL script not found at $SQL_SCRIPT"
    exit 1
fi

# Check .env exists
if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ Error: .env file not found at $ENV_FILE"
    exit 1
fi

# Load environment variables from .env
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Verify DATABASE_URL was loaded
if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ Error: DATABASE_URL not found in .env file"
    exit 1
fi

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

# Confirm with user before proceeding
echo "⚠️  WARNING: This will delete ALL data from the '$TABLE_NAME' table!"
read -p "Are you sure you want to continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Run the SQL script with the table parameter
echo "🗑️  Clearing table: $TABLE_NAME"
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -v table="$TABLE_NAME" -f "$SQL_SCRIPT"

echo "✅ Operation completed."
