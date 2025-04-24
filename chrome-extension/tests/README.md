# Chrome Extension Tests

This directory contains tests for the Chrome extension, focusing on authentication persistence and background sync functionality.

## Test Structure

- `setup.ts`: Sets up the Jest testing environment with mocks for Chrome API, Storage, and fetch.
- `auth-persistence.test.ts`: Tests for authentication persistence functionality.
- `background-sync.test.ts`: Tests for background sync with persistent authentication.
- `background.test.ts`: Tests for the background script that handles authentication persistence.

## Running Tests

To run the tests, use the following command:

```bash
npm test
```

## Test Coverage

These tests cover the following scenarios:

### Authentication Persistence

- Device ID generation and persistence
- User authentication and token storage
- Automatic sign-in with stored token
- Token validation and error handling

### Background Sync

- Syncing domain entries with valid authentication
- Handling sync when no entries are available
- Handling sync when no authentication token is available
- Handling sync when API returns an error
- Getting and setting sync status and time

### Background Script

- Setting up alarms for sync and cleanup
- Triggering sync when alarms fire
- Adding domains to monitoring when tabs are updated or activated
- Running sync on startup if user is authenticated
- Checking authentication status periodically

## Authentication Persistence Flow

1. User signs in with email and password
2. Authentication token is stored in local storage
3. When the extension starts, it attempts to sign in with the stored token
4. If successful, the user remains signed in without needing to re-enter credentials
5. Background sync operations use the stored token for authentication

This ensures that the user never has to sign in again unless something out of our control happens, like clearing the web browser storage.
