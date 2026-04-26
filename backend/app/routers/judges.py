"""
Judge Onboarding & Management Router

Endpoints:
- POST   /invite        — Admin invites a judge by email
- GET    /               — List all judges
- GET    /{judge_id}     — Get judge profile
- PUT    /{judge_id}     — Update judge expertise tags
- PUT    /{judge_id}/coi — Flag conflict of interest
- DELETE /{judge_id}     — Remove a judge
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.core.firebase_config import get_firestore_client
from app.core.kafka_cache import get_kafka_cache
from app.middleware import get_current_user, require_role
from app.models import JudgeInvite, JudgeProfileUpdate, JudgeCoiFlag, JudgeResponse
from app.routers.automation import send_smtp_email

logger = logging.getLogger("ems.set_c.judges")
router = APIRouter()


def _build_judge_invite_email(judge_name: str, expertise_tags: list[str], organization: str | None) -> str:
    """Build a professional HTML email for judge invitation."""
    tags_html = ""
    if expertise_tags:
        tags_html = "".join(
            f'<span style="display:inline-block;background:#e0e7ff;color:#3730a3;'
            f'padding:4px 12px;border-radius:20px;font-size:13px;margin:2px 4px;">{tag}</span>'
            for tag in expertise_tags
        )

    org_line = ""
    if organization:
        org_line = f'<p style="color:#64748b;font-size:14px;">Organization: <strong>{organization}</strong></p>'

    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px 24px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">⚖️ You're Invited to Judge!</h1>
            <p style="color:#dbeafe;margin:8px 0 0;font-size:15px;">HackOdyssey 2026 Global Hackathon</p>
        </div>

        <!-- Body -->
        <div style="padding:32px 24px;">
            <p style="color:#1e293b;font-size:16px;line-height:1.6;">
                Dear <strong>{judge_name}</strong>,
            </p>
            <p style="color:#475569;font-size:15px;line-height:1.6;">
                We are thrilled to invite you to serve as a <strong>Judge</strong> at
                <strong>HackOdyssey 2026</strong>. Your expertise is invaluable to us and we look
                forward to your participation in evaluating the innovative projects from our talented teams.
            </p>

            {org_line}

            <!-- Expertise Tags -->
            <div style="margin:20px 0;">
                <p style="color:#1e293b;font-size:14px;font-weight:600;margin-bottom:8px;">Your Expertise Areas:</p>
                <div>{tags_html if tags_html else '<span style="color:#94a3b8;font-size:13px;">No specific tags assigned yet</span>'}</div>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin:32px 0;">
                <a href="http://localhost:3000/dashboard/judge"
                   style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#ffffff;
                          text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;
                          box-shadow:0 4px 14px rgba(59,130,246,0.4);">
                    Access Judge Dashboard →
                </a>
            </div>

            <p style="color:#475569;font-size:14px;line-height:1.6;">
                Please log in using your email address (<strong>{judge_name}</strong>'s registered email) to access your
                judging assignments, scoring rubrics, and evaluation forms.
            </p>

            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">

            <p style="color:#94a3b8;font-size:12px;text-align:center;">
                This is an automated invitation from the HackOdyssey Event Management System.<br>
                If you received this in error, please disregard this email.
            </p>
        </div>
    </div>
    """


@router.post("/invite", response_model=JudgeResponse)
async def invite_judge(
    body: JudgeInvite,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """Invite a new judge by email. Creates a judge profile in Firestore and sends an invitation email."""
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

    # Send invitation email in the background (same pattern as certificate blasting)
    email_body = _build_judge_invite_email(body.name, body.expertise_tags, body.organization)
    background_tasks.add_task(
        send_smtp_email,
        [body.email],
        "🎓 You're Invited to Judge at HackOdyssey 2026!",
        email_body,
    )

    logger.info(f"Judge invited: {body.email} by admin {admin.get('uid')} — invitation email queued")

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
