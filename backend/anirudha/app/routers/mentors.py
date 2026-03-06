from fastapi import APIRouter, Depends, HTTPException
from ..models import MentorProfile, SlotBookingRequest, UserRole, MentorSlot
from ..middleware import role_required, get_current_user
from ..firebase_config import get_firestore_client
from datetime import datetime

router = APIRouter(prefix="/mentors", tags=["Mentors"])

@router.get("/", response_model=list[MentorProfile])
async def list_mentors():
    """List all available mentors and their profiles."""
    db = get_firestore_client()
    docs = db.collection("mentors").stream()
    return [MentorProfile(**doc.to_dict()) for doc in docs]

@router.post("/book")
async def book_slot(
    request: SlotBookingRequest,
    current_user: dict = Depends(get_current_user)
):
    """Book a mentor slot for a team."""
    db = get_firestore_client()
    mentor_ref = db.collection("mentors").document(request.mentor_uid)
    mentor_doc = mentor_ref.get()
    
    if not mentor_doc.exists:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    mentor_data = mentor_doc.to_dict()
    slots = mentor_data.get("availability", [])
    
    if request.slot_index >= len(slots):
        raise HTTPException(status_code=400, detail="Invalid slot index")
    
    if slots[request.slot_index].get("booked"):
        raise HTTPException(status_code=400, detail="Slot already booked")
    
    # Update slot
    slots[request.slot_index]["booked"] = True
    slots[request.slot_index]["booked_by_team_id"] = request.team_id
    
    mentor_ref.update({"availability": slots})
    
    # Record in session history
    session_data = {
        "mentor_uid": request.mentor_uid,
        "team_id": request.team_id,
        "slot": slots[request.slot_index],
        "timestamp": datetime.utcnow().isoformat()
    }
    db.collection("mentor_sessions").add(session_data)
    
    return {"message": "Slot booked successfully"}

@router.patch("/profile")
async def update_mentor_profile(
    profile: MentorProfile,
    current_user: dict = Depends(role_required([UserRole.MENTOR, UserRole.SUPER_ADMIN]))
):
    """Update mentor profile (only by the mentor or admin)."""
    if current_user["role"] != UserRole.SUPER_ADMIN and current_user["uid"] != profile.uid:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")
    
    db = get_firestore_client()
    db.collection("mentors").document(profile.uid).set(profile.dict(), merge=True)
    return {"message": "Profile updated"}
