import uuid
import secrets
from sqlalchemy import select, and_
from sqlalchemy.orm import Session
from typing import Optional, Tuple

from procure.db.models import Organization, User, UserDeviceToken
from procure.configs.constants import BASE62
from procure.auth.schemas import UserRole

def generate_org_id():
    """Generate a unique organization ID with 'org_' prefix and 32 random characters."""
    body = ''.join(secrets.choice(BASE62) for _ in range(32))  # 32-char
    return f"org_{body}"

# Database operations for authentication functionality

def get_user_token_record(db: Session, token: str) -> Optional[UserDeviceToken]:
    """Get a user device token record by token value."""
    stmt = select(UserDeviceToken).where(UserDeviceToken.token == token)
    return db.scalars(stmt).one_or_none()

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """Get a user by ID."""
    stmt = select(User).where(User.id == user_id)
    return db.scalars(stmt).one_or_none()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get a user by email."""
    stmt = select(User).where(User.email == email)
    return db.scalars(stmt).one_or_none()

def get_user_device_token(db: Session, user_id: str, device_id: str) -> Optional[UserDeviceToken]:
    """Get a device token for a user and device."""
    stmt = select(UserDeviceToken).where(
        and_(
            UserDeviceToken.user_id == user_id,
            UserDeviceToken.device_id == device_id
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

def create_user(db: Session, email: str, password_hash: str, organization_id: str, role: str = UserRole.MEMBER) -> User:
    """Create a new user."""
    # Check if organization exists
    organization = get_organization_by_id(db, organization_id)
    if not organization:
        raise ValueError(f"Organization with ID {organization_id} not found")

    user_id = str(uuid.uuid4())
    new_user = User(
        id=user_id,
        email=email,
        hashed_password=password_hash,
        is_active=True,
        is_verified=False,
        is_superuser=role == UserRole.ADMIN,
        organization_id=organization_id,
        role=role
    )

    db.add(new_user)
    db.flush()

    return new_user

def create_device_token(db: Session, user_id: str, device_id: str, token: str) -> UserDeviceToken:
    """Create a new device token."""
    new_token = UserDeviceToken(
        user_id=user_id,
        device_id=device_id,
        token=token
    )

    db.add(new_token)

    return new_token

def update_device_token(db: Session, token_record: UserDeviceToken, new_token: str) -> UserDeviceToken:
    """Update an existing device token."""
    token_record.token = new_token
    return token_record

def authenticate_with_token(db: Session, token: str) -> Tuple[bool, Optional[User]]:
    """Authenticate a user with a device token."""
    token_record = get_user_token_record(db, token)
    if not token_record:
        return False, None

    user = get_user_by_id(db, token_record.user_id)
    if not user:
        return False, None

    return True, user