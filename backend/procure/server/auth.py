import os
from clerk_backend_api import Clerk
from clerk_backend_api.jwks_helpers import AuthenticateRequestOptions
from fastapi import Request, HTTPException, status
import logging
from dotenv import load_dotenv

load_dotenv(".vscode/.env")
logger = logging.getLogger(__name__)

def get_current_user_email(request: Request) -> str:
    """
    Authenticate the request and return the user's email address.
    """
    try:
        sdk = Clerk(bearer_auth=os.getenv('CLERK_SECRET_KEY'))
        token_state = sdk.authenticate_request(
            request,
            AuthenticateRequestOptions(
                # authorized_parties=[os.getenv('CLERK_AUTHORIZED_PARTY')]
            )
        )
        if not token_state.is_signed_in or not getattr(token_state, 'is_valid', True):
            logger.error("Authentication failed. Invalid or missing token.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed. Invalid or missing token."
            )

        user_id = token_state.payload.get("sub")
        if not user_id:
            logger.error("User identifier ('sub') not found in token payload.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User identifier not found in token payload."
            )

        user_details = sdk.users.get(user_id=user_id)
        if user_details.email_addresses and len(user_details.email_addresses) > 0:
            email = user_details.email_addresses[0].email_address
        else:
            email = None

        if not email:
            logger.error("Email not found in user details.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email not found in user details."
            )

        return email
    except Exception as exc:
        logger.exception("Error authenticating request: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing authentication."
        )
