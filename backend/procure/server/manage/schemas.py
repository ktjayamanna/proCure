"""
Pydantic schemas for organization management in the proCure application.
"""

from pydantic import BaseModel, Field

class OrganizationNameResponse(BaseModel):
    """Response model for organization name endpoint."""
    organization_id: str = Field(..., description="The organization ID")
    domain_name: str = Field(..., description="The organization domain name")
    company_name: str | None = Field(None, description="The full company name")
