#!/bin/bash

# Script to restart the Docker environment with the appropriate Docker Compose file

# Get the absolute path to the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"

# Set working directory to project root
cd "$PROJECT_ROOT" || exit 1

# Stop all running containers
echo "Stopping all running containers..."
docker stop $(docker ps -q) 2>/dev/null

# Remove all containers
echo "Removing all containers..."
docker rm $(docker ps -aq) 2>/dev/null

# Check the USE_RDS flag in the .env file
ENV_FILE="$PROJECT_ROOT/backend/.vscode/.env"

# Check if .env file exists
if [ -f "$ENV_FILE" ]; then
    # Check if USE_RDS is set to true
    if grep -q "USE_RDS=true" "$ENV_FILE"; then
        echo "🚀 Restarting production environment..."
        "$SCRIPT_DIR/start_prod_environment.sh"
    else
        echo "🚀 Restarting development environment..."
        "$SCRIPT_DIR/start_dev_environment.sh"
    fi
else
    echo "❌ .env file not found at $ENV_FILE"
    echo "Defaulting to development environment..."
    "$SCRIPT_DIR/start_dev_environment.sh"
fi
