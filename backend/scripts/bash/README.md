# Add Organization Script

This script allows you to add a new organization to the proCure database.

## Usage

### Interactive Mode
```bash
./add_organization.sh
```
This will prompt you for:
- Domain name (required)
- Company name (optional)
- Number of admin slots (default: 1)
- Number of member slots (default: 1000)

### Default Mode
```bash
./add_organization.sh --default
```
This will add Firebay Studios with:
- Domain: firebaystudios.com
- Company name: Firebay Studios
- Admin slots: 200
- Member slots: 999

## Notes
- The script automatically generates a unique organization ID
- Users should be created through the normal sign-up flow to ensure proper authentication
- The script requires a valid DATABASE_URL in the .env file
