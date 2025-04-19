from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTable, SQLAlchemyUserDatabase
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Boolean,
    func
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.asyncio import AsyncSession
from .engine import Base, SessionLocal

# Core Entity: Organization
class Organization(Base):
    __tablename__ = "organizations"

    organization_id = Column(String(36), primary_key=True)
    name            = Column(String(255), nullable=False)
    admins_remaining = Column(Integer, nullable=False, default=1)
    members_remaining = Column(Integer, nullable=False, default=1000)

    users = relationship(
        "User",
        back_populates="organization",
        cascade="all, delete"
    )
    purchased_saases = relationship(
        "PurchasedSaas",
        back_populates="organization",
        cascade="all, delete-orphan"
    )


# FastAPI-Users model
class User(SQLAlchemyBaseUserTable[str], Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Additional fields
    organization_id = Column(String(36), ForeignKey("organizations.organization_id"), nullable=True)
    role = Column(String(50), nullable=False, default="member")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    organization = relationship(
        "Organization",
        back_populates="users"
    )
    activities = relationship(
        "UserActivity",
        back_populates="user",
        cascade="all, delete"
    )
    purchased_saases = relationship(
        "PurchasedSaas",
        back_populates="owner",
        cascade="all, delete-orphan"
    )
    device_tokens = relationship(
        "UserDeviceToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )


# Core Entity: Purchased SaaS
class PurchasedSaas(Base):
    __tablename__ = "purchased_saas"
    __table_args__ = (
        UniqueConstraint("organization_id", "url", name="uq_org_url"),
    )

    contract_id     = Column(Integer, primary_key=True)
    saas_name       = Column(String(255), nullable=False)
    url             = Column(String(2083), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expire_at       = Column(DateTime(timezone=True), nullable=True)
    owner_id        = Column(String(36), ForeignKey("users.id"), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.organization_id"), nullable=True)

    owner = relationship(
        "User",
        back_populates="purchased_saases",
        foreign_keys=[owner_id]
    )
    organization = relationship(
        "Organization",
        back_populates="purchased_saases"
    )


# User Activity
class UserActivity(Base):
    __tablename__ = "user_activities"

    activity_id       = Column(Integer, primary_key=True)
    user_id           = Column(String(36), ForeignKey("users.id"), nullable=False)
    purchased_saas_id = Column(Integer, ForeignKey("purchased_saas.contract_id"), nullable=False)
    browser           = Column(String(100), nullable=False)
    date              = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user           = relationship("User", back_populates="activities")
    purchased_saas = relationship("PurchasedSaas")


# User Device Token
class UserDeviceToken(Base):
    __tablename__ = "user_device_tokens"

    token_id    = Column(Integer, primary_key=True)
    user_id     = Column(String(36), ForeignKey("users.id"), nullable=False)
    device_id   = Column(String(255), nullable=False)
    token       = Column(String(255), unique=True, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user        = relationship("User", back_populates="device_tokens")


# Dependency to get the database session
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Get SQLAlchemy user database
def get_user_db(session: AsyncSession = Depends(get_db_session)):
    yield SQLAlchemyUserDatabase(session, User)
