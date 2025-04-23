"""
Pydantic schemas for analytics in the proCure application.
"""

from typing import List
from pydantic import BaseModel, Field

class ContractUsageData(BaseModel):
    """Data model for contract usage statistics."""
    vendor_name: str = Field(..., description="The name of the SaaS vendor")
    active_users: int = Field(..., description="Number of active users this month")
    total_seats: int = Field(..., description="Total number of seats purchased")

class ContractUsageResponse(BaseModel):
    """Response model for contract usage endpoint."""
    organization_id: str = Field(..., description="The organization ID")
    company_name: str | None = Field(None, description="The company name")
    contracts: List[ContractUsageData] = Field(default_factory=list, description="List of contract usage data")
