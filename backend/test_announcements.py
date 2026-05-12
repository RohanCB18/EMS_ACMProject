"""
Test script to verify announcements functionality.

This script tests:
1. Creating an announcement
2. Retrieving all announcements
3. Deleting an announcement
4. Verifying Firestore persistence
"""

import os
import sys
import json
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

load_dotenv()

from app.core.firebase_config import get_firestore_client
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

def test_announcements():
    """Test the announcements functionality"""
    print("\n" + "="*60)
    print("ANNOUNCEMENTS TEST SUITE")
    print("="*60)
    
    db = get_firestore_client()
    print(f"\n✓ Firebase initialized successfully")
    
    # Test 1: Create an announcement
    print("\n[TEST 1] Creating a test announcement...")
    try:
        announcement_data = {
            "title": "Test Announcement - " + str(os.urandom(4).hex()),
            "body": "This is a test announcement to verify the feature is working.",
            "targetTrack": "all",
            "timestamp": SERVER_TIMESTAMP,
        }
        doc_ref = db.collection("announcements").document()
        doc_ref.set(announcement_data)
        print(f"✓ Announcement created with ID: {doc_ref.id}")
        test_announcement_id = doc_ref.id
    except Exception as e:
        print(f"✗ Failed to create announcement: {e}")
        return False
    
    # Test 2: Retrieve the announcement
    print("\n[TEST 2] Retrieving the announcement...")
    try:
        created_doc = doc_ref.get()
        if created_doc.exists:
            data = created_doc.to_dict()
            print(f"✓ Announcement retrieved successfully")
            print(f"  - Title: {data.get('title')}")
            print(f"  - Body: {data.get('body')}")
            print(f"  - Target Track: {data.get('targetTrack')}")
            print(f"  - Timestamp: {data.get('timestamp')}")
        else:
            print(f"✗ Announcement not found after creation")
            return False
    except Exception as e:
        print(f"✗ Failed to retrieve announcement: {e}")
        return False
    
    # Test 3: List all announcements
    print("\n[TEST 3] Listing all announcements...")
    try:
        docs = (
            db.collection("announcements")
            .order_by("timestamp", direction="DESCENDING")
            .limit(10)
            .stream()
        )
        announcement_list = []
        for doc in docs:
            announcement_list.append({
                'id': doc.id,
                'title': doc.get('title'),
                'targetTrack': doc.get('targetTrack')
            })
        print(f"✓ Retrieved {len(announcement_list)} announcements from Firestore")
        for i, ann in enumerate(announcement_list, 1):
            print(f"  {i}. {ann['title']} (Track: {ann['targetTrack']})")
    except Exception as e:
        print(f"✗ Failed to list announcements: {e}")
        return False
    
    # Test 4: Verify filtering by track
    print("\n[TEST 4] Testing track filtering...")
    try:
        docs = (
            db.collection("announcements")
            .where("targetTrack", "in", ["all", "AI"])
            .limit(5)
            .stream()
        )
        count = sum(1 for _ in docs)
        print(f"✓ Found {count} announcements matching track filter")
    except Exception as e:
        print(f"✗ Failed to filter by track: {e}")
        return False
    
    # Test 5: Delete the test announcement
    print("\n[TEST 5] Deleting the test announcement...")
    try:
        db.collection("announcements").document(test_announcement_id).delete()
        # Verify deletion
        deleted_doc = db.collection("announcements").document(test_announcement_id).get()
        if not deleted_doc.exists:
            print(f"✓ Announcement deleted successfully")
        else:
            print(f"✗ Announcement still exists after deletion")
            return False
    except Exception as e:
        print(f"✗ Failed to delete announcement: {e}")
        return False
    
    print("\n" + "="*60)
    print("ALL TESTS PASSED ✓")
    print("="*60 + "\n")
    return True

if __name__ == "__main__":
    try:
        success = test_announcements()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Test suite failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
