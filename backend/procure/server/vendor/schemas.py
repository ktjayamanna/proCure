"""
Pydantic schemas for vendor operations in the proCure application.
"""

from typing import Optional
from pydantic import BaseModel, Field

class VendorContractRequest(BaseModel):
    """Request model for adding a vendor contract."""
    vendor_name: str = Field(..., description="The name of the vendor")
    product_url: str = Field(..., description="The URL of the vendor's product")
    organization_id: str = Field(..., description="The organization ID")
    annual_spend: Optional[float] = Field(None, description="Annual spend on this vendor")
    contract_type: Optional[str] = Field(None, description="Type of contract")
    contract_status: Optional[str] = Field(None, description="Status of the contract")
    payment_type: Optional[str] = Field(None, description="Type of payment")
    num_seats: Optional[int] = Field(1, description="Number of seats purchased")
    notes: Optional[str] = Field(None, description="Additional notes about the contract")

class VendorContractResponse(BaseModel):
    """Response model for vendor contract operations."""
    success: bool = Field(..., description="Whether the operation was successful")
    contract_id: int = Field(..., description="The ID of the contract")
    vendor_name: str = Field(..., description="The name of the vendor")
    product_url: str = Field(..., description="The normalized URL of the vendor's product")
    message: str = Field(..., description="A message describing the result of the operation")
    created: bool = Field(..., description="Whether a new contract was created or an existing one was updated")
