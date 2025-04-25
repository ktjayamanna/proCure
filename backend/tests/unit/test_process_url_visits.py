"""
Unit tests for the process_url_visits function.

These tests verify that the process_url_visits function correctly:
1. Processes URL visits from the Chrome extension
2. Matches URLs with contracts in the database
3. Creates activities only for URLs that haven't been visited this month
4. Handles users from different organizations correctly
5. Handles various edge cases and error conditions
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from procure.db import core as db_core
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


# Test cases for process_url_visits function
class TestProcessUrlVisits:
    """Tests for the process_url_visits function."""

    def test_user_not_found(self, mock_db):
        """Test process_url_visits when user is not found."""
        # Setup
        email = "nonexistent@example.com"
        entries = [
            {
                "url": "https://mail.google.com",
                "browser": "Chrome",
                "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
            }
        ]

        # Mock get_user_by_email to return None
        mock_db.scalars().one_or_none.return_value = None

        # Execute
        result = db_core.process_url_visits(mock_db, email, entries)

        # Verify
        assert result["success"] is False
        assert result["error"] == f"User with email {email} not found"
        assert result["status_code"] == 404

    def test_no_valid_urls(self, mock_db, mock_users):
        """Test process_url_visits with no valid URLs."""
        # Setup
        user = mock_users["user1"]
        email = user.email
        entries = [
            {
                "url": "invalid-url",
                "browser": "Chrome",
                "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
            }
        ]

        # Mock get_user_by_email to return the user
        mock_db.scalars().one_or_none.return_value = user

        # We need to mock the entire function to ensure entry_domains is empty
        with patch("procure.db.core.get_base_domain") as mock_get_base_domain:
            # Make the function raise an exception to ensure entry_domains remains empty
            mock_get_base_domain.side_effect = Exception("Invalid URL")

            # Execute
            result = db_core.process_url_visits(mock_db, email, entries)

        # Verify
        assert result["success"] is True
        assert result["processed"] == 1
        assert result["matched"] == 0
        assert result["message"] == "No valid URLs provided"

    def test_no_matching_contracts(self, mock_db, mock_users):
        """Test process_url_visits with no matching contracts."""
        # Setup
        user = mock_users["user1"]
        email = user.email
        entries = [
            {
                "url": "https://unknown-site.com",
                "browser": "Chrome",
                "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
            }
        ]

        # Mock get_user_by_email to return the user
        mock_db.scalars().one_or_none.return_value = user

        # Mock get_base_domain to return a domain
        with patch("procure.server.utils.get_base_domain", return_value="unknown-site.com"):
            # Mock execute().fetchall() to return empty list (no matching contracts)
            mock_db.execute().fetchall.return_value = []

            # Execute
            result = db_core.process_url_visits(mock_db, email, entries)

        # Verify
        assert result["success"] is True
        assert result["processed"] == 1
        assert result["matched"] == 0
        assert result["message"] == "No matching URLs found"

    def test_already_visited_this_month(self, mock_db, mock_users):
        """Test process_url_visits with URLs already visited this month."""
        # Setup
        user = mock_users["user1"]
        email = user.email
        entries = [
            {
                "url": "https://mail.google.com",
                "browser": "Chrome",
                "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
            }
        ]

        # Mock get_user_by_email to return the user
        mock_db.scalars().one_or_none.return_value = user

        # Mock get_base_domain to return a domain
        with patch("procure.server.utils.get_base_domain", return_value="google.com"):
            # Mock execute().fetchall() to return matching contracts and existing activities
            mock_db.execute().fetchall.side_effect = [
                [(1, "google.com")],  # matching_contracts
                [(1,)]  # existing_activities_query (existing activity)
            ]

            # Execute
            result = db_core.process_url_visits(mock_db, email, entries)

        # Verify
        assert result["success"] is True
        assert result["processed"] == 1
        assert result["matched"] == 0
        assert result["message"] == "No matching URLs found or all matches already have activities this month"

        # Verify bulk_save_objects was not called
        mock_db.bulk_save_objects.assert_not_called()
        mock_db.commit.assert_not_called()

    def test_new_activity_created(self, mock_db, mock_users):
        """Test process_url_visits creates new activity for first visit this month."""
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

        # Mock get_user_by_email to return the user
        mock_db.scalars().one_or_none.return_value = user

        # Mock get_base_domain to return a domain
        with patch("procure.server.utils.get_base_domain", return_value="google.com"):
            # Mock execute().fetchall() to return matching contracts and no existing activities
            mock_db.execute().fetchall.side_effect = [
                [(1, "google.com")],  # matching_contracts
                []  # existing_activities_query (no existing activities)
            ]

            # Execute
            result = db_core.process_url_visits(mock_db, email, entries)

        # Verify
        assert result["success"] is True
        assert result["processed"] == 1
        assert result["matched"] == 1
        assert result["message"] == "URL visit logs processed successfully"

        # Verify bulk_save_objects was called to create new activity
        mock_db.bulk_save_objects.assert_called_once()
        mock_db.commit.assert_called_once()

        # Verify the created activity has the correct data
        created_activity = mock_db.bulk_save_objects.call_args[0][0][0]
        assert created_activity.user_id == user.id
        assert created_activity.contract_id == 1
        assert created_activity.browser == "Chrome"
        assert isinstance(created_activity.date, datetime)

    def test_multiple_urls_some_matched(self, mock_db, mock_users):
        """Test process_url_visits with multiple URLs, some matched and some not."""
        # Setup
        user = mock_users["user1"]
        email = user.email
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        entries = [
            {
                "url": "https://mail.google.com",
                "browser": "Chrome",
                "timestamp": timestamp
            },
            {
                "url": "https://microsoft.com",
                "browser": "Chrome",
                "timestamp": timestamp
            },
            {
                "url": "https://unknown-site.com",
                "browser": "Chrome",
                "timestamp": timestamp
            }
        ]

        # Mock get_user_by_email to return the user
        mock_db.scalars().one_or_none.return_value = user

        # Mock get_base_domain to return different domains
        with patch("procure.server.utils.get_base_domain", side_effect=["google.com", "microsoft.com", "unknown-site.com"]):
            # Mock execute().fetchall() to return matching contracts and existing activities
            mock_db.execute().fetchall.side_effect = [
                [(1, "google.com"), (2, "microsoft.com")],  # matching_contracts (google and microsoft match)
                [(1,)]  # existing_activities_query (google already has activity)
            ]

            # Execute
            result = db_core.process_url_visits(mock_db, email, entries)

        # Verify
        assert result["success"] is True
        assert result["processed"] == 3
        assert result["matched"] == 1  # Only microsoft should be matched (google already visited, unknown not in contracts)
        assert result["message"] == "URL visit logs processed successfully"

        # Verify bulk_save_objects was called to create new activity
        mock_db.bulk_save_objects.assert_called_once()
        mock_db.commit.assert_called_once()

        # Verify the created activity has the correct data
        created_activity = mock_db.bulk_save_objects.call_args[0][0][0]
        assert created_activity.user_id == user.id
        assert created_activity.contract_id == 2  # Microsoft contract
        assert created_activity.browser == "Chrome"
        assert isinstance(created_activity.date, datetime)

    def test_database_error(self, mock_db, mock_users):
        """Test process_url_visits handles database errors during activity creation."""
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

        # Mock get_user_by_email to return the user
        mock_db.scalars().one_or_none.return_value = user

        # Mock get_base_domain to return a domain
        with patch("procure.server.utils.get_base_domain", return_value="google.com"):
            # Mock execute().fetchall() to return matching contracts and no existing activities
            mock_db.execute().fetchall.side_effect = [
                [(1, "google.com")],  # matching_contracts
                []  # existing_activities_query (no existing activities)
            ]

            # Mock bulk_save_objects to raise a database error
            mock_db.bulk_save_objects.side_effect = SQLAlchemyError("Database error")

            # Execute and verify exception
            with pytest.raises(SQLAlchemyError) as excinfo:
                db_core.process_url_visits(mock_db, email, entries)

            assert "Database error" in str(excinfo.value)

            # Verify rollback was called
            mock_db.rollback.assert_called_once()

    def test_different_organizations(self, mock_db, mock_users):
        """Test process_url_visits for users from different organizations."""
        # Setup for user1 (org1)
        user1 = mock_users["user1"]
        email1 = user1.email
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        entries = [
            {
                "url": "https://mail.google.com",
                "browser": "Chrome",
                "timestamp": timestamp
            },
            {
                "url": "https://app.slack.com",  # This is in org2's contracts
                "browser": "Chrome",
                "timestamp": timestamp
            }
        ]

        # Mock get_user_by_email to return user1
        mock_db.scalars().one_or_none.return_value = user1

        # Mock get_base_domain to return different domains
        with patch("procure.server.utils.get_base_domain", side_effect=["google.com", "slack.com"]):
            # Mock execute().fetchall() to return matching contracts and no existing activities
            # Note: Only google.com should match for user1, not slack.com (different org)
            mock_db.execute().fetchall.side_effect = [
                [(1, "google.com")],  # matching_contracts (only google matches for user1)
                []  # existing_activities_query (no existing activities)
            ]

            # Execute for user1
            result = db_core.process_url_visits(mock_db, email1, entries)

        # Verify
        assert result["success"] is True
        assert result["processed"] == 2
        assert result["matched"] == 1  # Only google should be matched for user1
        assert result["message"] == "URL visit logs processed successfully"

        # Verify bulk_save_objects was called to create new activity
        mock_db.bulk_save_objects.assert_called_once()
        mock_db.commit.assert_called_once()

        # Verify the created activity has the correct data
        created_activity = mock_db.bulk_save_objects.call_args[0][0][0]
        assert created_activity.user_id == user1.id
        assert created_activity.contract_id == 1  # Google contract
        assert created_activity.browser == "Chrome"
        assert isinstance(created_activity.date, datetime)

        # Reset mocks for user2
        mock_db.reset_mock()

        # Setup for user2 (org2)
        user2 = mock_users["user2"]
        email2 = user2.email
        entries = [
            {
                "url": "https://mail.google.com",  # This is in org1's contracts
                "browser": "Chrome",
                "timestamp": timestamp
            },
            {
                "url": "https://app.slack.com",
                "browser": "Chrome",
                "timestamp": timestamp
            }
        ]

        # Mock get_user_by_email to return user2
        mock_db.scalars().one_or_none.return_value = user2

        # Mock get_base_domain to return different domains
        with patch("procure.server.utils.get_base_domain", side_effect=["google.com", "slack.com"]):
            # Mock execute().fetchall() to return matching contracts and no existing activities
            # Note: Only slack.com should match for user2, not google.com (different org)
            mock_db.execute().fetchall.side_effect = [
                [(3, "slack.com")],  # matching_contracts (only slack matches for user2)
                []  # existing_activities_query (no existing activities)
            ]

            # Execute for user2
            result = db_core.process_url_visits(mock_db, email2, entries)

        # Verify
        assert result["success"] is True
        assert result["processed"] == 2
        assert result["matched"] == 1  # Only slack should be matched for user2
        assert result["message"] == "URL visit logs processed successfully"

        # Verify bulk_save_objects was called to create new activity
        mock_db.bulk_save_objects.assert_called_once()
        mock_db.commit.assert_called_once()

        # Verify the created activity has the correct data
        created_activity = mock_db.bulk_save_objects.call_args[0][0][0]
        assert created_activity.user_id == user2.id
        assert created_activity.contract_id == 3  # Slack contract
        assert created_activity.browser == "Chrome"
        assert isinstance(created_activity.date, datetime)
