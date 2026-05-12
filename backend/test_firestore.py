
import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys

# Try to find the service account key
key_paths = [
    "serviceAccountKey.json",
    "../serviceAccountKey.json",
    "aditya/serviceAccountKey.json"
]

selected_key = None
for kp in key_paths:
    if os.path.exists(kp):
        selected_key = kp
        break

if not selected_key:
    print("Error: serviceAccountKey.json not found in expected locations.")
    sys.exit(1)

print(f"Using key: {selected_key}")
cred = credentials.Certificate(selected_key)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("Searching for users...")
users = db.collection("users").get()
for user in users:
    data = user.to_dict()
    name = data.get("display_name", "N/A")
    email = data.get("email", "N/A")
    role = data.get("role", "N/A")
    uid = user.id
    print(f"UID: {uid} | Name: {name} | Email: {email} | Role: '{role}'")

print("Done.")
