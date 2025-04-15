import os
import json
import base64
import logging
from typing import Optional
from fastapi import Request, HTTPException, status
from firebase_admin import auth, credentials, initialize_app
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(".vscode/.env")

try:
    firebase_credentials_base64 = os.getenv('FIREBASE_CREDENTIALS_BASE64')
    if not firebase_credentials_base64:
        raise ValueError("FIREBASE_CREDENTIALS_BASE64 environment variable is not set")
    
    decoded_json = base64.b64decode(firebase_credentials_base64).decode('utf-8')
    cred_dict = json.loads(decoded_json)
    cred = credentials.Certificate(cred_dict)
    
    firebase_app = initialize_app(cred)
except Exception as e:
    logger.error(f"Error initializing Firebase Admin SDK: {str(e)}")
    firebase_app = None

def get_token_from_request(request: Request) -> Optional[str]:
    """Extract the Firebase ID token from the Authorization header."""
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.replace("Bearer ", "")

def get_current_user_email(request: Request) -> str:
    """Authenticate the request using Firebase and return the user's email address."""
    try:
        if not firebase_app:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service not available"
            )

        token = get_token_from_request(request)
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No authentication token provided"
            )

        try:
            decoded_token = auth.verify_id_token(
                token,
                check_revoked=True,
                clock_skew_seconds=60,
                app=firebase_app
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Error verifying authentication token: {str(e)}"
            )

        email = decoded_token.get("email")
        if not email:
            try:
                user = auth.get_user(decoded_token.get("uid"), app=firebase_app)
                email = user.email
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User email not found"
                )

        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User email not found"
            )

        return email
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing authentication"
        )