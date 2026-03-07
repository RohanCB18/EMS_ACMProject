"""
Teams API Router.

Handles team creation, joining, leaving, invite codes, and deadline-based locking.
Robustness improvements:
- Firestore Transactions for join/leave to prevent capacity race conditions
- Auth dependencies to prevent spoofing
"""

import string
import random
from fastapi import APIRouter, HTTPException, Depends
from google.cloud import firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from datetime import datetime

from app.core.firebase_config import get_firestore_client
from app.models import (
    TeamCreate,
    TeamResponse,
    TeamJoinRequest,
    TeamLeaveRequest,
    TeamLockRequest,
)
from app.middleware import get_current_user_profile, require_role

router = APIRouter()


def _generate_invite_code(length: int = 6) -> str:
    """Generate a random alphanumeric invite code."""
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=length))


def _get_member_details(db, member_uids: list[str]) -> list[dict]:
    """Fetch display names and emails for a list of member UIDs."""
    details = []
    for uid in member_uids:
        user_doc = db.collection("users").document(uid).get()
        if user_doc.exists:
            data = user_doc.to_dict()
            details.append({
                "uid": uid,
                "display_name": data.get("display_name", "Unknown"),
                "email": data.get("email", ""),
                "role": data.get("role", "participant"),
            })
        else:
            details.append({"uid": uid, "display_name": "Unknown", "email": ""})
    return details


def _check_team_locked(team_data: dict):
    """Raise 403 if the team is locked or past the lock deadline."""
    if team_data.get("locked", False):
        raise HTTPException(status_code=403, detail="Team is locked and cannot be modified")

    lock_deadline = team_data.get("lock_deadline")
    if lock_deadline:
        if isinstance(lock_deadline, str):
            try:
                deadline_dt = datetime.fromisoformat(lock_deadline)
                if datetime.now() > deadline_dt:
                    raise HTTPException(
                        status_code=403,
                        detail="Team formation deadline has passed"
                    )
            except ValueError:
                pass
        elif hasattr(lock_deadline, 'timestamp'):
            if datetime.now().timestamp() > lock_deadline.timestamp():
                raise HTTPException(
                    status_code=403,
                    detail="Team formation deadline has passed"
                )


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Endpoints
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/create", response_model=TeamResponse)
async def create_team(
    team: TeamCreate,
    profile: dict = Depends(get_current_user_profile)
):
    """
    Create a new team. Protected by auth.
    """
    db = get_firestore_client()
    uid = profile["uid"]

    # Security: Ensure creator is the authenticated user
    if team.created_by != uid:
        raise HTTPException(status_code=403, detail="Cannot create team for another user")

    # Check if user is already in a team
    if profile.get("team_id"):
        raise HTTPException(
            status_code=409,
            detail="You are already in a team. Leave your current team first."
        )

    invite_code = _generate_invite_code()
    existing_codes = db.collection("teams").where("invite_code", "==", invite_code).limit(1).get()
    while len(list(existing_codes)):
        invite_code = _generate_invite_code()
        existing_codes = db.collection("teams").where("invite_code", "==", invite_code).limit(1).get()

    if team.min_size > team.max_size:
        raise HTTPException(status_code=400, detail="min_size cannot be greater than max_size")

    # Firestore Transaction to guarantee atomicity of team creation + user linking
    transaction = db.transaction()
    user_ref = db.collection("users").document(uid)
    team_ref = db.collection("teams").document()

    @firestore.transactional
    def create_in_transaction(transaction, user_ref, team_ref):
        # Double check user isn't in team (in case of race condition)
        user_snap = user_ref.get(transaction=transaction)
        if user_snap.get("team_id"):
            raise HTTPException(status_code=409, detail="Already in a team")

        team_data = {
            "name": team.name,
            "invite_code": invite_code,
            "track": team.track,
            "created_by": uid,
            "members": [uid],
            "looking_for": team.looking_for,
            "description": team.description,
            "max_size": team.max_size,
            "min_size": team.min_size,
            "institution_constraint": team.institution_constraint,
            "locked": False,
            "lock_deadline": None,
            "created_at": SERVER_TIMESTAMP,
        }

        transaction.set(team_ref, team_data)
        transaction.update(user_ref, {"team_id": team_ref.id})
        return team_ref.id

    team_id = create_in_transaction(transaction, user_ref, team_ref)

    return TeamResponse(
        team_id=team_id,
        name=team.name,
        invite_code=invite_code,
        track=team.track,
        created_by=uid,
        members=[uid],
        looking_for=team.looking_for,
        description=team.description,
        max_size=team.max_size,
        min_size=team.min_size,
    )


