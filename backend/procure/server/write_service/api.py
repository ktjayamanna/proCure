from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timezone
import uuid

from procure.db.engine import SessionLocal
from procure.db.models import User, Url

app = FastAPI(title="Write Microservice", version="1.0.0")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
async def root():
    return {
        "service": "procure Write Service",
        "version": app.version,
        "docs_url": "/docs",
        "health_check": "/ping"
    }

@app.get("/ping")
async def ping(db: Session = Depends(get_db)):
    test_username = f"health_check_user_{uuid.uuid4().hex[:8]}"
    test_url = f"test_{uuid.uuid4().hex[:6]}"
    
    response = {
        "message": "Write service is up and running!",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "read": {"status": "success", "error": None},
            "write": {"status": "success", "error": None}
        }
    }
    
    # Test write and read
    try:
        # Write test
        test_user = User(user_name=test_username)
        db.add(test_user)
        db.flush()
        test_url_entry = Url(
            shortened_url=test_url,
            original_url="https://health.check.test",
            owner_id=test_user.user_id
        )
        db.add(test_url_entry)
        db.commit()
        
        # Read test
        db.query(User).filter(User.user_name == test_username).first()
        db.query(Url).filter(Url.shortened_url == test_url).first()
        
        # Cleanup
        db.query(Url).filter(Url.shortened_url == test_url).delete()
        db.query(User).filter(User.user_name == test_username).delete()
        db.commit()
        
    except SQLAlchemyError as e:
        db.rollback()
        response["database"]["write"]["status"] = "failed"
        response["database"]["write"]["error"] = str(e)
        raise HTTPException(status_code=500, detail=response)
        
    return response
