# Bash Scripts Organization

This directory contains bash scripts organized into subdirectories by function:

## Directory Structure

- `docker/`: Scripts for managing Docker environments
- `database/`: Scripts for database operations and migrations
- `utils/`: Utility scripts for various tasks

## Docker Scripts

- `docker/start_dev_environment.sh`: Starts the development environment with local PostgreSQL
- `docker/start_prod_environment.sh`: Starts the production environment with AWS RDS
- `docker/restart_docker_environment.sh`: Restarts the Docker environment
- `docker/reset_docker_environment.sh`: Resets the Docker environment (removes all containers, images, volumes)

## Database Scripts

- `database/run_migrations.sh`: Runs database migrations
- `database/add_organization.sh`: Adds an organization to the database
- `database/clear_table.sh`: Clears a table in the database
- `database/execute_database_queries.sh`: Executes SQL queries
- `database/generate_database_migration.sh`: Generates a new database migration

## Usage

To start the development environment:

```bash
./backend/scripts/bash/docker/start_dev_environment.sh
```

To run database migrations:

```bash
./backend/scripts/bash/database/run_migrations.sh
```

## Add Organization Script

The `database/add_organization.sh` script allows you to add a new organization to the proCure database.

### Interactive Mode
```bash
./backend/scripts/bash/database/add_organization.sh
```
This will prompt you for:
- Domain name (required)
- Company name (optional)
- Number of admin slots (default: 1)
- Number of member slots (default: 1000)

### Default Mode
```bash
./backend/scripts/bash/database/add_organization.sh --default
```
This will add Firebay Studios with:
- Domain: firebaystudios.com
- Company name: Firebay Studios
- Admin slots: 200
- Member slots: 999
