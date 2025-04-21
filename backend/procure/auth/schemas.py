import re
from typing import Optional
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, field_validator

# User role enum
class UserRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"

# Pydantic models for request/response
class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    device_id: str
    role: UserRole = UserRole.MEMBER  # Default role

    @field_validator('password')
    @classmethod
    def password_strength(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        return v

class CreateUserResponse(BaseModel):
    id: str
    email: str
    organization_id: str
    role: str
    device_token: str

class SignInRequest(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    device_token: Optional[str] = None
    device_id: str

class SignInResponse(BaseModel):
    id: str
    email: str
    organization_id: Optional[str]
    role: str
    device_token: str

class UserResponse(BaseModel):
    id: str
    email: str
    organization_id: Optional[str]
    role: str
