import os
import logging
from firebase_admin import auth, credentials, initialize_app
import os
import json
import base64
import logging
from typing import Optional
from fastapi import Request, HTTPException, status
from firebase_admin import auth, credentials, initialize_app
from dotenv import load_dotenv

# Set log level
logging.basicConfig(level=logging.INFO)

# Create logger
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
try:
    # Set project ID in environment variable
    project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'project-procure')
    os.environ['GOOGLE_CLOUD_PROJECT'] = project_id
    logger.info(f"Set GOOGLE_CLOUD_PROJECT environment variable to '{project_id}'")
    
    # Initialize with service account credentials
    cred = credentials.Certificate(".vscode/project-procure-firebase-adminsdk-fbsvc-735005865e.json")
    
    # Initialize the app with the credentials and explicit options
    firebase_app = initialize_app(cred, {
        'projectId': project_id  # Explicitly set Firebase project ID
    })
    logger.info("Firebase Admin SDK initialized successfully")
except Exception as e:
    logger.error(f"Error initializing Firebase Admin SDK: {str(e)}")
    firebase_app = None

def get_token_from_request(request: Request) -> Optional[str]:
    """
    Extract the Firebase ID token from the Authorization header.
    """
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None

    return authorization.replace("Bearer ", "")

def get_current_user_email(request: Request) -> str:
    """
    Authenticate the request using Firebase and return the user's email address.
    """
    try:
        # Check if Firebase Admin SDK is initialized
        if not firebase_app:
            logger.error("Firebase Admin SDK not initialized")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service not available"
            )

        # Get token from request
        token = get_token_from_request(request)
        if not token:
            logger.error("No token provided in Authorization header")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No authentication token provided"
            )

        # Verify the token
        try:
            # Verify the token
            decoded_token = auth.verify_id_token(
                token,
                check_revoked=True,
                clock_skew_seconds=60,
                app=firebase_app
            )
            logger.info(f"Token verified successfully for UID: {decoded_token.get('uid')}")
        except Exception as e:
            logger.error(f"Error verifying token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Error verifying authentication token: {str(e)}"
            )

        # Get user email
        email = decoded_token.get("email")
        if not email:
            try:
                user = auth.get_user(decoded_token.get("uid"), app=firebase_app)
                email = user.email
            except Exception as e:
                logger.error(f"Error getting user details: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User email not found"
                )

        if not email:
            logger.error("Email not found in token or user details")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User email not found"
            )

        return email
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error authenticating request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing authentication"
        )