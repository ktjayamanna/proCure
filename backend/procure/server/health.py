from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timezone
import uuid

from procure.db.models import Employee, PurchasedSaas
from procure.db.engine import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def register_health_routes(app):
    @app.get("/ping")
    async def ping(db: Session = Depends(get_db)):
        test_email = f"health_check_user_{uuid.uuid4().hex[:8]}@example.com"
        test_url = f"https://test-{uuid.uuid4().hex[:6]}.example.com"

        response = {
            "message": "Backend is up and running!",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": {
                "read": {"status": "success", "error": None},
                "write": {"status": "success", "error": None}
            }
        }

        # Test write and read
        try:
            # Write test
            test_user = Employee(email=test_email)
            db.add(test_user)
            db.flush()
            test_saas = PurchasedSaas(
                saas_name="Health Check Test",
                url=test_url,
                owner=test_user.user_id
            )
            db.add(test_saas)
            db.commit()

            # Read test
            db.query(Employee).filter(Employee.email == test_email).first()
            db.query(PurchasedSaas).filter(PurchasedSaas.url == test_url).first()

            # Cleanup
            db.query(PurchasedSaas).filter(PurchasedSaas.url == test_url).delete()
            db.query(Employee).filter(Employee.email == test_email).delete()
            db.commit()

        except SQLAlchemyError as e:
            db.rollback()
            response["database"]["write"]["status"] = "failed"
            response["database"]["write"]["error"] = str(e)
            raise HTTPException(status_code=500, detail=response)

        return response