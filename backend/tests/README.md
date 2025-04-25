# proCure Backend Tests

This directory contains tests for the proCure backend application. The tests are organized into unit tests and integration tests.

## Test Structure

```
tests/
├── integration/        # Integration tests that test multiple components together
│   └── ...
└── unit/               # Unit tests for individual components
    ├── test_url_visits.py            # Tests for URL visits endpoint
    ├── test_process_url_visits.py    # Tests for URL visits processing function
    └── ...
```

## URL Visits Tests

The URL visits feature is tested by two main test files:

### `test_url_visits.py`

This file tests the FastAPI endpoint that receives URL visit logs from the Chrome extension. It verifies that:

1. The endpoint correctly authenticates users
2. It processes URL visit data from the Chrome extension
3. It updates the database only when a user from an organization visits a website they haven't visited that month
4. It handles various error conditions properly

#### Test Cases:

- `test_log_url_visits_success`: Tests successful URL visit logging
- `test_log_url_visits_no_matches`: Tests handling of URLs with no matching contracts
- `test_log_url_visits_already_visited`: Tests handling of URLs already visited this month
- `test_log_url_visits_user_not_found`: Tests error handling for non-existent users
- `test_log_url_visits_database_error`: Tests error handling for database errors

#### Integration Tests:

- `TestUrlVisitsIntegration.test_process_url_visits_new_activity`: Tests that new activities are created for first-time visits
- `TestUrlVisitsIntegration.test_process_url_visits_already_visited`: Tests that no activities are created for already visited sites
- `TestUrlVisitsIntegration.test_process_url_visits_different_orgs`: Tests that users from different organizations only see their own contracts

### `test_process_url_visits.py`

This file tests the core function that processes URL visits and updates the database. It verifies that:

1. The function correctly identifies users and their organizations
2. It matches URL domains with contracts in the database
3. It only creates activities for URLs that haven't been visited this month
4. It handles various edge cases and error conditions

#### Test Cases:

- `test_user_not_found`: Tests handling of non-existent users
- `test_no_valid_urls`: Tests handling of invalid URLs
- `test_no_matching_contracts`: Tests handling of URLs with no matching contracts
- `test_already_visited_this_month`: Tests handling of URLs already visited this month
- `test_new_activity_created`: Tests creation of new activities for first-time visits
- `test_multiple_urls_some_matched`: Tests handling of multiple URLs with mixed results
- `test_database_error`: Tests error handling for database errors
- `test_different_organizations`: Tests handling of users from different organizations

## Running the Tests

To run all tests:

```bash
python -m pytest
```

To run specific test files:

```bash
python -m pytest tests/unit/test_url_visits.py
python -m pytest tests/unit/test_process_url_visits.py
```

To run tests with verbose output:

```bash
python -m pytest -v
```

## Testing Approach

### Mocking Strategy

The tests use pytest's mocking capabilities to isolate the components being tested:

1. **Database Session**: The SQLAlchemy database session is mocked to avoid actual database operations
2. **Authentication**: The authentication mechanism is mocked to simulate authenticated users
3. **URL Processing**: The URL domain extraction is mocked to control the test scenarios

### Test Fixtures

Several fixtures are used to set up the test environment:

- `mock_users`: Creates mock users from different organizations
- `mock_contracts`: Creates mock contracts for different organizations
- `mock_db`: Creates a mock database session
- `mock_process_url_visits`: Mocks the process_url_visits function for endpoint tests

### Integration vs. Unit Tests

- **Unit Tests**: Test individual functions in isolation with mocked dependencies
- **Integration Tests**: Test how components work together, with some dependencies still mocked

## Key Aspects Tested

1. **Authentication**: Tests verify that the endpoint properly authenticates users and handles invalid authentication.

2. **Organization Isolation**: Tests verify that users from different organizations only see contracts from their own organization.

3. **Monthly Activity Tracking**: Tests verify that activities are only created once per month per user per contract.

4. **Error Handling**: Tests verify proper handling of various error conditions.

5. **Data Processing**: Tests verify that URL domains are correctly extracted and matched with contracts.
