"""
Authentication middleware and dependency injection.

Provides reusable FastAPI dependencies for:
- Token verification from Authorization header
- Role-based access control (admin-only, specific roles)
- Current user injection into endpoint functions
"""

from fastapi import Depends, HTTPException, Header, Request
from typing import Optional
from functools import wraps

from app.firebase_config import verify_firebase_token, get_firestore_client


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    FastAPI dependency: Extract and verify Firebase ID token from Authorization header.

    Usage:
        @router.get("/protected")
        async def protected_endpoint(user: dict = Depends(get_current_user)):
            print(user["uid"])

    Returns decoded token with: uid, email, email_verified, etc.
    Raises 401 if token is missing, malformed, or expired.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header must start with 'Bearer '",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization[7:]  # Strip "Bearer " prefix
    if not token or len(token) < 10:
        raise HTTPException(
            status_code=401,
            detail="Invalid or empty token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        decoded = verify_firebase_token(token)
        return decoded
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_profile(user: dict = Depends(get_current_user)) -> dict:
    """
    FastAPI dependency: Get the full Firestore profile for the authenticated user.

    Returns dict with uid, email, display_name, role, team_id, etc.
    Raises 404 if user profile doesn't exist in Firestore.
    """
    db = get_firestore_client()
    doc = db.collection("users").document(user["uid"]).get()

    if not doc.exists:
        raise HTTPException(
            status_code=404,
            detail="User profile not found. Please complete registration first.",
        )

    profile = doc.to_dict()
    profile["uid"] = user["uid"]
    return profile


def require_role(*allowed_roles: str):
    """
    FastAPI dependency factory: Restrict access to specific roles.

    Usage:
        @router.put("/admin-action")
        async def admin_only(profile: dict = Depends(require_role("admin", "super_admin"))):
            ...
    """
    async def _role_checker(profile: dict = Depends(get_current_user_profile)) -> dict:
        user_role = profile.get("role", "participant")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required role: {', '.join(allowed_roles)}. Your role: {user_role}",
            )
        return profile
    return _role_checker
