#!/bin/bash

# Script to start the production environment without local PostgreSQL database

# Set working directory to project root if not already there
if [[ "$PWD" != *"/deployment/docker_compose" ]]; then
    cd "$(dirname "$0")/../../../" || exit 1
fi

# Set the DB_USE_IAM_AUTH flag to true in the .env file
ENV_FILE="backend/.vscode/.env"

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

# Update the DB_USE_IAM_AUTH flag in the .env file
sed -i 's/DB_USE_IAM_AUTH=.*/DB_USE_IAM_AUTH=true/' "$ENV_FILE"

echo "✅ Set DB_USE_IAM_AUTH=true in $ENV_FILE"
echo "🚀 Starting production environment without local PostgreSQL database..."

# Check if this script is being sourced or called from another script
if [[ "${BASH_SOURCE[0]}" != "${0}" ]] || [[ "$1" == "--background" ]]; then
    # Start in detached mode if called from another script or with --background flag
    cd deployment/docker_compose
    docker-compose -f docker-compose.prod.yml up -d --build
else
    # Start in foreground mode if called directly
    cd deployment/docker_compose
    docker-compose -f docker-compose.prod.yml up --build
fi
