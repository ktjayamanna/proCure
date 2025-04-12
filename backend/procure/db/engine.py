from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
# loadenv
from dotenv import load_dotenv
load_dotenv(".vscode/.env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/procure_db")

engine = create_engine(
    DATABASE_URL,
    pool_size=10,         # Maximum number of connections in the pool
    max_overflow=5,       # Extra connections beyond pool_size
    pool_timeout=30,      # Timeout for getting a connection from the pool
    pool_recycle=1800     # Recycle connections after 30 minutes
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
