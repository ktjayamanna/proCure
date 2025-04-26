#!/usr/bin/env bash
# File: clear_table.sh
# Usage:
#   ./clear_table.sh                # clears user_activities (default)
#   ./clear_table.sh <table>        # clears specified table
#   ./clear_table.sh --all          # clears ALL predefined tables in proper order

set -euo pipefail

# Defaults
ALL=false
TABLE_NAME="user_activities"

# Parse flags / positional
while [[ $# -gt 0 ]]; do
  case "$1" in
    -a|--all)
      ALL=true
      shift
      ;;
    -*|--*)
      echo "❌ Unknown option: $1" >&2
      exit 1
      ;;
    *)
      TABLE_NAME="$1"
      shift
      ;;
  esac
done

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SQL_SCRIPT="$SCRIPT_DIR/../../sql/clear_table.sql"
ENV_FILE="$PROJECT_ROOT/backend/.vscode/.env"

# Sanity checks
[[ -f "$SQL_SCRIPT" ]]  || { echo "❌ SQL script not found at $SQL_SCRIPT"; exit 1; }
[[ -f "$ENV_FILE" ]]    || { echo "❌ .env file not found at $ENV_FILE"; exit 1; }

# Load env vars
export $(grep -v '^#' "$ENV_FILE" | xargs)
[[ -n "${DATABASE_URL:-}" ]] || { echo "❌ DATABASE_URL missing in .env"; exit 1; }

# Parse DATABASE_URL
if [[ "$DATABASE_URL" =~ ^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)$ ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "❌ Could not parse DATABASE_URL" >&2
  exit 1
fi
export PGPASSWORD="$DB_PASS"

# Confirmation prompt
if $ALL; then
  echo "⚠️  WARNING: This will delete ALL data from your predefined tables in the correct order!"
else
  echo "⚠️  WARNING: This will delete ALL data from '$TABLE_NAME' table!"
fi
read -p "Are you sure? (y/n): " -n1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || { echo "Operation cancelled."; exit 0; }

# Helper function
clear_table() {
  local tbl="$1"
  echo "🗑️  Clearing table: $tbl"
  psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -d "$DB_NAME" \
    -U "$DB_USER" \
    -v table_to_clear="$tbl" \
    -f "$SQL_SCRIPT"
}

# Execute
if $ALL; then
  # Hard-coded list of tables in dependency order (children first)
  tables=(
    user_device_tokens
    user_activities
    contracts
    users
    organizations
  )

  for tbl in "${tables[@]}"; do
    clear_table "$tbl"
  done
else
  clear_table "$TABLE_NAME"
fi

echo "✅ Operation completed."
