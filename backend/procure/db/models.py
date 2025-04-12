from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .engine import Base

# Core Entity: User
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)

    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")
    purchased_saases = relationship("PurchasedSaas", back_populates="owner_user", cascade="all, delete-orphan")


# Core Entity: Purchased SaaS
class PurchasedSaas(Base):
    __tablename__ = "purchased_saas"

    contract_id = Column(Integer, primary_key=True)
    saas_name = Column(String, nullable=False)
    url = Column(String, unique=True, nullable=False)  # Enforce uniqueness for FK reference
    created_at = Column(DateTime, default=datetime.utcnow)
    expire_at = Column(DateTime, nullable=True)
    owner = Column(Integer, ForeignKey("users.user_id"), nullable=False)

    owner_user = relationship("User", back_populates="purchased_saases")


# Core Entity: User Activity
class UserActivity(Base):
    __tablename__ = "user_activity"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    browser = Column(String, nullable=False)
    url = Column(String, ForeignKey("purchased_saas.url"), nullable=False)  # FK to purchased SaaS
    date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="activities")
