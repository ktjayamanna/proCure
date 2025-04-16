from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .engine import Base

# Core Entity: Employee (formerly User)
class Employee(Base):
    __tablename__ = "employees"

    user_id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    activities = relationship("EmployeeActivity", back_populates="employee", cascade="all, delete-orphan")
    purchased_saases = relationship("PurchasedSaas", back_populates="owner_employee", cascade="all, delete-orphan")
    device_tokens = relationship("EmployeeDeviceToken", back_populates="employee", cascade="all, delete-orphan")


# Core Entity: Purchased SaaS
class PurchasedSaas(Base):
    __tablename__ = "purchased_saas"

    contract_id = Column(Integer, primary_key=True)
    saas_name = Column(String, nullable=False)
    url = Column(String, unique=True, nullable=False)  # Enforce uniqueness for FK reference
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expire_at = Column(DateTime, nullable=True)
    owner = Column(Integer, ForeignKey("employees.user_id"), nullable=False)

    owner_employee = relationship("Employee", back_populates="purchased_saases")


# Core Entity: Employee Activity
class EmployeeActivity(Base):
    __tablename__ = "employee_activity"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("employees.user_id"), nullable=False)
    browser = Column(String, nullable=False)
    url = Column(String, ForeignKey("purchased_saas.url"), nullable=False)  # FK to purchased SaaS
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", back_populates="activities")


# Core Entity: Employee Device Token
class EmployeeDeviceToken(Base):
    __tablename__ = "employee_device_tokens"

    token_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("employees.user_id"), nullable=False)
    device_id = Column(String, nullable=False)
    token = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    employee = relationship("Employee", back_populates="device_tokens")
