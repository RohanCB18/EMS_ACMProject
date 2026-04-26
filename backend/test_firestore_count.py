import sys
import os

# Ensure the app can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.firebase_config import get_firestore_client
db = get_firestore_client()
try:
    print("total_users:", db.collection("users").count().get()[0][0].value)
    print("total_teams:", db.collection("teams").count().get()[0][0].value)
    print("tickets:", db.collection("tickets").where("status", "==", "resolved").count().get()[0][0].value)
    print("present_count:", db.collection("attendance").where("status", "==", "present").count().get()[0][0].value)
except Exception as e:
    import traceback
    traceback.print_exc()
