"""
Analytics functions for the proCure application.
"""

import logging
from sqlalchemy import select, func, and_, extract
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List

from procure.db.models import Organization, Contract, UserActivity, User

# Set up logging
logger = logging.getLogger(__name__)

def get_contract_usage_by_org_id(db: Session, organization_id: str) -> Dict[str, Any]:
    """
    Get contract usage statistics for an organization.

    This function:
    1. Aggregates user activities by contract for the current month
    2. Joins with the contracts table to get vendor names and seat counts
    3. Calculates usage ratios

    Args:
        db: Database session
        organization_id: The organization ID to analyze

    Returns:
        A dictionary with success status and contract usage data or error message
    """
    # Get organization from database
    organization = db.scalars(
        select(Organization).where(Organization.organization_id == organization_id)
    ).one_or_none()

    if not organization:
        return {
            "success": False,
            "error": f"Organization with ID {organization_id} not found",
            "status_code": 404
        }

    # Get current month and year
    now = datetime.now()
    current_month = now.month
    current_year = now.year

    # Query to get the count of unique users per contract for the current month
    # First, get all contracts for the organization
    contracts_query = select(Contract).where(Contract.organization_id == organization_id)
    contracts = db.scalars(contracts_query).all()

    if not contracts:
        return {
            "success": True,
            "organization": {
                "organization_id": organization.organization_id,
                "company_name": organization.company_name
            },
            "contracts": []
        }

    # For each contract, count unique users with activity this month
    contract_usage_data = []

    for contract in contracts:
        # Count unique users who have activity with this contract this month
        # Join with User table to filter by organization_id
        active_users_count = db.scalar(
            select(func.count(func.distinct(UserActivity.user_id)))
            .join(User, UserActivity.user_id == User.id)
            .where(
                and_(
                    UserActivity.contract_id == contract.contract_id,
                    User.organization_id == organization_id,  # Filter by organization
                    extract('month', UserActivity.date) == current_month,
                    extract('year', UserActivity.date) == current_year
                )
            )
        ) or 0

        # Get total seats (default to 1 if null to avoid issues)
        total_seats = contract.num_seats or 1

        contract_usage_data.append({
            "vendor_name": contract.vendor_name,
            "active_users": active_users_count,
            "total_seats": total_seats
            # No usage_ratio - frontend will handle formatting
        })

    # Sort by vendor name
    contract_usage_data.sort(key=lambda x: x["vendor_name"])

    return {
        "success": True,
        "organization": {
            "organization_id": organization.organization_id,
            "company_name": organization.company_name
        },
        "contracts": contract_usage_data
    }
