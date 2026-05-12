"""
Firebase Admin SDK initializer for Set B backend.

Lazily initializes the Firebase Admin app using a service account key.
Place your Firebase service account JSON at:
    backend/aparna/serviceAccountKey.json
DO NOT commit this file to version control.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore

_db = None


def get_db():
    """Return the Firestore client, initializing Firebase if not already done."""
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        if not os.path.exists(key_path):
            raise FileNotFoundError(
                f"serviceAccountKey.json not found at {key_path}. "
                "Download it from Firebase Console → Project Settings → Service Accounts."
            )
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)

    _db = firestore.client()
    return _db
