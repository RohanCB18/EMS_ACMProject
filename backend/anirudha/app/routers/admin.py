from fastapi import APIRouter, Depends, HTTPException
from ..models import UserRoleUpdate, UserRole
from ..middleware import role_required
from ..firebase_config import get_firestore_client

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.patch("/roles")
async def update_user_role(
    update: UserRoleUpdate,
    current_user: dict = Depends(role_required([UserRole.SUPER_ADMIN]))
):
    """Update a user's role (Super Admin only)."""
    db = get_firestore_client()
    user_ref = db.collection("users").document(update.uid)
    if not user_ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_ref.update({"role": update.new_role.value})
    return {"message": f"User role updated to {update.new_role.value}"}

@router.get("/users")
async def list_users_with_roles(
    current_user: dict = Depends(role_required([UserRole.SUPER_ADMIN, UserRole.ORGANIZER]))
):
    """List all users with their current roles."""
    db = get_firestore_client()
    docs = db.collection("users").stream()
    return [{**doc.to_dict(), "uid": doc.id} for doc in docs]
