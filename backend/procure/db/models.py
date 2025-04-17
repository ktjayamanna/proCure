from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func
)
from sqlalchemy.orm import relationship, foreign
from datetime import timezone
from .engine import Base

# Core Entity: Organization
class Organization(Base):
    __tablename__ = "organizations"

    organization_id = Column(String(36), primary_key=True)
    name            = Column(String(255), nullable=False)
    admins_remaining = Column(Integer, nullable=False, default=1)
    members_remaining = Column(Integer, nullable=False, default=1000)

    employees = relationship(
        "Employee",
        back_populates="organization",
        cascade="all, delete"
    )
    purchased_saases = relationship(
        "PurchasedSaas",
        back_populates="organization",
        cascade="all, delete-orphan"
    )


# Core Entity: Employee (formerly User)
class Employee(Base):
    __tablename__ = "employees"

    employee_id     = Column(String(36), primary_key=True)
    email           = Column(String(255), unique=True, nullable=False)
    password_hash   = Column(String(255), nullable=True)
    organization_id = Column(String(36), ForeignKey("organizations.organization_id"), nullable=True)
    role            = Column(String(50), nullable=False, default="member")
    created_at      = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship(
        "Organization",
        back_populates="employees"
    )
    activities = relationship(
        "EmployeeActivity",
        back_populates="employee",
        cascade="all, delete"
    )
    purchased_saases = relationship(
        "PurchasedSaas",
        back_populates="owner_employee",
        primaryjoin="Employee.employee_id == foreign(PurchasedSaas.owner)",
        foreign_keys="[PurchasedSaas.owner]",
        cascade="all, delete-orphan"
    )
    device_tokens = relationship(
        "EmployeeDeviceToken",
        back_populates="employee",
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
    owner           = Column(String(36), ForeignKey("employees.employee_id"), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.organization_id"), nullable=True)

    owner_employee = relationship(
        "Employee",
        back_populates="purchased_saases",
        foreign_keys=[owner]
    )
    organization = relationship(
        "Organization",
        back_populates="purchased_saases"
    )


# Core Entity: Employee Activity
class EmployeeActivity(Base):
    __tablename__ = "employee_activities"

    activity_id       = Column(Integer, primary_key=True)
    employee_id       = Column(String(36), ForeignKey("employees.employee_id"), nullable=False)
    purchased_saas_id = Column(Integer, ForeignKey("purchased_saas.contract_id"), nullable=False)
    browser           = Column(String(100), nullable=False)
    date              = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employee       = relationship("Employee", back_populates="activities")
    purchased_saas = relationship("PurchasedSaas")


# Core Entity: Employee Device Token
class EmployeeDeviceToken(Base):
    __tablename__ = "employee_device_tokens"

    token_id    = Column(Integer, primary_key=True)
    employee_id = Column(String(36), ForeignKey("employees.employee_id"), nullable=False)
    device_id   = Column(String(255), nullable=False)
    token       = Column(String(255), unique=True, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employee    = relationship("Employee", back_populates="device_tokens")
