# Docker Compose Configuration

This directory contains Docker Compose configurations for different environments:

## Development Environment (`docker-compose.dev.yml`)

The development environment includes:
- A local PostgreSQL database
- The core service configured to use the local database

To start the development environment:

```bash
# From the project root
./backend/scripts/bash/docker/start_dev_environment.sh
```

This script will:
1. Set `USE_RDS=false` in the `.vscode/.env` file
2. Start the Docker Compose services defined in `docker-compose.dev.yml`

## Production Environment (`docker-compose.prod.yml`)

The production environment includes:
- Only the core service (no local PostgreSQL)
- The core service configured to use AWS RDS with master password authentication

To start the production environment:

```bash
# From the project root
./backend/scripts/bash/docker/start_prod_environment.sh
```

This script will:
1. Set `USE_RDS=true` in the `.vscode/.env` file
2. Check if `AWS_DATABASE_URL` is set in the `.vscode/.env` file
3. Start the Docker Compose services defined in `docker-compose.prod.yml`

## Environment Configuration

The Docker Compose files use environment variables from the `.vscode/.env` file:

- `USE_RDS`: Set to `true` to use AWS RDS, `false` to use local PostgreSQL
- `DATABASE_URL`: URL for the local PostgreSQL database
- `AWS_DATABASE_URL`: URL for the AWS RDS database (including master password)
- `AWS_REGION`: AWS region for the RDS instance

## Switching Between Environments

You can switch between environments by changing the `USE_RDS` flag in the `.vscode/.env` file:

```
# For development (local PostgreSQL)
USE_RDS=false

# For production (AWS RDS)
USE_RDS=true
```

After changing the flag, restart the Docker environment:

```bash
# From the project root
./backend/scripts/bash/docker/restart_docker_environment.sh
```

## Running Database Migrations

To run database migrations independently of starting the Docker environment:

```bash
# From the project root
./backend/scripts/bash/database/run_migrations.sh
```

This script will:
1. Load environment variables from the `.vscode/.env` file
2. Run Alembic migrations to update the database schema

## Setting Up the Project Environment

To set up the complete project environment for development, you can use these two scripts in sequence:

```bash
# Start the development environment
./backend/scripts/bash/docker/start_dev_environment.sh --background

# Run migrations (this will also check if PostgreSQL is ready)
./backend/scripts/bash/database/run_migrations.sh
```

Or even more simply, just run the migrations script which will automatically start the development environment if needed:

```bash
./backend/scripts/bash/database/run_migrations.sh
```

The `run_migrations.sh` script will:
1. Check if PostgreSQL is running and start it if needed
2. Wait for PostgreSQL to be ready
3. Run database migrations
