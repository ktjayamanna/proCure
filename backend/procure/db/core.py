from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from procure.db.models import Contract, Organization, User, UserActivity
from procure.server.utils import get_base_domain

# Database operations for core functionality

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get a user by email."""
    stmt = select(User).where(User.email == email)
    return db.scalars(stmt).one_or_none()

def get_organization_by_id(db: Session, organization_id: str) -> Optional[Organization]:
    """Get an organization by ID."""
    stmt = select(Organization).where(Organization.organization_id == organization_id)
    return db.scalars(stmt).one_or_none()

def get_contract_by_url(db: Session, url: str) -> Optional[Contract]:
    """Get a contract by URL."""
    stmt = select(Contract).where(Contract.product_url == url)
    return db.scalars(stmt).one_or_none()

def process_url_visits(
    db: Session,
    email: str,
    entries: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Process URL visits and record activities.

    This function performs most operations at the database level for efficiency:
    1. Finds the user by email
    2. Extracts base domains from entry URLs using tldextract
    3. Uses SQLAlchemy to match entry domains with vendor domains in contracts
    4. Filters out URLs that already have activities for today
    5. Creates new activities for those URLs
    """
    # Get user
    user = get_user_by_email(db, email)
    if not user:
        return {
            "success": False,
            "error": f"User with email {email} not found",
            "status_code": 404
        }

    # Extract URLs from entries with their metadata and get their base domains
    entry_domains = []
    for entry in entries:
        url = entry["url"]
        browser = entry["browser"]
        timestamp = entry["timestamp"]
        try:
            # Extract the base domain from the URL
            base_domain = get_base_domain(url)
            entry_domains.append((base_domain, browser, timestamp))
        except Exception as e:
            # Skip invalid URLs
            continue

    if not entry_domains:
        return {
            "success": True,
            "processed": len(entries),
            "matched": 0,
            "message": "No valid URLs provided"
        }

    # Get today's date for activity filtering
    today = datetime.now(timezone.utc).date()

    # Extract just the domains for the SQL IN clause
    domains = [domain for domain, _, _ in entry_domains]

    # Use a more direct approach with SQLAlchemy
    # First, get all contracts that match the domains
    contracts_query = text("""
        SELECT c.contract_id, c.vendor_domain
        FROM contracts c
        WHERE c.organization_id = :org_id
        AND c.vendor_domain IN :domains
    """)

    # Execute the query to get matching contracts
    matching_contracts = db.execute(
        contracts_query,
        {"org_id": user.organization_id, "domains": tuple(domains)}
    ).fetchall()

    if not matching_contracts:
        return {
            "success": True,
            "processed": len(entries),
            "matched": 0,
            "message": "No matching URLs found"
        }

    # Get contract IDs that already have activities for today
    contract_ids = [contract[0] for contract in matching_contracts]

    existing_activities_query = text("""
        SELECT ua.contract_id
        FROM user_activities ua
        WHERE ua.user_id = :user_id
        AND ua.contract_id IN :contract_ids
        AND DATE(ua.date) = :today
    """)

    existing_contract_ids = {
        row[0] for row in db.execute(
            existing_activities_query,
            {"user_id": user.id, "contract_ids": tuple(contract_ids), "today": today}
        )
    }

    # Create a mapping of domain to (browser, timestamp)
    domain_to_metadata = {}
    for domain, browser, timestamp in entry_domains:
        # If we have multiple entries for the same domain, use the most recent one
        if domain not in domain_to_metadata or timestamp > domain_to_metadata[domain][1]:
            domain_to_metadata[domain] = (browser, timestamp)

    # Create new activities for contracts that don't have activities today
    matched_entries = []
    for contract_id, vendor_domain in matching_contracts:
        if contract_id not in existing_contract_ids and vendor_domain in domain_to_metadata:
            browser, timestamp = domain_to_metadata[vendor_domain]
            matched_entries.append((contract_id, browser, timestamp))

    if not matched_entries:
        return {
            "success": True,
            "processed": len(entries),
            "matched": 0,
            "message": "No matching URLs found or all matches already have activities today"
        }

    # Create new activities for the matched entries
    new_activities = [
        UserActivity(
            user_id=user.id,
            contract_id=contract_id,
            browser=browser,
            date=datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
        )
        for contract_id, browser, timestamp in matched_entries
    ]

    # Bulk insert new activities if any
    if new_activities:
        try:
            db.bulk_save_objects(new_activities, return_defaults=False)
            db.commit()
        except Exception as e:
            db.rollback()
            raise e

    return {
        "success": True,
        "processed": len(entries),
        "matched": len(new_activities),
        "message": "URL visit logs processed successfully"
    }
