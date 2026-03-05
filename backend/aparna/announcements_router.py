"""
Announcements Router — Set B Backend

Endpoints:
  GET    /announcements              → list all (optional ?track= filter)
  POST   /announcements              → admin: create announcement
  DELETE /announcements/{id}         → admin: delete announcement
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from firebase_admin_config import get_db

router = APIRouter()


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def verify_admin_token(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")
    return authorization.split("Bearer ")[1]


def announcement_to_dict(doc) -> dict:
    data = doc.to_dict()
    data["id"] = doc.id
    # Convert Firestore Timestamp → ISO string for JSON serialization
    if "timestamp" in data and hasattr(data["timestamp"], "isoformat"):
        data["timestamp"] = data["timestamp"].isoformat()
    return data


# ──────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────

VALID_TRACKS = {"all", "AI", "Web", "Blockchain", "Open Innovation"}


class AnnouncementCreate(BaseModel):
    title: str
    body: str
    targetTrack: str = "all"


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("/")
def get_announcements(track: Optional[str] = Query(None, description="Filter by track (e.g. AI, Web)")):
    """
    Return all announcements ordered by timestamp descending.
    If `track` is provided, return announcements where targetTrack is 'all' OR matches track.
    """
    try:
        db = get_db()
        # Fetch all and filter in Python (Firestore OR queries require composite index)
        docs = (
            db.collection("announcements")
            .order_by("timestamp", direction="DESCENDING")
            .stream()
        )
        results = [announcement_to_dict(d) for d in docs]

        if track:
            results = [
                a for a in results
                if a.get("targetTrack") in ("all", track)
            ]

        return results

    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch announcements: {str(e)}")


@router.post("/", status_code=201)
def create_announcement(
    payload: AnnouncementCreate,
    _token: str = Depends(verify_admin_token),
):
    """Admin only. Create a new announcement."""
    if payload.targetTrack not in VALID_TRACKS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid targetTrack. Must be one of: {', '.join(VALID_TRACKS)}",
        )
    try:
        db = get_db()
        from google.cloud.firestore_v1 import SERVER_TIMESTAMP
        doc_ref = db.collection("announcements").document()
        doc_ref.set({
            "title": payload.title,
            "body": payload.body,
            "targetTrack": payload.targetTrack,
            "timestamp": SERVER_TIMESTAMP,
        })
        # Re-fetch to get the server timestamp
        created = doc_ref.get()
        return announcement_to_dict(created)

    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create announcement: {str(e)}")


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    _token: str = Depends(verify_admin_token),
):
    """Admin only. Delete an announcement by ID."""
    try:
        db = get_db()
        ref = db.collection("announcements").document(announcement_id)
        if not ref.get().exists:
            raise HTTPException(status_code=404, detail="Announcement not found.")
        ref.delete()
        return {"message": f"Announcement '{announcement_id}' deleted successfully."}
    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete announcement: {str(e)}")
