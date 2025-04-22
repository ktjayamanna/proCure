"""
Pydantic schemas for analytics in the proCure application.
"""

from typing import List
from pydantic import BaseModel, Field

class VendorUsageData(BaseModel):
    """Data model for vendor usage statistics."""
    vendor_name: str = Field(..., description="The name of the SaaS vendor")
    active_users: int = Field(..., description="Number of active users this month")
    total_seats: int = Field(..., description="Total number of seats purchased")

class VendorUsageResponse(BaseModel):
    """Response model for vendor usage endpoint."""
    organization_id: str = Field(..., description="The organization ID")
    company_name: str | None = Field(None, description="The company name")
    vendors: List[VendorUsageData] = Field(default_factory=list, description="List of vendor usage data")
