import uuid
import string
import secrets
from sqlalchemy import select, and_
from sqlalchemy.orm import Session
from typing import Optional, Tuple

from procure.db.models import Employee, EmployeeDeviceToken, Organization

# Base62 charset (URL-safe, no special chars)
BASE62 = string.ascii_letters + string.digits  # A-Z a-z 0-9

def generate_org_id():
    """Generate a unique organization ID with 'org_' prefix and 32 random characters."""
    body = ''.join(secrets.choice(BASE62) for _ in range(32))  # 32-char
    return f"org_{body}"

# Database operations for authentication functionality

def get_employee_by_email(db: Session, email: str) -> Optional[Employee]:
    """Get an employee by email."""
    stmt = select(Employee).where(Employee.email == email)
    return db.scalars(stmt).one_or_none()

def get_employee_by_id(db: Session, employee_id: str) -> Optional[Employee]:
    """Get an employee by ID."""
    stmt = select(Employee).where(Employee.employee_id == employee_id)
    return db.scalars(stmt).one_or_none()

def get_token_record(db: Session, token: str) -> Optional[EmployeeDeviceToken]:
    """Get a device token record by token value."""
    stmt = select(EmployeeDeviceToken).where(EmployeeDeviceToken.token == token)
    return db.scalars(stmt).one_or_none()

def get_device_token(db: Session, employee_id: str, device_id: str) -> Optional[EmployeeDeviceToken]:
    """Get a device token for a user and device."""
    stmt = select(EmployeeDeviceToken).where(
        and_(
            EmployeeDeviceToken.employee_id == employee_id,
            EmployeeDeviceToken.device_id == device_id
        )
    )
    return db.scalars(stmt).one_or_none()

def get_organization_by_id(db: Session, organization_id: str) -> Optional[Organization]:
    """Get an organization by ID."""
    stmt = select(Organization).where(Organization.organization_id == organization_id)
    return db.scalars(stmt).one_or_none()

def get_organization_by_name(db: Session, name: str) -> Optional[Organization]:
    """Get an organization by name (domain)."""
    stmt = select(Organization).where(Organization.name == name)
    return db.scalars(stmt).one_or_none()

def create_organization(db: Session, name: str, organization_id: Optional[str] = None, admins_remaining: int = 1, members_remaining: int = 1000) -> Organization:
    """Create a new organization."""
    if not organization_id:
        organization_id = generate_org_id()

    new_organization = Organization(
        organization_id=organization_id,
        name=name,
        admins_remaining=admins_remaining,
        members_remaining=members_remaining
    )

    db.add(new_organization)
    db.flush()

    return new_organization

def create_employee(db: Session, email: str, password_hash: str, organization_id: str, role: str = "member") -> Employee:
    """Create a new employee."""
    # Check if organization exists
    organization = get_organization_by_id(db, organization_id)
    if not organization:
        raise ValueError(f"Organization with ID {organization_id} not found")

    employee_id = str(uuid.uuid4())
    new_employee = Employee(
        employee_id=employee_id,
        email=email,
        password_hash=password_hash,
        organization_id=organization_id,
        role=role
    )

    db.add(new_employee)
    db.flush()

    return new_employee

def create_device_token(db: Session, employee_id: str, device_id: str, token: str) -> EmployeeDeviceToken:
    """Create a new device token."""
    new_token = EmployeeDeviceToken(
        employee_id=employee_id,
        device_id=device_id,
        token=token
    )

    db.add(new_token)

    return new_token

def update_device_token(db: Session, token_record: EmployeeDeviceToken, new_token: str) -> EmployeeDeviceToken:
    """Update an existing device token."""
    token_record.token = new_token
    return token_record

def authenticate_with_token(db: Session, token: str) -> Tuple[bool, Optional[Employee]]:
    """Authenticate a user with a device token."""
    token_record = get_token_record(db, token)
    if not token_record:
        return False, None

    user = get_employee_by_id(db, token_record.employee_id)
    if not user:
        return False, None

    return True, user

def authenticate_with_credentials(db: Session, email: str, password_hash: str) -> Tuple[bool, Optional[Employee]]:
    """Authenticate a user with email and password."""
    user = get_employee_by_email(db, email)
    if not user or user.password_hash != password_hash:
        return False, None

    return True, user