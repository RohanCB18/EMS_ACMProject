"""
Firebase Admin SDK initialization module.

Initializes Firebase Admin with a service account key and provides
shared Firestore client and Auth verification utilities.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv

load_dotenv()

_firebase_app = None
_firestore_client = None


def _initialize_firebase():
    """Initialize Firebase Admin SDK if not already initialized."""
    global _firebase_app, _firestore_client
    if _firebase_app is not None:
        return

    service_account_path = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_KEY", "serviceAccountKey.json"
    )

    if not os.path.exists(service_account_path):
        raise FileNotFoundError(
            f"Firebase service account key not found at: {service_account_path}\n"
            "Download it from Firebase Console > Project Settings > Service Accounts > "
            "Generate New Private Key, and save it as 'serviceAccountKey.json' in backend/judging/"
        )

    cred = credentials.Certificate(service_account_path)
    _firebase_app = firebase_admin.initialize_app(cred)
    _firestore_client = firestore.client()


def get_firestore_client():
    """Get Firestore client, initializing Firebase if needed."""
    _initialize_firebase()
    return _firestore_client


def verify_firebase_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return the decoded token claims.

    Args:
        id_token: The Firebase ID token string from the client.

    Returns:
        dict with uid, email, and other claims.

    Raises:
        auth.InvalidIdTokenError: If the token is invalid or expired.
    """
    _initialize_firebase()
    decoded_token = auth.verify_id_token(id_token)
    return decoded_token


def get_user_by_uid(uid: str):
    """
    Retrieve Firebase Auth user record by UID.

    Args:
        uid: The Firebase user UID.

    Returns:
        firebase_admin.auth.UserRecord
    """
    _initialize_firebase()
    return auth.get_user(uid)