@router.post("/join", response_model=TeamResponse)
async def join_team(
    request: TeamJoinRequest,
    profile: dict = Depends(get_current_user_profile)
):
    """
    Join a team. Protected by auth and fully transactional to prevent
    exceeding maximum capacity in race conditions.
    """
    db = get_firestore_client()
    uid = profile["uid"]

    if request.uid != uid:
        raise HTTPException(status_code=403, detail="Cannot join team for another user")

    # Find team by invite code first (non-transactional read)
    teams_query = db.collection("teams").where("invite_code", "==", request.invite_code).limit(1).get()
    teams_list = list(teams_query)

    if not teams_list:
        raise HTTPException(status_code=404, detail="Invalid invite code. No team found.")

    team_id = teams_list[0].id
    user_ref = db.collection("users").document(uid)
    team_ref = db.collection("teams").document(team_id)
    transaction = db.transaction()

    @firestore.transactional
    def join_in_transaction(transaction, user_ref, team_ref):
        user_snap = user_ref.get(transaction=transaction)
        team_snap = team_ref.get(transaction=transaction)

        if not team_snap.exists:
            raise HTTPException(status_code=404, detail="Team not found")

        team_data = team_snap.to_dict()
        _check_team_locked(team_data)

        if user_snap.get("team_id"):
            raise HTTPException(status_code=409, detail="You are already in a team.")

        members = team_data.get("members", [])
        if uid in members:
            raise HTTPException(status_code=409, detail="You are already a member of this team")

        max_size = team_data.get("max_size", 4)
        if len(members) >= max_size:
            raise HTTPException(status_code=403, detail=f"Team is full ({max_size}/{max_size} members)")

        # Check institution constraint
        institution_constraint = team_data.get("institution_constraint")
        if institution_constraint:
            user_institution = user_snap.to_dict().get("institution", "")
            if institution_constraint == "same":
                creator_doc = db.collection("users").document(team_data["created_by"]).get()
                creator_institution = creator_doc.to_dict().get("institution", "") if creator_doc.exists else ""
                if user_institution and creator_institution and user_institution != creator_institution:
                    raise HTTPException(status_code=403, detail="Requires all members to be from same institution")
            elif institution_constraint == "different":
                # Ensure no overlap
                for member_uid in members:
                    m_doc = db.collection("users").document(member_uid).get()
                    m_inst = m_doc.to_dict().get("institution", "") if m_doc.exists else ""
                    if user_institution and m_inst and user_institution == m_inst:
                        raise HTTPException(status_code=403, detail="Requires all members to be from different institutions")

        members.append(uid)
        transaction.update(team_ref, {"members": members})
        transaction.update(user_ref, {"team_id": team_id})
        
        return team_data, members

    team_data, updated_members = join_in_transaction(transaction, user_ref, team_ref)
    member_details = _get_member_details(db, updated_members)

    return TeamResponse(
        team_id=team_id,
        name=team_data["name"],
        invite_code=team_data["invite_code"],
        track=team_data["track"],
        created_by=team_data["created_by"],
        members=updated_members,
        member_details=member_details,
        looking_for=team_data.get("looking_for"),
        description=team_data.get("description"),
        max_size=team_data.get("max_size", 4),
        min_size=team_data.get("min_size", 2),
        locked=team_data.get("locked", False),
    )


