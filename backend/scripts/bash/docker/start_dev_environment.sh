#!/bin/bash

# Script to start the development environment with local PostgreSQL database

# Set working directory to project root if not already there
if [[ "$PWD" != *"/deployment/docker_compose" ]]; then
    cd "$(dirname "$0")/../../../" || exit 1
fi

# Set the DB_USE_IAM_AUTH flag to false in the .env file
ENV_FILE="backend/.vscode/.env"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found at $ENV_FILE"
    exit 1
fi

# Update the DB_USE_IAM_AUTH flag in the .env file
sed -i 's/DB_USE_IAM_AUTH=.*/DB_USE_IAM_AUTH=false/' "$ENV_FILE"

echo "✅ Set DB_USE_IAM_AUTH=false in $ENV_FILE"
echo "🚀 Starting development environment with local PostgreSQL database..."

# Check if this script is being sourced or called from another script
if [[ "${BASH_SOURCE[0]}" != "${0}" ]] || [[ "$1" == "--background" ]]; then
    # Start in detached mode if called from another script or with --background flag
    cd deployment/docker_compose
    docker-compose -f docker-compose.dev.yml up -d --build
else
    # Start in foreground mode if called directly
    cd deployment/docker_compose
    docker-compose -f docker-compose.dev.yml up --build
fi
