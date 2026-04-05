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
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")
    return authorization.split("Bearer ")[1]


def announcement_to_dict(doc) -> dict:
    data = doc.to_dict()
    data["id"] = doc.id
    # Firestore Timestamps are serialized natively; convert if datetime
    if "timestamp" in data and hasattr(data["timestamp"], "isoformat"):
        data["timestamp"] = data["timestamp"].isoformat()
    return data


def load_all_announcements() -> list[dict]:
    db = get_db()
    docs = (
        db.collection("announcements")
        .order_by("timestamp", direction="DESCENDING")
        .stream()
    )
    return [announcement_to_dict(d) for d in docs]


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
    try:
        cache = get_kafka_cache()
        results = cache.get("announcements:all", load_all_announcements, ttl_secs=20)

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
    """Admin only. Create a new announcement for all or a specific track."""
    if payload.targetTrack not in VALID_TRACKS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid targetTrack. Must be one of: {', '.join(sorted(VALID_TRACKS))}",
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
        created = doc_ref.get()
        get_kafka_cache().invalidate("announcements:all")
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
    """Admin only. Delete an announcement by its Firestore document ID."""
    try:
        db = get_db()
        ref = db.collection("announcements").document(announcement_id)
        if not ref.get().exists:
            raise HTTPException(status_code=404, detail="Announcement not found.")
        ref.delete()
        get_kafka_cache().invalidate("announcements:all")
        return {"message": f"Announcement '{announcement_id}' deleted successfully."}
    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete announcement: {str(e)}")
