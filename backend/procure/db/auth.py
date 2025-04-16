from sqlalchemy import select, and_
from sqlalchemy.orm import Session
from typing import Optional, Tuple

from procure.db.models import Employee, EmployeeDeviceToken

# Database operations for authentication functionality

def get_employee_by_email(db: Session, email: str) -> Optional[Employee]:
    """Get an employee by email."""
    stmt = select(Employee).where(Employee.email == email)
    return db.scalars(stmt).one_or_none()

def get_employee_by_id(db: Session, user_id: int) -> Optional[Employee]:
    """Get an employee by ID."""
    stmt = select(Employee).where(Employee.user_id == user_id)
    return db.scalars(stmt).one_or_none()

def get_token_record(db: Session, token: str) -> Optional[EmployeeDeviceToken]:
    """Get a device token record by token value."""
    stmt = select(EmployeeDeviceToken).where(EmployeeDeviceToken.token == token)
    return db.scalars(stmt).one_or_none()

def get_device_token(db: Session, user_id: int, device_id: str) -> Optional[EmployeeDeviceToken]:
    """Get a device token for a user and device."""
    stmt = select(EmployeeDeviceToken).where(
        and_(
            EmployeeDeviceToken.user_id == user_id,
            EmployeeDeviceToken.device_id == device_id
        )
    )
    return db.scalars(stmt).one_or_none()

def create_employee(db: Session, email: str, password_hash: str, company_name: str) -> Employee:
    """Create a new employee."""
    new_employee = Employee(
        email=email,
        password_hash=password_hash,
        company_name=company_name
    )

    with db.begin():
        db.add(new_employee)
        db.flush()  # Flush to get the user_id

    return new_employee

def create_device_token(db: Session, user_id: int, device_id: str, token: str) -> EmployeeDeviceToken:
    """Create a new device token."""
    new_token = EmployeeDeviceToken(
        user_id=user_id,
        device_id=device_id,
        token=token
    )

    with db.begin():
        db.add(new_token)

    return new_token

def update_device_token(db: Session, token_record: EmployeeDeviceToken, new_token: str) -> EmployeeDeviceToken:
    """Update an existing device token."""
    with db.begin():
        token_record.token = new_token

    return token_record

def authenticate_with_token(db: Session, token: str) -> Tuple[bool, Optional[Employee]]:
    """Authenticate a user with a device token."""
    token_record = get_token_record(db, token)
    if not token_record:
        return False, None

    user = get_employee_by_id(db, token_record.user_id)
    if not user:
        return False, None

    return True, user

def authenticate_with_credentials(db: Session, email: str, password_hash: str) -> Tuple[bool, Optional[Employee]]:
    """Authenticate a user with email and password."""
    user = get_employee_by_email(db, email)
    if not user or user.password_hash != password_hash:
        return False, None

    return True, user