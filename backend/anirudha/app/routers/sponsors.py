from fastapi import APIRouter, Depends, HTTPException
import uuid
from ..models import Track, Sponsor, UserRole
from ..middleware import role_required
from ..firebase_config import get_firestore_client

router = APIRouter(prefix="/sponsors", tags=["Sponsors"])

@router.post("/tracks", response_model=Track)
async def create_track(
    track: Track,
    current_user: dict = Depends(role_required([UserRole.SUPER_ADMIN, UserRole.ORGANIZER]))
):
    """Create a new track for the hackathon."""
    db = get_firestore_client()
    db.collection("tracks").document(track.track_id).set(track.dict())
    return track

@router.get("/tracks", response_model=list[Track])
async def list_tracks():
    """List all hackathon tracks."""
    db = get_firestore_client()
    docs = db.collection("tracks").stream()
    return [Track(**doc.to_dict()) for doc in docs]

@router.post("/", response_model=Sponsor)
async def add_sponsor(
    sponsor: Sponsor,
    current_user: dict = Depends(role_required([UserRole.SUPER_ADMIN, UserRole.ORGANIZER]))
):
    """Add a new sponsor."""
    db = get_firestore_client()
    if not sponsor.sponsor_id:
        sponsor.sponsor_id = str(uuid.uuid4())
    db.collection("sponsors").document(sponsor.sponsor_id).set(sponsor.dict())
    return sponsor

@router.get("/", response_model=list[Sponsor])
async def list_sponsors():
    """List all sponsors."""
    db = get_firestore_client()
    docs = db.collection("sponsors").stream()
    return [Sponsor(**doc.to_dict()) for doc in docs]
