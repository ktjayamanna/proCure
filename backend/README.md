# proCure Backend

This is the backend service for the proCure application, built with FastAPI, SQLAlchemy, and PostgreSQL.

## Directory Structure

The backend follows a modular structure organized by feature and responsibility:

```
backend/
├── alembic/                  # Database migration scripts
├── procure/                  # Main application package
│   ├── auth/                 # Authentication and authorization
│   ├── configs/              # Configuration and constants
│   ├── db/                   # Database models and operations
│   ├── server/               # API server and routes
│   │   ├── health/           # Health check endpoints
│   │   ├── url_visits/       # URL visits feature
│   │   └── main.py           # FastAPI application entry point
│   └── utils/                # Utility functions
├── scripts/                  # Utility scripts
│   ├── bash/                 # Bash scripts
│   └── sql/                  # SQL scripts
└── tests/                    # Test suite
    ├── integration/          # Integration tests
    └── unit/                 # Unit tests
```

## Key Components

### Database Layer (`procure/db/`)

- **models.py**: Contains SQLAlchemy models that define the database schema
- **engine.py**: Database connection setup
- **core.py**: Core database operations
- **auth.py**: Authentication-related database operations

### API Layer (`procure/server/`)

- **main.py**: FastAPI application setup and configuration
- **Feature modules**: Each feature has its own directory with:
  - **routes.py**: API endpoints
  - **schemas.py**: Pydantic models for request/response validation
  - **models.py**: (Optional) Feature-specific SQLAlchemy models if needed

### Authentication (`procure/auth/`)

- **routes.py**: Authentication endpoints
- **schemas.py**: Pydantic models for auth requests/responses
- **users.py**: User authentication logic
- **utils.py**: Authentication utilities

### Configuration (`procure/configs/`)

- **app_configs.py**: Application configuration
- **constants.py**: Application constants

### Utilities (`procure/utils/`)

- **db_utils.py**: Database utility functions
- **logger.py**: Logging configuration

## Code Organization Conventions

The backend follows these conventions:

1. **Models vs Schemas**:
   - **models.py**: Contains SQLAlchemy database models
   - **schemas.py**: Contains Pydantic API schemas (request/response models)

2. **Database Access**:
   - Database models are defined in `procure/db/models.py`
   - Database operations are implemented in `procure/db/core.py`
   - The `get_db` function in `procure/utils/db_utils.py` provides database session dependency

3. **API Routes**:
   - Each feature module has its own router in `routes.py`
   - Routes are registered in the main FastAPI app in `server/main.py`

4. **Authentication**:
   - Authentication is handled via the `authenticate_user_by_token` dependency
   - User roles and permissions are defined in `auth/schemas.py`

## Data Flow

1. **Request Handling**:
   - Incoming requests are routed to the appropriate endpoint in a feature's `routes.py`
   - Request data is validated against Pydantic schemas
   - The endpoint calls database operations from `db/core.py`
   - The response is formatted according to the response schema

2. **Database Operations**:
   - Database sessions are provided via the `get_db` dependency
   - Operations use SQLAlchemy models to interact with the database
   - Results are converted to Pydantic models for API responses

3. **Authentication Flow**:
   - Requests with protected endpoints use the `authenticate_user_by_token` dependency
   - The token is validated and the user is identified
   - The user's permissions are checked before processing the request

## Development

### Database Migrations

Database migrations are managed with Alembic:

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

### Running the Server

```bash
# From the backend directory
uvicorn procure.server.main:app --reload
```

### Testing

```bash
# Run tests
pytest
```

## API Documentation

When the server is running, API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
