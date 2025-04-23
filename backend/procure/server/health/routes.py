"""
Health check routes for the proCure application.
"""

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, delete
from datetime import datetime, timezone
from typing import Dict, Any
import uuid

from procure.db.models import User, Contract
from procure.utils.db_utils import get_db

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
            test_user = User(
                id=str(uuid.uuid4()),
                email=test_email,
                hashed_password="$2b$12$test_password_hash",
                is_active=True,
                is_verified=False,
                is_superuser=False,
                role="member"
            )
            db.add(test_user)
            db.flush()
            test_contract = Contract(
                vendor_name="Health Check Test",
                product_url=test_url,
                owner_id=test_user.id
            )
            db.add(test_contract)

            # Read test using modern select
            user_stmt = select(User).where(User.email == test_email)
            db.scalars(user_stmt).one_or_none()

            contract_stmt = select(Contract).where(Contract.product_url == test_url)
            db.scalars(contract_stmt).one_or_none()

            # Cleanup using modern delete statements
            contract_delete_stmt = delete(Contract).where(Contract.product_url == test_url)
            db.execute(contract_delete_stmt)

            user_delete_stmt = delete(User).where(User.email == test_email)
            db.execute(user_delete_stmt)

            # Commit the transaction
            db.commit()

        except SQLAlchemyError as e:
            response["database"]["write"]["status"] = "failed"
            response["database"]["write"]["error"] = str(e)
            raise HTTPException(status_code=500, detail=response)

        return response
