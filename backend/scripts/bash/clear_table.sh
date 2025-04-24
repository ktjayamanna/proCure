#!/usr/bin/env bash
# File: clear_table.sh
# Usage:
#   ./clear_table.sh              # clears user_activities by default
#   ./clear_table.sh <table>      # clears the specified table

set -euo pipefail

TABLE_NAME="${1:-user_activities}"

# find project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SQL_SCRIPT="$SCRIPT_DIR/../sql/clear_table.sql"
ENV_FILE="$PROJECT_ROOT/backend/.vscode/.env"

# validate
[[ -f "$SQL_SCRIPT" ]]  || { echo "❌ $SQL_SCRIPT not found";  exit 1; }
[[ -f "$ENV_FILE" ]]    || { echo "❌ $ENV_FILE not found";    exit 1; }

# load .env
export $(grep -v '^#' "$ENV_FILE" | xargs)

[[ -n "${DATABASE_URL:-}" ]] || { echo "❌ DATABASE_URL missing"; exit 1; }

# parse DATABASE_URL
if [[ "$DATABASE_URL" =~ ^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)$ ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "❌ Could not parse DATABASE_URL"; exit 1
fi

export PGPASSWORD="$DB_PASS"

echo "⚠️  WARNING: This will delete ALL data from the '$TABLE_NAME' table!"
read -p "Are you sure you want to continue? (y/n): " -n1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || { echo "Operation cancelled."; exit 0; }

echo "🗑️  Clearing table: $TABLE_NAME"
psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -d "$DB_NAME" \
  -U "$DB_USER" \
  -v table_to_clear="$TABLE_NAME" \
  -f "$SQL_SCRIPT"

echo "✅ Operation completed."
