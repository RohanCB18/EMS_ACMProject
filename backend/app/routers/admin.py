"""
Admin RBAC Router (Set D).

Provides user role management and user listing for admin panel.
"""

from fastapi import APIRouter, Depends, HTTPException
from ..models import UserRoleUpdate, UserRole
from ..middleware import role_required
from app.core.firebase_config import get_firestore_client

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.patch("/roles")
async def update_user_role(
    update: UserRoleUpdate,
    current_user: dict = Depends(role_required([UserRole.SUPER_ADMIN, UserRole.ORGANIZER, UserRole.ADMIN]))
):
    """Update a user's role (Super Admin / Organizer only)."""
    db = get_firestore_client()
    user_ref = db.collection("users").document(update.uid)
    if not user_ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")

    user_ref.update({"role": update.new_role.value})
    return {"message": f"User role updated to {update.new_role.value}"}


@router.get("/users")
async def list_users_with_roles(
    role: str = None,
    current_user: dict = Depends(role_required([UserRole.SUPER_ADMIN, UserRole.ORGANIZER, UserRole.ADMIN]))
):
    """List all users with their current roles with an optional role filter."""
    db = get_firestore_client()
    query = db.collection("users")
    if role:
        query = query.where("role", "==", role)
    docs = query.stream()
    return [{**doc.to_dict(), "uid": doc.id} for doc in docs]
