
import firebase_admin
from firebase_admin import credentials, firestore
import os

# Set search path for the key
key_path = "serviceAccountKey.json"

if not os.path.exists(key_path):
    print(f"Key not found at {key_path}")
    exit(1)

cred = credentials.Certificate(key_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Check for user aditya
users = db.collection("users").stream()
found = False
for user in users:
    data = user.to_dict()
    if "aditya" in data.get("display_name", "").lower() or "aditya" in data.get("email", "").lower():
        print(f"User: {data.get('display_name')} | Email: {data.get('email')} | Role: '{data.get('role')}' | State: {data.get('registration_status')}")
        found = True

if not found:
    print("User Aditya not found in Firestore.")
