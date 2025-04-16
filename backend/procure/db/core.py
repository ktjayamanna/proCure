from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from procure.db.models import Employee, PurchasedSaas, EmployeeActivity

# Database operations for core functionality

def get_employee_by_email(db: Session, email: str) -> Optional[Employee]:
    """Get an employee by email."""
    stmt = select(Employee).where(Employee.email == email)
    return db.scalars(stmt).one_or_none()

def process_url_visits(
    db: Session,
    email: str,
    entries: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Process URL visits and record activities.

    This function performs most operations at the database level for efficiency:
    1. Finds the employee by email
    2. Identifies which URLs in the entries match purchased SaaS URLs
    3. Checks which matched URLs don't already have activities for today
    4. Creates new activities for those URLs
    """
    # Get user
    user = get_employee_by_email(db, email)
    if not user:
        return {
            "success": False,
            "error": f"Employee with email {email} not found",
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

    with db.begin():
        # Find matches between entry URLs and purchased SaaS URLs directly in the database
        # This is done by checking if any purchased SaaS URL is contained within the entry URL
        matched_entries = []

        # Get all purchased SaaS URLs
        purchased_saas_stmt = select(PurchasedSaas.url)
        purchased_urls = [row[0] for row in db.execute(purchased_saas_stmt)]

        # Match entry URLs with purchased SaaS URLs
        # This part still needs Python processing as SQL LIKE/CONTAINS would need
        # a different approach for substring matching in this direction
        for entry_url, browser, timestamp in entry_urls:
            for purchased_url in purchased_urls:
                if purchased_url in entry_url:  # Check if purchased URL is in entry URL
                    matched_entries.append((purchased_url, browser, timestamp))
                    break  # Found a match, move to next entry

        if not matched_entries:
            return {
                "success": True,
                "processed": len(entries),
                "matched": 0,
                "message": "No matching URLs found"
            }

        # Get URLs that already have activities for today
        urls_to_check = [url for url, _, _ in matched_entries]
        existing_activities_stmt = (
            select(EmployeeActivity.url)
            .where(and_(
                EmployeeActivity.user_id == user.user_id,
                EmployeeActivity.url.in_(urls_to_check),
                func.date(EmployeeActivity.date) == today
            ))
        )
        existing_urls = {row[0] for row in db.execute(existing_activities_stmt)}

        # Create new activities for URLs not yet recorded today
        new_activities = [
            EmployeeActivity(
                user_id=user.user_id,
                url=url,
                browser=browser,
                date=datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
            )
            for url, browser, timestamp in matched_entries
            if url not in existing_urls
        ]

        # Bulk insert new activities if any
        if new_activities:
            db.bulk_save_objects(new_activities, return_defaults=False)

    return {
        "success": True,
        "processed": len(entries),
        "matched": len(new_activities),
        "message": "URL visit logs processed successfully"
    }