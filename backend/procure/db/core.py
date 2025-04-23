from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

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
    3. Matches entry domains with vendor domains in contracts
    4. Checks which matched URLs don't already have activities for today
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
    entry_data = []
    for entry in entries:
        url = entry["url"]
        browser = entry["browser"]
        timestamp = entry["timestamp"]
        try:
            # Extract the base domain from the URL
            base_domain = get_base_domain(url)
            entry_data.append((url, base_domain, browser, timestamp))
        except Exception as e:
            # Skip invalid URLs
            continue

    if not entry_data:
        return {
            "success": True,
            "processed": len(entries),
            "matched": 0,
            "message": "No valid URLs provided"
        }

    # Get today's date for activity filtering
    today = datetime.now(timezone.utc).date()

    # Find matches between entry domains and vendor domains in contracts
    matched_entries: List[Tuple[int, str, int]] = []  # (contract_id, browser, timestamp)

    # Get all vendor domains and their contract_ids
    contract_stmt = select(Contract.contract_id, Contract.vendor_domain).where(
        Contract.organization_id == user.organization_id
    )
    contract_data = [(row[0], row[1]) for row in db.execute(contract_stmt)]

    # Match entry domains with vendor domains
    for _, entry_domain, browser, timestamp in entry_data:
        for contract_id, vendor_domain in contract_data:
            if entry_domain == vendor_domain:  # Exact match of domains
                matched_entries.append((contract_id, browser, timestamp))
                break  # Found a match, move to next entry

    if not matched_entries:
        return {
            "success": True,
            "processed": len(entries),
            "matched": 0,
            "message": "No matching URLs found"
        }

    # Get contract_ids that already have activities for today
    contract_ids_to_check = [contract_id for contract_id, _, _ in matched_entries]
    existing_activities_stmt = (
        select(UserActivity.contract_id)
        .where(and_(
            UserActivity.user_id == user.id,
            UserActivity.contract_id.in_(contract_ids_to_check),
            func.date(UserActivity.date) == today
        ))
    )
    existing_contract_ids = {row[0] for row in db.execute(existing_activities_stmt)}

    # Create new activities for contract_ids not yet recorded today
    new_activities = [
        UserActivity(
            user_id=user.id,
            contract_id=contract_id,
            browser=browser,
            date=datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
        )
        for contract_id, browser, timestamp in matched_entries
        if contract_id not in existing_contract_ids
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
