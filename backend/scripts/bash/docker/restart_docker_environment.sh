#!/bin/bash

# Script to restart the Docker environment with the appropriate Docker Compose file

# Set working directory to project root
cd "$(dirname "$0")/../../../" || exit 1

# Stop all running containers
echo "Stopping all running containers..."
docker stop $(docker ps -q) 2>/dev/null

# Remove all containers
echo "Removing all containers..."
docker rm $(docker ps -aq) 2>/dev/null

# Check the DB_USE_IAM_AUTH flag in the .env file
ENV_FILE="backend/.vscode/.env"

# Check if .env file exists
if [ -f "$ENV_FILE" ]; then
    # Check if DB_USE_IAM_AUTH is set to true
    if grep -q "DB_USE_IAM_AUTH=true" "$ENV_FILE"; then
        echo "🚀 Restarting production environment..."
        ./backend/scripts/bash/docker/start_prod_environment.sh
    else
        echo "🚀 Restarting development environment..."
        ./backend/scripts/bash/docker/start_dev_environment.sh
    fi
else
    echo "❌ .env file not found at $ENV_FILE"
    echo "Defaulting to development environment..."
    ./backend/scripts/bash/docker/start_dev_environment.sh
fi
