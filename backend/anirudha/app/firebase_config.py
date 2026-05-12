import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv

load_dotenv()

_firebase_app = None
_firestore_client = None

def _initialize_firebase():
    global _firebase_app, _firestore_client
    if _firebase_app is not None:
        return

    # Look for service account key in the current folder or parent
    service_account_path = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_KEY", "../../serviceAccountKey.json"
    )

    if not os.path.exists(service_account_path):
        # Fallback for local development if not in parent
        service_account_path = "serviceAccountKey.json"

    if os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        _firebase_app = firebase_admin.initialize_app(cred)
        _firestore_client = firestore.client()
    else:
        print(f"Warning: Firebase service account key not found at {service_account_path}. Firestore will not work.")

def get_firestore_client():
    _initialize_firebase()
    return _firestore_client

def verify_token(id_token: str):
    _initialize_firebase()
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception:
        return None
