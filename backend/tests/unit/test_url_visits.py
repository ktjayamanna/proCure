"""
Unit tests for the URL visits endpoint.

These tests verify that the URL visits endpoint correctly:
1. Receives updates from the Chrome extension
2. Authenticates users properly
3. Updates the database only if the update reflects a user activity this month
   which satisfies: user from this org has never visited this website this month so far
4. Handles users from different organizations correctly
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from procure.server.url_visits.routes import log_url_visits
from procure.server.url_visits.schemas import UrlVisitLog, UrlVisitEntry
from procure.db.models import User, Organization, Contract, UserActivity


# Mock user data for different organizations
@pytest.fixture
def mock_users():
    """Create mock users from different organizations."""
    org1 = Organization(
        organization_id="org_abcdefghijklmnopqrstuvwxyz123456",
        domain_name="firebaystudios.com",
        company_name="FireBay Studios"
    )

    org2 = Organization(
        organization_id="org_bcdefghijklmnopqrstuvwxyz1234567",
        domain_name="example.com",
        company_name="Example Corporation"
    )

    user1 = User(
        id="user1",
        email="user1@firebaystudios.com",
        organization_id="org_abcdefghijklmnopqrstuvwxyz123456",
        organization=org1
    )

    user2 = User(
        id="user2",
        email="user2@example.com",
        organization_id="org_bcdefghijklmnopqrstuvwxyz1234567",
        organization=org2
    )

    return {"user1": user1, "user2": user2, "org1": org1, "org2": org2}


# Mock contracts for different organizations
@pytest.fixture
def mock_contracts(mock_users):
    """Create mock contracts for different organizations."""
    contract1 = Contract(
        contract_id=1,
        vendor_name="Google Workspace",
        product_url="https://mail.google.com",
        vendor_domain="google.com",
        organization_id=mock_users["org1"].organization_id,
        owner_id=mock_users["user1"].id
    )

    contract2 = Contract(
        contract_id=2,
        vendor_name="Microsoft",
        product_url="https://microsoft.com",
        vendor_domain="microsoft.com",
        organization_id=mock_users["org1"].organization_id,
        owner_id=mock_users["user1"].id
    )

    contract3 = Contract(
        contract_id=3,
        vendor_name="Slack",
        product_url="https://app.slack.com",
        vendor_domain="slack.com",
        organization_id=mock_users["org2"].organization_id,
        owner_id=mock_users["user2"].id
    )

    return [contract1, contract2, contract3]


# Mock database session
@pytest.fixture
def mock_db():
    """Create a mock database session."""
    db = MagicMock(spec=Session)
    return db


# Mock process_url_visits function
@pytest.fixture
def mock_process_url_visits():
    """Mock the process_url_visits function."""
    with patch("procure.db.core.process_url_visits") as mock:
        yield mock


# Test cases for URL visits endpoint
@pytest.mark.asyncio
async def test_log_url_visits_success(mock_db, mock_process_url_visits):
    """Test successful URL visit logging."""
    # Setup
    email = "user1@firebaystudios.com"
    log_data = UrlVisitLog(
        entries=[
            UrlVisitEntry(
                url="https://mail.google.com",
                timestamp=int(datetime.now(timezone.utc).timestamp() * 1000),
                browser="Chrome"
            )
        ]
    )

    # Mock the process_url_visits function to return success
    mock_process_url_visits.return_value = {
        "success": True,
        "processed": 1,
        "matched": 1,
        "message": "URL visit logs processed successfully"
    }

    # Execute
    response = await log_url_visits(log_data, mock_db, email)

    # Verify
    assert response.processed == 1
    assert response.matched == 1
    assert response.message == "URL visit logs processed successfully"

    # Verify process_url_visits was called with correct parameters
    mock_process_url_visits.assert_called_once()
    call_args = mock_process_url_visits.call_args[0]
    assert call_args[0] == mock_db
    assert call_args[1] == email
    assert len(call_args[2]) == 1
    assert call_args[2][0]["url"] == "https://mail.google.com"
    assert call_args[2][0]["browser"] == "Chrome"


@pytest.mark.asyncio
async def test_log_url_visits_no_matches(mock_db, mock_process_url_visits):
    """Test URL visit logging with no matching contracts."""
    # Setup
    email = "user1@firebaystudios.com"
    log_data = UrlVisitLog(
        entries=[
            UrlVisitEntry(
                url="https://unknown-site.com",
                timestamp=int(datetime.now(timezone.utc).timestamp() * 1000),
                browser="Chrome"
            )
        ]
    )

    # Mock the process_url_visits function to return no matches
    mock_process_url_visits.return_value = {
        "success": True,
        "processed": 1,
        "matched": 0,
        "message": "No matching URLs found"
    }

    # Execute
    response = await log_url_visits(log_data, mock_db, email)

    # Verify
    assert response.processed == 1
    assert response.matched == 0
    assert response.message == "No matching URLs found"


@pytest.mark.asyncio
async def test_log_url_visits_already_visited(mock_db, mock_process_url_visits):
    """Test URL visit logging for a site already visited this month."""
    # Setup
    email = "user1@firebaystudios.com"
    log_data = UrlVisitLog(
        entries=[
            UrlVisitEntry(
                url="https://mail.google.com",
                timestamp=int(datetime.now(timezone.utc).timestamp() * 1000),
                browser="Chrome"
            )
        ]
    )

    # Mock the process_url_visits function to return already visited
    mock_process_url_visits.return_value = {
        "success": True,
        "processed": 1,
        "matched": 0,
        "message": "No matching URLs found or all matches already have activities this month"
    }

    # Execute
    response = await log_url_visits(log_data, mock_db, email)

    # Verify
    assert response.processed == 1
    assert response.matched == 0
    assert response.message == "No matching URLs found or all matches already have activities this month"


@pytest.mark.asyncio
async def test_log_url_visits_user_not_found(mock_db, mock_process_url_visits):
    """Test URL visit logging with a non-existent user."""
    # Setup
    email = "nonexistent@example.com"
    log_data = UrlVisitLog(
        entries=[
            UrlVisitEntry(
                url="https://mail.google.com",
                timestamp=int(datetime.now(timezone.utc).timestamp() * 1000),
                browser="Chrome"
            )
        ]
    )

    # Mock the process_url_visits function to return user not found
    mock_process_url_visits.return_value = {
        "success": False,
        "error": f"User with email {email} not found",
        "status_code": 404
    }

    # Execute and verify exception
    with pytest.raises(HTTPException) as excinfo:
        await log_url_visits(log_data, mock_db, email)

    assert excinfo.value.status_code == 404
    assert f"User with email {email} not found" in str(excinfo.value.detail)


@pytest.mark.asyncio
async def test_log_url_visits_database_error(mock_db, mock_process_url_visits):
    """Test URL visit logging with a database error."""
    # Setup
    email = "user1@firebaystudios.com"
    log_data = UrlVisitLog(
        entries=[
            UrlVisitEntry(
                url="https://mail.google.com",
                timestamp=int(datetime.now(timezone.utc).timestamp() * 1000),
                browser="Chrome"
            )
        ]
    )

    # Mock the process_url_visits function to raise a database error
    mock_process_url_visits.side_effect = SQLAlchemyError("Database error")

    # Execute and verify exception
    with pytest.raises(HTTPException) as excinfo:
        await log_url_visits(log_data, mock_db, email)

    assert excinfo.value.status_code == 500
    assert "Database error" in str(excinfo.value.detail)


# Integration tests with mocked database
class TestUrlVisitsIntegration:
    """Integration tests for URL visits with mocked database."""

    @pytest.mark.asyncio
    async def test_process_url_visits_new_activity(self, mock_db, mock_users, mock_contracts):
        """Test processing URL visits creates new activity for first visit this month."""
        from procure.db import core as db_core
        from procure.server.utils import get_base_domain

        # Setup
        user = mock_users["user1"]
        email = user.email
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        entries = [
            {
                "url": "https://mail.google.com",
                "browser": "Chrome",
                "timestamp": timestamp
            }
        ]

        # Mock database queries
        mock_db.scalars().one_or_none.side_effect = [
            user,  # get_user_by_email
            None   # No existing activity this month
        ]
        mock_db.execute().fetchall.side_effect = [
            [(1, "google.com")],  # matching_contracts
            []  # existing_activities_query (no existing activities)
        ]

        # Execute with real function
        with patch("procure.server.utils.get_base_domain", return_value="google.com"):
            result = db_core.process_url_visits(mock_db, email, entries)

        # Verify
        assert result["success"] is True
        assert result["processed"] == 1
        assert result["matched"] == 1
        assert result["message"] == "URL visit logs processed successfully"

        # Verify bulk_save_objects was called to create new activity
        mock_db.bulk_save_objects.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_url_visits_already_visited(self, mock_db, mock_users, mock_contracts):
        """Test processing URL visits doesn't create activity for already visited site."""
        from procure.db import core as db_core
        from procure.server.utils import get_base_domain

        # Setup
        user = mock_users["user1"]
        email = user.email
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        entries = [
            {
                "url": "https://mail.google.com",
                "browser": "Chrome",
                "timestamp": timestamp
            }
        ]

        # Mock database queries
        mock_db.scalars().one_or_none.side_effect = [
            user  # get_user_by_email
        ]
        mock_db.execute().fetchall.side_effect = [
            [(1, "google.com")],  # matching_contracts
            [(1,)]  # existing_activities_query (existing activity)
        ]

        # Execute with real function
        with patch("procure.server.utils.get_base_domain", return_value="google.com"):
            result = db_core.process_url_visits(mock_db, email, entries)

        # Verify
        assert result["success"] is True
        assert result["processed"] == 1
        assert result["matched"] == 0
        assert result["message"] == "No matching URLs found or all matches already have activities this month"

        # Verify bulk_save_objects was not called
        mock_db.bulk_save_objects.assert_not_called()
        mock_db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_url_visits_different_orgs(self, mock_db, mock_users, mock_contracts):
        """Test processing URL visits for users from different organizations."""
        from procure.db import core as db_core
        from procure.server.utils import get_base_domain

        # Setup for user1 (org1)
        user1 = mock_users["user1"]
        email1 = user1.email
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        entries1 = [
            {
                "url": "https://mail.google.com",
                "browser": "Chrome",
                "timestamp": timestamp
            }
        ]

        # Setup for user2 (org2)
        user2 = mock_users["user2"]
        email2 = user2.email
        entries2 = [
            {
                "url": "https://app.slack.com",
                "browser": "Chrome",
                "timestamp": timestamp
            }
        ]

        # Mock database queries for user1
        mock_db.scalars().one_or_none.return_value = user1  # get_user_by_email for user1
        mock_db.execute().fetchall.side_effect = [
            [(1, "google.com")],  # matching_contracts for user1
            []                    # existing_activities_query for user1
        ]

        # Execute with real function for user1
        with patch("procure.server.utils.get_base_domain", return_value="google.com"):
            result1 = db_core.process_url_visits(mock_db, email1, entries1)

        # Reset mocks for user2
        mock_db.reset_mock()

        # Set up mocks again for user2
        mock_db.scalars().one_or_none.return_value = user2
        mock_db.execute().fetchall.side_effect = [
            [(3, "slack.com")],  # matching_contracts for user2
            []                    # existing_activities_query for user2
        ]

        # Execute with real function for user2
        with patch("procure.server.utils.get_base_domain", return_value="slack.com"):
            result2 = db_core.process_url_visits(mock_db, email2, entries2)

        # Verify results for both users
        assert result1["success"] is True
        assert result1["matched"] == 1
        assert result2["success"] is True
        assert result2["matched"] == 1
