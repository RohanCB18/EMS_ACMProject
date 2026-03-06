from fastapi import APIRouter, Depends
from ..models import AnalyticsOverview, UserRole
from ..middleware import role_required
from ..firebase_config import get_firestore_client

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview_stats(
    current_user: dict = Depends(role_required([UserRole.SUPER_ADMIN, UserRole.ORGANIZER]))
):
    """Get aggregated statistics for the admin dashboard."""
    db = get_firestore_client()
    
    # In a real app, these would be cached or more efficient queries
    users_docs = db.collection("users").stream()
    total_users = sum(1 for _ in users_docs)
    
    teams_docs = db.collection("teams").stream()
    total_teams = sum(1 for _ in teams_docs)
    
    tickets_docs = db.collection("tickets").where("status", "==", "resolved").stream()
    total_resolved_tickets = sum(1 for _ in tickets_docs)
    
    # Mock data for complex metrics
    overview = AnalyticsOverview(
        total_registrations=total_users,
        teams_formed=total_teams,
        attendance_rate=85.5,  # Mock
        tickets_resolved=total_resolved_tickets,
        top_tracks=[
            {"name": "AI/ML", "count": 25},
            {"name": "Web3", "count": 15},
            {"name": "Fintech", "count": 10}
        ]
    )
    
    return overview
