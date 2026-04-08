"""
Judge Onboarding & Management Router

Endpoints:
- POST   /invite        â€” Admin invites a judge by email
- GET    /               â€” List all judges
- GET    /{judge_id}     â€” Get judge profile
- PUT    /{judge_id}     â€” Update judge expertise tags
- PUT    /{judge_id}/coi â€” Flag conflict of interest
- DELETE /{judge_id}     â€” Remove a judge
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.firebase_config import get_firestore_client
from app.core.kafka_cache import get_kafka_cache
from app.middleware import get_current_user, require_role
from app.models import JudgeInvite, JudgeProfileUpdate, JudgeCoiFlag, JudgeResponse

logger = logging.getLogger("ems.set_c.judges")
router = APIRouter()


@router.post("/invite", response_model=JudgeResponse)
async def invite_judge(
    body: JudgeInvite,
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """Invite a new judge by email. Creates a judge profile in Firestore."""
    db = get_firestore_client()

    # Check if judge already exists by email
    existing = db.collection("judges").where("email", "==", body.email).limit(1).get()
    if len(list(existing)) > 0:
        raise HTTPException(status_code=409, detail="Judge with this email already exists")

    now = datetime.now(timezone.utc).isoformat()
    judge_data = {
        "email": body.email,
        "name": body.name,
        "expertise_tags": body.expertise_tags,
        "organization": body.organization,
        "coi_flags": [],
        "assigned_count": 0,
        "reviewed_count": 0,
        "created_at": now,
        "invited_by": admin.get("uid", "unknown"),
    }

    doc_ref = db.collection("judges").document()
    doc_ref.set(judge_data)
    get_kafka_cache().invalidate_prefix("judges:")

    logger.info(f"Judge invited: {body.email} by admin {admin.get('uid')}")

    return JudgeResponse(judge_id=doc_ref.id, **judge_data)


@router.get("/", response_model=list[JudgeResponse])
async def list_judges(
    user: dict = Depends(require_role("admin", "super_admin", "judge")),
):
    """List all judges."""
    db = get_firestore_client()
    cache = get_kafka_cache()
    cache_key = "judges:all"

    def loader():
        docs = db.collection("judges").order_by("created_at").get()
        judges = []
        for doc in docs:
            data = doc.to_dict()
            data["judge_id"] = doc.id
            if "created_at" in data and hasattr(data["created_at"], "isoformat"):
                data["created_at"] = data["created_at"].isoformat()
            judges.append(JudgeResponse(**data))
        return judges

    return cache.get(cache_key, loader, ttl_secs=15)


@router.get("/{judge_id}", response_model=JudgeResponse)
async def get_judge(
    judge_id: str,
    user: dict = Depends(require_role("admin", "super_admin", "judge")),
):
    """Get a single judge profile."""
    db = get_firestore_client()
    doc = db.collection("judges").document(judge_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Judge not found")

    cache = get_kafka_cache()
    cache_key = f"judges:{judge_id}"

    def loader():
        data = doc.to_dict()
        data["judge_id"] = doc.id
        return JudgeResponse(**data)

    return cache.get(cache_key, loader, ttl_secs=15)


@router.put("/{judge_id}", response_model=JudgeResponse)
async def update_judge(
    judge_id: str,
    body: JudgeProfileUpdate,
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """Update judge profile (expertise tags, organization, name)."""
    db = get_firestore_client()
    doc_ref = db.collection("judges").document(judge_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Judge not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    doc_ref.update(updates)

    updated = doc_ref.get().to_dict()
    updated["judge_id"] = judge_id
    get_kafka_cache().invalidate_prefix("judges:")
    return JudgeResponse(**updated)


@router.put("/{judge_id}/coi")
async def flag_coi(
    judge_id: str,
    body: JudgeCoiFlag,
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """Flag a conflict of interest for a judge on a specific project."""
    db = get_firestore_client()
    doc_ref = db.collection("judges").document(judge_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Judge not found")

    data = doc.to_dict()
    coi_flags = data.get("coi_flags", [])
    coi_flags.append({
        "project_id": body.project_id,
        "reason": body.reason,
        "flagged_at": datetime.now(timezone.utc).isoformat(),
        "flagged_by": admin.get("uid", "unknown"),
    })
    doc_ref.update({"coi_flags": coi_flags})
    get_kafka_cache().invalidate_prefix("judges:")

    logger.info(f"COI flagged for judge {judge_id} on project {body.project_id}")
    return {"message": "Conflict of interest flagged", "judge_id": judge_id}


@router.delete("/{judge_id}")
async def remove_judge(
    judge_id: str,
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """Remove a judge profile."""
    db = get_firestore_client()
    doc = db.collection("judges").document(judge_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Judge not found")

    db.collection("judges").document(judge_id).delete()
    get_kafka_cache().invalidate_prefix("judges:")
    logger.info(f"Judge {judge_id} removed by admin {admin.get('uid')}")
    return {"message": "Judge removed", "judge_id": judge_id}
