#!/usr/bin/env bash
# File: add_organization.sh
# Usage:
#   ./add_organization.sh                # Interactive mode with prompts
#   ./add_organization.sh --default      # Add Firebay Studios organization

set -euo pipefail

# Default values
DEFAULT_MODE=false
ORGANIZATION_ID=""
DOMAIN_NAME=""
COMPANY_NAME=""
ADMINS_REMAINING=1
MEMBERS_REMAINING=1000

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --default)
      DEFAULT_MODE=true
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

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SQL_FILE="$SCRIPT_DIR/../../sql/add_organization.sql"
ENV_FILE="$PROJECT_ROOT/backend/.vscode/.env"

# Sanity checks
[[ -f "$ENV_FILE" ]] || { echo "❌ .env file not found at $ENV_FILE"; exit 1; }

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

# Generate organization ID
generate_org_id() {
  local BASE62="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  local body=""

  # Generate 32 random characters from BASE62
  for ((i=0; i<32; i++)); do
    local idx=$((RANDOM % 62))
    body="${body}${BASE62:$idx:1}"
  done

  echo "org_${body}"
}

# Default mode - add Firebay Studios
if $DEFAULT_MODE; then
  echo "🏢 Adding Firebay Studios organization..."
  ORGANIZATION_ID=$(generate_org_id)
  DOMAIN_NAME="firebaystudios.com"
  COMPANY_NAME="Firebay Studios"
  ADMINS_REMAINING=200
  MEMBERS_REMAINING=999
else
  # Interactive mode - prompt for values
  echo "🏢 Adding a new organization to the database"
  echo "-------------------------------------------"

  # Generate organization ID
  ORGANIZATION_ID=$(generate_org_id)
  echo "Organization ID: $ORGANIZATION_ID"

  # Prompt for domain name
  read -p "Enter domain name (e.g., example.com): " DOMAIN_NAME
  while [[ -z "$DOMAIN_NAME" ]]; do
    echo "❌ Domain name cannot be empty"
    read -p "Enter domain name (e.g., example.com): " DOMAIN_NAME
  done

  # Prompt for company name
  read -p "Enter company name (e.g., Example Corporation): " COMPANY_NAME

  # Prompt for admins remaining
  read -p "Enter number of admin slots (default: 1): " ADMINS_INPUT
  ADMINS_REMAINING=${ADMINS_INPUT:-1}

  # Prompt for members remaining
  read -p "Enter number of member slots (default: 1000): " MEMBERS_INPUT
  MEMBERS_REMAINING=${MEMBERS_INPUT:-1000}
fi

# Create SQL file for adding organization
cat > "$SQL_FILE" << EOF
-- Add organization
INSERT INTO organizations (organization_id, domain_name, company_name, admins_remaining, members_remaining) VALUES
('$ORGANIZATION_ID', '$DOMAIN_NAME', '$COMPANY_NAME', $ADMINS_REMAINING, $MEMBERS_REMAINING)
ON CONFLICT (organization_id) DO UPDATE SET
  domain_name = EXCLUDED.domain_name,
  company_name = EXCLUDED.company_name,
  admins_remaining = EXCLUDED.admins_remaining,
  members_remaining = EXCLUDED.members_remaining;

-- Verify the data
SELECT
    o.organization_id,
    o.domain_name,
    o.company_name,
    o.admins_remaining,
    o.members_remaining
FROM organizations o
WHERE o.organization_id = '$ORGANIZATION_ID';
EOF

# Execute SQL file
echo "📄 Executing SQL to add organization..."
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "$SQL_FILE"

echo "✅ Organization created successfully!"
echo "Organization ID: $ORGANIZATION_ID"
echo "Domain: $DOMAIN_NAME"
