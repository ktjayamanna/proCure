#!/usr/bin/env bash
# File: clear_table.sh
# Usage:
#   ./clear_table.sh                # clears user_activities (default)
#   ./clear_table.sh <table>        # clears specified table
#   ./clear_table.sh --all          # clears ALL predefined tables in proper order
#   ./clear_table.sh --use-rds      # use AWS RDS instead of local database
#   ./clear_table.sh --all --use-rds # clear all tables in AWS RDS

set -euo pipefail

# Defaults
ALL=false
USE_RDS=false
TABLE_NAME="user_activities"

# Parse flags / positional
while [[ $# -gt 0 ]]; do
  case "$1" in
    -a|--all)
      ALL=true
      shift
      ;;
    --use-rds)
      USE_RDS=true
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
ENV_FILE="$PROJECT_ROOT/.vscode/.env"

# Sanity checks
[[ -f "$SQL_SCRIPT" ]]  || { echo "❌ SQL script not found at $SQL_SCRIPT"; exit 1; }
[[ -f "$ENV_FILE" ]]    || { echo "❌ .env file not found at $ENV_FILE"; exit 1; }

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
if [[ "$DB_URL" =~ ^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)$ ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "❌ Could not parse database URL" >&2
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

  # Add SSL mode for RDS connections
  if $USE_RDS; then
    psql \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -d "$DB_NAME" \
      -U "$DB_USER" \
      -v table_to_clear="$tbl" \
      -f "$SQL_SCRIPT" \
      --set=sslmode=require
  else
    psql \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -d "$DB_NAME" \
      -U "$DB_USER" \
      -v table_to_clear="$tbl" \
      -f "$SQL_SCRIPT"
  fi
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
