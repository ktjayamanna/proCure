from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Tuple, Optional, Set, Dict, Any

from procure.db.models import Employee, PurchasedSaas, EmployeeActivity

# Database operations for core functionality

def get_employee_by_email(db: Session, email: str) -> Optional[Employee]:
    """Get an employee by email."""
    stmt = select(Employee).where(Employee.email == email)
    return db.scalars(stmt).one_or_none()

def get_purchased_saas_urls(db: Session) -> Set[str]:
    """Get all purchased SaaS URLs in the system.

    Note: Any employee can use any purchased SaaS in the system.
    """
    stmt = select(PurchasedSaas.url)
    return {row[0] for row in db.execute(stmt)}

def check_existing_activities(
    db: Session,
    user_id: int,
    urls: List[str],
    date: datetime.date
) -> Dict[str, bool]:
    """Check which URLs already have activities for a user on a specific date.

    Returns a dictionary mapping each URL to a boolean indicating whether an activity exists.
    This is more efficient than returning a set of URLs and checking membership later.
    """
    # Create a dictionary with all URLs initialized to False (no activity)
    result = {url: False for url in urls}

    if not urls:  # Skip the query if there are no URLs to check
        return result

    # Query existing activities
    stmt = (
        select(EmployeeActivity.url)
        .where(and_(
            EmployeeActivity.user_id == user_id,
            EmployeeActivity.url.in_(urls),
            func.date(EmployeeActivity.date) == date
        ))
    )

    # Mark URLs with existing activities as True
    for row in db.execute(stmt):
        result[row[0]] = True

    return result

def create_activities(
    db: Session,
    user_id: int,
    matched_entries: List[Tuple[str, str, int]]
) -> List[EmployeeActivity]:
    """Create activity entries for matched URLs."""
    # Get today's date
    today = datetime.now(timezone.utc).date()

    # Check existing activities
    urls = [url for url, _, _ in matched_entries]
    activity_exists = check_existing_activities(db, user_id, urls, today)

    # Create new activities for URLs not yet recorded today
    new_activities = [
        EmployeeActivity(
            user_id=user_id,
            url=url,
            browser=browser,
            date=datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
        )
        for url, browser, timestamp in matched_entries
        if not activity_exists[url]  # More efficient lookup in dictionary
    ]

    if new_activities:
        # Bulk insert new activities
        with db.begin():
            db.bulk_save_objects(
                new_activities,
                return_defaults=False
            )

    return new_activities

def process_url_visits(
    db: Session,
    email: str,
    entries: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Process URL visits and record activities."""
    # Get user
    user = get_employee_by_email(db, email)
    if not user:
        return {
            "success": False,
            "error": f"Employee with email {email} not found",
            "status_code": 404
        }

    # Get all purchased SaaS URLs (any employee can use any purchased SaaS)
    purchased_urls = get_purchased_saas_urls(db)

    # Process entries and find matches
    matched_entries: List[Tuple[str, str, int]] = []  # [(url, browser, timestamp)]
    for entry in entries:
        matching_url = next(
            (url for url in purchased_urls if url in entry["url"]),
            None
        )
        if matching_url:
            matched_entries.append((
                matching_url,
                entry["browser"],
                entry["timestamp"]
            ))

    if not matched_entries:
        return {
            "success": True,
            "processed": len(entries),
            "matched": 0,
            "message": "No matching URLs found"
        }

    # Create activities
    new_activities = create_activities(db, user.user_id, matched_entries)

    return {
        "success": True,
        "processed": len(entries),
        "matched": len(new_activities),
        "message": "URL visit logs processed successfully"
    }