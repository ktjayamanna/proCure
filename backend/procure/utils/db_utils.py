"""
Database utility functions for the proCure application.
"""

from sqlalchemy.orm import Session
from procure.db.engine import SessionLocal

# Database session dependency
def get_db():
    """
    FastAPI dependency that provides a database session.
    Yields a SQLAlchemy session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
