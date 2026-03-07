from fastapi import APIRouter, Depends, HTTPException, Body
from ..models import AttendanceRecord, CheckInRequest, UserRole, AttendanceStatus
from ..middleware import role_required
from app.core.firebase_config import get_firestore_client
from datetime import datetime

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post("/check-in", response_model=AttendanceRecord)
async def check_in(
    request: CheckInRequest,
    current_user: dict = Depends(role_required([UserRole.VOLUNTEER, UserRole.ORGANIZER, UserRole.SUPER_ADMIN]))
):
    """Mark a participant as present for a specific phase."""
    db = get_firestore_client()
    uid = request.qr_data  # In a real app, decrypt/validate the QR data
    
    # Check if participant exists
    part_ref = db.collection("users").document(uid).get()
    if not part_ref.exists:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Check if attendance already marked
    att_ref = db.collection("attendance").document(f"{uid}_{request.phase_id}").get()
    if att_ref.exists:
        raise HTTPException(status_code=400, detail="Attendance already marked for this phase")

    new_record = AttendanceRecord(
        uid=uid,
        phase_id=request.phase_id,
        status=AttendanceStatus.PRESENT,
        recorded_by=current_user["uid"]
    )
    
    db.collection("attendance").document(f"{uid}_{request.phase_id}").set(new_record.dict())
    return new_record

@router.get("/stats/{phase_id}")
async def get_attendance_stats(
    phase_id: str,
    current_user: dict = Depends(role_required([UserRole.ORGANIZER, UserRole.SUPER_ADMIN]))
):
    """Get attendance statistics for a specific phase."""
    db = get_firestore_client()
    docs = db.collection("attendance").where("phase_id", "==", phase_id).stream()
    
    total_present = 0
    records = []
    for doc in docs:
        total_present += 1
        records.append(doc.to_dict())
    
    return {"phase_id": phase_id, "total_present": total_present, "records": records}
