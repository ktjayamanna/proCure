"""
Organization management functions for the proCure application.
"""

from sqlalchemy.orm import Session
from typing import Dict, Any

from procure.db import core as db_core

def get_organization_name_by_id(db: Session, organization_id: str) -> Dict[str, Any]:
    """
    Get an organization name by its ID.

    Args:
        db: Database session
        organization_id: The organization ID to look up

    Returns:
        A dictionary with success status and organization data or error message
    """
    # Get organization from database
    organization = db_core.get_organization_by_id(db, organization_id)

    if not organization:
        return {
            "success": False,
            "error": f"Organization with ID {organization_id} not found",
            "status_code": 404
        }

    return {
        "success": True,
        "organization": {
            "organization_id": organization.organization_id,
            "domain_name": organization.domain_name,
            "company_name": organization.company_name
        }
    }