"""
Announcements Router — Set B Backend

Endpoints:
  GET    /api/announcements/          -> list all (optional ?track= filter)
  POST   /api/announcements/          -> admin: create announcement
  DELETE /api/announcements/{id}      -> admin: delete announcement
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel, Field
from typing import Optional
from app.core.firebase_config import get_firestore_client as get_db
from app.core.kafka_cache import get_kafka_cache

router = APIRouter()

# Valid audience tracks
VALID_TRACKS = {"all", "AI", "Web", "Blockchain", "Open Innovation"}


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def verify_admin_token(authorization: Optional[str] = Header(None)) -> str:
    """Bearer token gate — any valid Bearer token is accepted."""
    print(f"[Announcements] verify_admin_token() called with authorization header: {bool(authorization)}")
    if not authorization or not authorization.startswith("Bearer "):
        print("[Announcements] Missing or invalid Authorization header")
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")
    token = authorization.split("Bearer ")[1]
    print(f"[Announcements] Token verified: {token[:20]}...")
    return token


def announcement_to_dict(doc) -> dict:
    data = doc.to_dict()
    data["id"] = doc.id
    # Firestore Timestamps are serialized natively; convert if datetime
    if "timestamp" in data and hasattr(data["timestamp"], "isoformat"):
        data["timestamp"] = data["timestamp"].isoformat()
    return data


def load_all_announcements() -> list[dict]:
    print("[Announcements] load_all_announcements() called - fetching from Firestore")
    db = get_db()
    docs = (
        db.collection("announcements")
        .order_by("timestamp", direction="DESCENDING")
        .stream()
    )
    results = [announcement_to_dict(d) for d in docs]
    print(f"[Announcements] Loaded {len(results)} announcements from Firestore: {results}")
    return results


# ──────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────

class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Short headline")
    body: str = Field(..., min_length=1, description="Full announcement text")
    targetTrack: str = Field("all", description="'all' or a specific track name")


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("/")
def get_announcements(
    track: Optional[str] = Query(None, description="Filter by track (e.g. AI, Web)")
):
    """
    Return all announcements ordered newest-first.
    If `track` is provided, returns announcements targeting 'all' OR the given track.
    """
    print(f"[Announcements] Received GET request with track filter: {track}")
    try:
        cache = get_kafka_cache()
        results = cache.get("announcements:all", load_all_announcements, ttl_secs=20)
        print(f"[Announcements] Retrieved {len(results)} announcements from cache/db")

        if track:
            results = [
                a for a in results
                if a.get("targetTrack") in ("all", track)
            ]
            print(f"[Announcements] Filtered to {len(results)} announcements for track: {track}")

        return results

    except FileNotFoundError as e:
        print(f"[Announcements] FileNotFoundError: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"[Announcements] Exception during GET: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch announcements: {str(e)}")


@router.post("/", status_code=201)
def create_announcement(
    payload: AnnouncementCreate,
    _token: str = Depends(verify_admin_token),
):
    """Admin only. Create a new announcement for all or a specific track."""
    print(f"[Announcements] Received create request: {payload}")
    
    if payload.targetTrack not in VALID_TRACKS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid targetTrack. Must be one of: {', '.join(sorted(VALID_TRACKS))}",
        )
    try:
        db = get_db()
        from google.cloud.firestore_v1 import SERVER_TIMESTAMP
        doc_ref = db.collection("announcements").document()
        print(f"[Announcements] Saving to Firestore collection 'announcements' with doc_id: {doc_ref.id}")
        
        announcement_data = {
            "title": payload.title,
            "body": payload.body,
            "targetTrack": payload.targetTrack,
            "timestamp": SERVER_TIMESTAMP,
        }
        doc_ref.set(announcement_data)
        print(f"[Announcements] Successfully saved announcement to Firestore")
        
        created = doc_ref.get()
        result = announcement_to_dict(created)
        print(f"[Announcements] Returned announcement: {result}")
        
        get_kafka_cache().invalidate("announcements:all")
        return result

    except FileNotFoundError as e:
        print(f"[Announcements] FileNotFoundError: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"[Announcements] Exception during create: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create announcement: {str(e)}")


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    _token: str = Depends(verify_admin_token),
):
    """Admin only. Delete an announcement by its Firestore document ID."""
    print(f"[Announcements] Received DELETE request for announcement_id: {announcement_id}")
    try:
        db = get_db()
        ref = db.collection("announcements").document(announcement_id)
        doc = ref.get()
        
        if not doc.exists:
            print(f"[Announcements] Announcement not found: {announcement_id}")
            raise HTTPException(status_code=404, detail="Announcement not found.")
        
        print(f"[Announcements] Deleting announcement: {announcement_id}")
        ref.delete()
        print(f"[Announcements] Successfully deleted announcement: {announcement_id}")
        
        get_kafka_cache().invalidate("announcements:all")
        return {"message": f"Announcement '{announcement_id}' deleted successfully."}
    except HTTPException:
        raise
    except FileNotFoundError as e:
        print(f"[Announcements] FileNotFoundError: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"[Announcements] Exception during DELETE: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete announcement: {str(e)}")
