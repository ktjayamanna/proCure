from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

from procure.db.models import Vendor, Organization, User, UserActivity

# Database operations for core functionality

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get a user by email."""
    stmt = select(User).where(User.email == email)
    return db.scalars(stmt).one_or_none()

def get_organization_by_id(db: Session, organization_id: str) -> Optional[Organization]:
    """Get an organization by ID."""
    stmt = select(Organization).where(Organization.organization_id == organization_id)
    return db.scalars(stmt).one_or_none()

def get_vendor_by_url(db: Session, url: str) -> Optional[Vendor]:
    """Get a vendor by URL."""
    stmt = select(Vendor).where(Vendor.url == url)
    return db.scalars(stmt).one_or_none()

def process_url_visits(
    db: Session,
    email: str,
    entries: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Process URL visits and record activities.

    This function performs most operations at the database level for efficiency:
    1. Finds the user by email
    2. Identifies which URLs in the entries match vendor URLs
    3. Checks which matched URLs don't already have activities for today
    4. Creates new activities for those URLs
    """
    # Get user
    user = get_user_by_email(db, email)
    if not user:
        return {
            "success": False,
            "error": f"User with email {email} not found",
            "status_code": 404
        }

    # Extract URLs from entries with their metadata
    entry_urls = [(entry["url"], entry["browser"], entry["timestamp"]) for entry in entries]
    if not entry_urls:
        return {
            "success": True,
            "processed": 0,
            "matched": 0,
            "message": "No entries provided"
        }

    # Get today's date for activity filtering
    today = datetime.now(timezone.utc).date()

    # Find matches between entry URLs and vendor URLs directly in the database
    # This is done by checking if any vendor URL is contained within the entry URL
    matched_entries: List[Tuple[int, str, int]] = []  # (contract_id, browser, timestamp)

    # Get all vendor URLs and their contract_ids
    vendor_stmt = select(Vendor.contract_id, Vendor.url).where(
        Vendor.organization_id == user.organization_id
    )
    vendor_data = [(row[0], row[1]) for row in db.execute(vendor_stmt)]

    # Match entry URLs with vendor URLs
    # This part still needs Python processing as SQL LIKE/CONTAINS would need
    # a different approach for substring matching in this direction
    for entry_url, browser, timestamp in entry_urls:
        for contract_id, vendor_url in vendor_data:
            if vendor_url in entry_url:  # Check if vendor URL is in entry URL
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
