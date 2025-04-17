from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, delete
from datetime import datetime, timezone
from typing import Dict, Any
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
    async def ping(db: Session = Depends(get_db)) -> Dict[str, Any]:
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
                owner=test_user.employee_id
            )
            db.add(test_saas)

            # Read test using modern select
            employee_stmt = select(Employee).where(Employee.email == test_email)
            db.scalars(employee_stmt).one_or_none()

            saas_stmt = select(PurchasedSaas).where(PurchasedSaas.url == test_url)
            db.scalars(saas_stmt).one_or_none()

            # Cleanup using modern delete statements
            saas_delete_stmt = delete(PurchasedSaas).where(PurchasedSaas.url == test_url)
            db.execute(saas_delete_stmt)

            employee_delete_stmt = delete(Employee).where(Employee.email == test_email)
            db.execute(employee_delete_stmt)

            # Commit the transaction
            db.commit()

        except SQLAlchemyError as e:
            response["database"]["write"]["status"] = "failed"
            response["database"]["write"]["error"] = str(e)
            raise HTTPException(status_code=500, detail=response)

        return response