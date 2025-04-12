#!/bin/bash

# Start Docker services first
echo "Starting Docker services..."
cd deployment/docker_compose
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker exec procure_postgres pg_isready -U procure_user -d procure_db; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done

echo "PostgreSQL is ready!"

# Now handle migrations
cd ../../backend
if [ -z "$(ls -A alembic/versions/)" ]; then
    echo "Generating initial migration..."
    export PYTHONPATH=$PYTHONPATH:$(pwd)
    # Use the correct DATABASE_URL that points to the Docker container
    export DATABASE_URL="postgresql://procure_user:procure_password@localhost:5432/procure_db"
    alembic revision --autogenerate -m "initial schema"
    alembic upgrade head
else
    echo "Migrations already exist, running upgrade..."
    export DATABASE_URL="postgresql://procure_user:procure_password@localhost:5432/procure_db"
    alembic upgrade head
fi

# Return to docker-compose directory and ensure services are running
cd ../deployment/docker_compose
docker-compose up
