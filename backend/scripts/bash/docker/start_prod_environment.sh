#!/bin/bash

# Script to start the production environment without local PostgreSQL database

# Get the absolute path to the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"

# Set working directory to project root
cd "$PROJECT_ROOT" || exit 1

# Set the USE_RDS flag to true in the .env file
ENV_FILE="$PROJECT_ROOT/backend/.vscode/.env"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found at $ENV_FILE"
    exit 1
fi

# Check if AWS_DATABASE_URL is set in the .env file
if ! grep -q "AWS_DATABASE_URL=" "$ENV_FILE" || [ -z "$(grep "AWS_DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2)" ]; then
    echo "❌ AWS_DATABASE_URL is not set in $ENV_FILE"
    echo "Please set AWS_DATABASE_URL in $ENV_FILE before starting the production environment"
    exit 1
fi

# Update the USE_RDS flag in the .env file
sed -i 's/USE_RDS=.*/USE_RDS=true/' "$ENV_FILE"

echo "✅ Set USE_RDS=true in $ENV_FILE"
echo "🚀 Starting production environment without local PostgreSQL database..."

# Export environment variables from .env file
echo "📋 Exporting environment variables from $ENV_FILE"
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Check if AWS_DATABASE_URL is exported correctly
if [ -z "$AWS_DATABASE_URL" ]; then
    echo "❌ Failed to export AWS_DATABASE_URL from $ENV_FILE"
    exit 1
fi

echo "✅ Environment variables exported successfully"

# Check if this script is being sourced or called from another script
if [[ "${BASH_SOURCE[0]}" != "${0}" ]] || [[ "$1" == "--background" ]]; then
    # Start in detached mode if called from another script or with --background flag
    cd "$PROJECT_ROOT/deployment/docker_compose"
    docker-compose -f docker-compose.prod.yml up -d --build
else
    # Start in foreground mode if called directly
    cd "$PROJECT_ROOT/deployment/docker_compose"
    docker-compose -f docker-compose.prod.yml up --build
fi
