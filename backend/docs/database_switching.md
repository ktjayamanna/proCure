# Database Configuration Guide

This guide explains how to configure and switch between different database environments in the proCure application.

## Database Environments

The application supports two database environments:

1. **Local Development** - Uses a PostgreSQL database running in Docker
2. **Production** - Uses AWS RDS with IAM authentication

## Configuration Variables

The database configuration is controlled by the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USE_IAM_AUTH` | Whether to use IAM authentication for AWS RDS | `false` |
| `DATABASE_URL` | URL for the local PostgreSQL database | `postgresql://procure_user:procure_password@localhost:5432/procure_db` |
| `AWS_DATABASE_URL` | URL for the AWS RDS database | None |
| `AWS_REGION` | AWS region for IAM authentication | `us-east-2` |

## Switching Between Environments

To switch between database environments, you only need to change the `DB_USE_IAM_AUTH` environment variable:

### For Local Development (Docker)

1. Set `DB_USE_IAM_AUTH=false` in your `.vscode/.env` file
2. Make sure Docker is running with: `docker-compose up -d`

### For Production (AWS RDS)

1. Set `DB_USE_IAM_AUTH=true` in your `.vscode/.env` file
2. Ensure `AWS_DATABASE_URL` and `AWS_REGION` are correctly set

## Verifying Your Configuration

You can verify your database configuration using the provided script:

```bash
# Run from the backend directory
python scripts/python/verify_db_switching.py
```

This script will:
1. Print your current database configuration
2. Test the connection to the database
3. Run a simple query to verify the connection

To see instructions for switching between databases:

```bash
python scripts/python/verify_db_switching.py --instructions
```

## How It Works

The application determines which database to use based on the `DB_USE_IAM_AUTH` flag:

- When `DB_USE_IAM_AUTH` is `false`, it uses the `DATABASE_URL` for a local PostgreSQL database
- When `DB_USE_IAM_AUTH` is `true`, it uses the `AWS_DATABASE_URL` and generates an IAM token for authentication

The database connection logic is implemented in `procure/db/engine.py` in the `get_db_connection_string()` function.

## Troubleshooting

### Connection Issues with Local Database

1. Make sure Docker is running: `docker ps | grep procure_postgres`
2. Check if the PostgreSQL container is healthy: `docker exec procure_postgres pg_isready`
3. Verify your `DATABASE_URL` matches the Docker configuration

### Connection Issues with AWS RDS

1. Verify your `AWS_DATABASE_URL` is correct
2. Check that your AWS credentials are properly configured
3. Ensure your IAM user has permission to connect to the RDS instance
4. Verify the RDS instance is in the correct security group and allows connections from your IP

## Database Migrations

When switching between databases, you may need to run migrations to ensure the schema is up to date:

```bash
# Run from the backend directory
alembic upgrade head
```
