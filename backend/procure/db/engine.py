from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from procure.db.config import get_db_connection_string, DB_USE_IAM_AUTH

DATABASE_URL = get_db_connection_string()

connect_args = {
    "connect_timeout": 10  # Connection timeout in seconds
}

if DB_USE_IAM_AUTH:
    connect_args["sslmode"] = "require"  # Require SSL for AWS RDS connections

engine = create_engine(
    DATABASE_URL,
    pool_size=10,         # Maximum number of connections in the pool
    max_overflow=5,       # Extra connections beyond pool_size
    pool_timeout=30,      # Timeout for getting a connection from the pool
    pool_recycle=1800,    # Recycle connections after 30 minutes
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
