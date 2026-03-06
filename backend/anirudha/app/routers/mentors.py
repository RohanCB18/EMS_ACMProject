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
    """Book a mentor slot for a team using a transaction."""
    db = get_firestore_client()
    mentor_ref = db.collection("mentors").document(request.mentor_uid)
    
    @db.transactional
    def update_in_transaction(transaction, mentor_ref, request):
        snapshot = mentor_ref.get(transaction=transaction)
        if not snapshot.exists:
            raise HTTPException(status_code=404, detail="Mentor not found")
        
        mentor_data = snapshot.to_dict()
        slots = mentor_data.get("availability", [])
        
        if request.slot_index >= len(slots):
            raise HTTPException(status_code=400, detail="Invalid slot index")
        
        if slots[request.slot_index].get("booked"):
            raise HTTPException(status_code=400, detail="Slot already booked")
        
        # Update slot
        slots[request.slot_index]["booked"] = True
        slots[request.slot_index]["booked_by_team_id"] = request.team_id
        
        transaction.update(mentor_ref, {"availability": slots})
        
        # Record in session history
        session_ref = db.collection("mentor_sessions").document()
        session_data = {
            "mentor_uid": request.mentor_uid,
            "team_id": request.team_id,
            "slot": slots[request.slot_index],
            "timestamp": datetime.utcnow().isoformat()
        }
        transaction.set(session_ref, session_data)
        
        return {"message": "Slot booked successfully"}

    try:
        transaction = db.transaction()
        result = update_in_transaction(transaction, mentor_ref, request)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
