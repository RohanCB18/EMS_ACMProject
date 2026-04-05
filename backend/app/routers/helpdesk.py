from fastapi import APIRouter, Depends, HTTPException
from ..models import SupportTicket, TicketUpdate, UserRole, TicketStatus
from ..middleware import role_required, get_current_user
from app.core.firebase_config import get_firestore_client
from app.core.kafka_cache import get_kafka_cache
from datetime import datetime
import uuid

router = APIRouter(prefix="/helpdesk", tags=["Helpdesk"])

@router.post("/", response_model=SupportTicket)
async def create_ticket(
    ticket: SupportTicket,
    current_user: dict = Depends(get_current_user)
):
    """Raise a new helpdesk ticket."""
    db = get_firestore_client()
    ticket_id = str(uuid.uuid4())
    ticket.ticket_id = ticket_id
    ticket.raised_by_uid = current_user["uid"]
    
    db.collection("tickets").document(ticket_id).set(ticket.dict())
    get_kafka_cache().invalidate_prefix("helpdesk:tickets")
    return ticket

@router.get("/")
async def list_tickets(
    current_user: dict = Depends(get_current_user)
):
    """List tickets (participants see their own, admins/volunteers see all)."""
    db = get_firestore_client()
    cache = get_kafka_cache()
    role = current_user.get("role")
    cache_key = "helpdesk:tickets:all" if role in [UserRole.SUPER_ADMIN, UserRole.ORGANIZER, UserRole.VOLUNTEER] else f"helpdesk:tickets:user:{current_user['uid']}"

    def loader():
        if role in [UserRole.SUPER_ADMIN, UserRole.ORGANIZER, UserRole.VOLUNTEER]:
            docs = db.collection("tickets").stream()
        else:
            docs = db.collection("tickets").where("raised_by_uid", "==", current_user["uid"]).stream()
        return [doc.to_dict() for doc in docs]

    return cache.get(cache_key, loader, ttl_secs=10)

@router.patch("/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    update: TicketUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update ticket status, priority, or assignment."""
    db = get_firestore_client()
    ticket_ref = db.collection("tickets").document(ticket_id)
    if not ticket_ref.get().exists:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    update_data = update.dict(exclude_none=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    # Logic sanity: if resolved, ensure it stays resolved or moves back properly
    ticket_ref.update(update_data)
    get_kafka_cache().invalidate_prefix("helpdesk:tickets")
    return {"message": "Ticket updated", "ticket_id": ticket_id}
