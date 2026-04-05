"""
Firebase Admin SDK initialization module.

Initializes Firebase Admin with a service account key and provides
shared Firestore client and Auth verification utilities.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore, auth, storage
from dotenv import load_dotenv

load_dotenv()

_firebase_app = None
_firestore_client = None
_storage_bucket = None


def _initialize_firebase():
    """Initialize Firebase Admin SDK if not already initialized."""
    global _firebase_app, _firestore_client, _storage_bucket
    if _firebase_app is not None:
        if _storage_bucket is None:
            _storage_bucket = storage.bucket()
        return

    # Resolve path: env var → next to this file (backend/app/) → backend root
    _default_key_path = os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json")
    service_account_path = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_KEY", _default_key_path
    )
    service_account_path = os.path.normpath(service_account_path)

    if not os.path.exists(service_account_path):
        raise FileNotFoundError(
            f"Firebase service account key not found at: {service_account_path}\n"
            "Place 'serviceAccountKey.json' in backend/app/ or set the "
            "FIREBASE_SERVICE_ACCOUNT_KEY env var to the correct path."
        )

    cred = credentials.Certificate(service_account_path)
    storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET", "xxxx-1196c.firebasestorage.app")
    
    print(f"DEBUG: Initializing Firebase with storageBucket: {storage_bucket}")
    
    _firebase_app = firebase_admin.initialize_app(cred, {
        'storageBucket': storage_bucket
    })
    _firestore_client = firestore.client()
    try:
        _storage_bucket = storage.bucket()
        print(f"DEBUG: Successfully got storage bucket: {_storage_bucket.name}")
    except Exception as e:
        print(f"DEBUG: Failed to get default storage bucket: {e}")
        _storage_bucket = storage.bucket(storage_bucket) # Try specific


def get_firestore_client():
    """Get Firestore client, initializing Firebase if needed."""
    _initialize_firebase()
    return _firestore_client


def get_storage_bucket():
    """Get Firebase Storage bucket, initializing Firebase if needed."""
    global _storage_bucket
    _initialize_firebase()
    if _storage_bucket is None:
        _storage_bucket = storage.bucket()
    return _storage_bucket


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
