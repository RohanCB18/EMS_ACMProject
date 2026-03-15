"""
Authentication API Router.

Handles Firebase token verification and user profile management in Firestore.
Robustness improvements: Uses reusable auth dependencies and strict Pydantic validation.
"""

from fastapi import APIRouter, HTTPException, Depends
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

from app.core.firebase_config import get_firestore_client
from app.models import UserProfileCreate, UserProfileResponse
from app.middleware import get_current_user, require_role

router = APIRouter()


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Endpoints
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/verify-token")
async def verify_token(user: dict = Depends(get_current_user)):
    """
    Verify a Firebase ID token sent from the frontend via the Authorization header.
    Returns the decoded user info and checks if a Firestore profile exists.
    """
    try:
        db = get_firestore_client()
        user_doc = db.collection("users").document(user["uid"]).get()

        profile = None
        if user_doc.exists:
            profile = user_doc.to_dict()

        return {
            "valid": True,
            "uid": user["uid"],
            "email": user.get("email"),
            "profile": profile,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")


@router.post("/create-profile", response_model=UserProfileResponse)
async def create_user_profile(
    profile: UserProfileCreate,
    user: dict = Depends(get_current_user)
):
    """
    Create or update a user profile in Firestore.
    Protected: Only the authenticated user can create/update their own profile.
    Enforces one-person-one-account by checking for existing email duplicates.
    """
    # Security: Ensure users can only modify their own profile
    if profile.uid != user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this profile")

    db = get_firestore_client()
    users_ref = db.collection("users")

    # Check for duplicate email (one-person-one-account enforcement)
    existing = users_ref.where("email", "==", profile.email).limit(1).get()
    for doc in existing:
        if doc.id != profile.uid:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists."
            )

    # Build profile document
    profile_data = {
        "uid": profile.uid,
        "email": profile.email,
        "display_name": profile.display_name,
        "role": profile.role.value,
        "institution": profile.institution,
        "phone": profile.phone,
        "team_id": None,
        "created_at": SERVER_TIMESTAMP,
    }

    # Set (create or overwrite) the user document
    users_ref.document(profile.uid).set(profile_data, merge=True)

    return UserProfileResponse(
        uid=profile.uid,
        email=profile.email,
        display_name=profile.display_name,
        role=profile.role,
        institution=profile.institution,
        phone=profile.phone,
        team_id=None,
    )


@router.get("/profile/{uid}", response_model=UserProfileResponse)
async def get_user_profile(uid: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieve a user profile from Firestore by UID.
    Protected: Any authenticated user can view basic profiles (e.g., for team info).
    """
    db = get_firestore_client()
    doc = db.collection("users").document(uid).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found")

    data = doc.to_dict()
    return UserProfileResponse(
        uid=data.get("uid", uid),
        email=data.get("email", ""),
        display_name=data.get("display_name", ""),
        role=data.get("role", "participant"),
        institution=data.get("institution"),
        phone=data.get("phone"),
        team_id=data.get("team_id"),
        created_at=str(data.get("created_at", "")),
    )


@router.put("/profile/{uid}/role")
async def update_user_role(
    uid: str, 
    role: str,
    admin_profile: dict = Depends(require_role("admin", "super_admin"))
):
    """
    Update a user's role. 
    Protected: Admin-only operation.
    """
    valid_roles = ["participant", "admin", "judge", "mentor", "volunteer"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    db = get_firestore_client()
    doc_ref = db.collection("users").document(uid)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found")

    doc_ref.update({"role": role})
    return {"message": f"Role updated to {role}", "uid": uid}