@router.post("/leave")
async def leave_team(
    request: TeamLeaveRequest,
    profile: dict = Depends(get_current_user_profile)
):
    """
    Leave a team. Transactional to handle leadership transfer properly.
    """
    db = get_firestore_client()
    uid = profile["uid"]

    if request.uid != uid:
        raise HTTPException(status_code=403, detail="Cannot manipulate another user's team status")

    user_ref = db.collection("users").document(uid)
    team_ref = db.collection("teams").document(request.team_id)
    transaction = db.transaction()

    @firestore.transactional
    def leave_in_transaction(transaction, user_ref, team_ref):
        team_snap = team_ref.get(transaction=transaction)
        
        if not team_snap.exists:
            raise HTTPException(status_code=404, detail="Team not found")

        team_data = team_snap.to_dict()
        _check_team_locked(team_data)

        members = team_data.get("members", [])
        if uid not in members:
            raise HTTPException(status_code=404, detail="You are not a member of this team")

        # Create new list reference to update
        new_members = list(members)
        new_members.remove(uid)

        if len(new_members) == 0:
            transaction.delete(team_ref)
        else:
            update_data = {"members": new_members}
            if team_data.get("created_by") == uid:
                update_data["created_by"] = new_members[0]
            transaction.update(team_ref, update_data)

        transaction.update(user_ref, {"team_id": None})

    leave_in_transaction(transaction, user_ref, team_ref)
    return {"message": "Successfully left the team"}


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(team_id: str, _: dict = Depends(get_current_user_profile)):
    """Get team details (Protected)."""
    db = get_firestore_client()
    doc = db.collection("teams").document(team_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Team not found")

    data = doc.to_dict()
    members = data.get("members", [])
    member_details = _get_member_details(db, members)

    return TeamResponse(
        team_id=team_id,
        name=data["name"],
        invite_code=data["invite_code"],
        track=data["track"],
        created_by=data["created_by"],
        members=members,
        member_details=member_details,
        looking_for=data.get("looking_for"),
        description=data.get("description"),
        max_size=data.get("max_size", 4),
        min_size=data.get("min_size", 2),
        locked=data.get("locked", False),
        lock_deadline=str(data.get("lock_deadline", "")) if data.get("lock_deadline") else None,
        created_at=str(data.get("created_at", "")),
    )


@router.get("/my-team/{uid}")
async def get_my_team(uid: str, profile: dict = Depends(get_current_user_profile)):
    """Get the user's current team (Protected)."""
    if uid != profile["uid"]:
        raise HTTPException(status_code=403, detail="Cannot access another user's team")

    team_id = profile.get("team_id")
    if not team_id:
        return {"team": None, "message": "User is not in any team"}

    db = get_firestore_client()
    team_doc = db.collection("teams").document(team_id).get()
    
    if not team_doc.exists:
        # Team was deleted â€” clean up stale reference
        db.collection("users").document(uid).update({"team_id": None})
        return {"team": None, "message": "User is not in any team"}

    data = team_doc.to_dict()
    members = data.get("members", [])
    member_details = _get_member_details(db, members)

    return {
        "team": {
            "team_id": team_id,
            "name": data["name"],
            "invite_code": data["invite_code"],
            "track": data["track"],
            "created_by": data["created_by"],
            "members": members,
            "member_details": member_details,
            "looking_for": data.get("looking_for"),
            "description": data.get("description"),
            "max_size": data.get("max_size", 4),
            "min_size": data.get("min_size", 2),
            "locked": data.get("locked", False),
        }
    }


@router.put("/lock/{team_id}")
async def lock_team(
    team_id: str, 
    request: TeamLockRequest,
    admin_profile: dict = Depends(require_role("admin", "super_admin"))
):
    """Lock a team (Admin only)."""
    db = get_firestore_client()
    team_ref = db.collection("teams").document(team_id)
    doc = team_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Team not found")

    update_data = {"locked": True}
    if request.lock_deadline:
        update_data["lock_deadline"] = request.lock_deadline

    team_ref.update(update_data)
    return {"message": "Team has been locked", "team_id": team_id}


@router.put("/unlock/{team_id}")
async def unlock_team(
    team_id: str,
    admin_profile: dict = Depends(require_role("admin", "super_admin"))
):
    """Unlock a team (Admin only)."""
    db = get_firestore_client()
    team_ref = db.collection("teams").document(team_id)
    doc = team_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Team not found")

    team_ref.update({"locked": False, "lock_deadline": None})
    return {"message": "Team has been unlocked", "team_id": team_id}


@router.get("/browse/open")
async def browse_open_teams(_: dict = Depends(get_current_user_profile)):
    """Browse open teams (Protected)."""
    db = get_firestore_client()
    teams = db.collection("teams").where("locked", "==", False).get()

    open_teams = []
    for doc in teams:
        data = doc.to_dict()
        members = data.get("members", [])
        max_size = data.get("max_size", 4)

        if len(members) < max_size:
            member_details = _get_member_details(db, members)
            open_teams.append({
                "team_id": doc.id,
                "name": data["name"],
                "track": data.get("track", ""),
                "members_count": len(members),
                "max_size": max_size,
                "member_details": member_details,
                "looking_for": data.get("looking_for"),
                "description": data.get("description"),
                "created_at": str(data.get("created_at", "")),
            })

    return {"teams": open_teams, "count": len(open_teams)}
