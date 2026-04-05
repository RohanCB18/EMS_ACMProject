"""
Scoring & Feedback Router

Endpoints:
- POST /                    â€” Submit scores for a project
- GET  /project/{project_id} â€” Get all scores for a project
- GET  /judge/{judge_id}     â€” Get all evaluations by a judge
- GET  /{score_id}           â€” Get a single evaluation
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.firebase_config import get_firestore_client
from app.core.kafka_cache import get_kafka_cache
from app.middleware import get_current_user, get_current_user_profile, require_role
from app.models import ScoreSubmit, ScoreResponse

logger = logging.getLogger("ems.set_c.scoring")
router = APIRouter()


def _calculate_weighted_total(criteria_scores: list, rubric_criteria: list) -> float:
    """Calculate the weighted total score based on rubric criteria."""
    criteria_map = {c["id"]: c for c in rubric_criteria}
    total = 0.0

    for cs in criteria_scores:
        criteria = criteria_map.get(cs.criteria_id)
        if criteria:
            max_score = criteria.get("max_score", 10)
            weight = criteria.get("weight", 0) / 100.0
            normalized = (cs.score / max_score) * 100
            total += normalized * weight

    return round(total, 2)


@router.post("/", response_model=ScoreResponse)
async def submit_score(
    body: ScoreSubmit,
    user: dict = Depends(require_role("judge")),
):
    """Submit an evaluation score for a project."""
    db = get_firestore_client()
    judge_id = user.get("uid")

    # Verify judge has this project allocated
    allocs = db.collection("allocations") \
        .where("judge_id", "==", judge_id) \
        .where("project_id", "==", body.project_id) \
        .where("round", "==", body.round.value) \
        .limit(1).get()

    alloc_list = list(allocs)
    if not alloc_list:
        # Also check by judge document ID (for admin-invited judges)
        judge_docs = db.collection("judges").where("email", "==", user.get("email", "")).limit(1).get()
        judge_doc_list = list(judge_docs)
        if judge_doc_list:
            judge_doc_id = judge_doc_list[0].id
            allocs2 = db.collection("allocations") \
                .where("judge_id", "==", judge_doc_id) \
                .where("project_id", "==", body.project_id) \
                .where("round", "==", body.round.value) \
                .limit(1).get()
            alloc_list = list(allocs2)
            if alloc_list:
                judge_id = judge_doc_id

    if not alloc_list:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to evaluate this project."
        )

    # Check for duplicate submission
    existing = db.collection("scores") \
        .where("judge_id", "==", judge_id) \
        .where("project_id", "==", body.project_id) \
        .where("round", "==", body.round.value) \
        .limit(1).get()

    if list(existing):
        raise HTTPException(
            status_code=409,
            detail="You have already submitted a score for this project in this round."
        )

    # Get rubric to calculate weighted total
    rubric_docs = db.collection("rubrics") \
        .where("event_id", "==", body.event_id) \
        .where("round", "==", body.round.value) \
        .limit(1).get()

    rubric_criteria = []
    for rd in rubric_docs:
        rubric_criteria = rd.to_dict().get("criteria", [])

    # Fallback to default rubric if none exists in DB
    if not rubric_criteria:
        rubric_criteria = [
            {"id": "innovation", "name": "Innovation", "weight": 25, "max_score": 10},
            {"id": "execution", "name": "Execution", "weight": 25, "max_score": 10},
            {"id": "presentation", "name": "Presentation", "weight": 25, "max_score": 10},
            {"id": "impact", "name": "Impact", "weight": 25, "max_score": 10},
        ]

    weighted_total = _calculate_weighted_total(body.criteria_scores, rubric_criteria)

    # Get project title
    project_doc = db.collection("projects").document(body.project_id).get()
    if project_doc.exists:
        project_title = project_doc.to_dict().get("title", "Untitled")
    else:
        # Fallback to teams collection
        team_doc = db.collection("teams").document(body.project_id).get()
        project_title = team_doc.to_dict().get("name", "Untitled Team") if team_doc.exists else "Untitled"

    now = datetime.now(timezone.utc).isoformat()
    score_data = {
        "judge_id": judge_id,
        "judge_name": user.get("display_name", user.get("name", "Judge")),
        "project_id": body.project_id,
        "project_title": project_title,
        "event_id": body.event_id,
        "round": body.round.value,
        "criteria_scores": [cs.model_dump() for cs in body.criteria_scores],
        "weighted_total": weighted_total,
        "overall_comment": body.overall_comment,
        "private_notes": body.private_notes,
        "submitted_at": now,
    }

    doc_ref = db.collection("scores").document()
    doc_ref.set(score_data)
    get_kafka_cache().invalidate_prefix("scores:")

    # Update allocation status to reviewed
    for alloc_doc in alloc_list:
        alloc_doc.reference.update({"status": "reviewed"})

    # Update judge reviewed_count
    judge_ref = db.collection("judges").document(judge_id)
    judge_doc = judge_ref.get()
    if judge_doc.exists:
        current_count = judge_doc.to_dict().get("reviewed_count", 0)
        judge_ref.update({"reviewed_count": current_count + 1})

    logger.info(f"Score submitted by judge {judge_id} for project {body.project_id}: {weighted_total}")

    return ScoreResponse(score_id=doc_ref.id, **score_data)


@router.get("/project/{project_id}", response_model=list[ScoreResponse])
async def get_project_scores(
    project_id: str,
    user: dict = Depends(require_role("admin", "super_admin")),
):
    """Get all scores for a specific project (admin only)."""
    db = get_firestore_client()
    cache = get_kafka_cache()
    cache_key = f"scores:project:{project_id}"

    def loader():
        docs = db.collection("scores").where("project_id", "==", project_id).get()
        scores = []
        for doc in docs:
            data = doc.to_dict()
            data["score_id"] = doc.id
            data["private_notes"] = None
            scores.append(ScoreResponse(**data))
        return scores

    return cache.get(cache_key, loader, ttl_secs=15)


@router.get("/judge/{judge_id}", response_model=list[ScoreResponse])
async def get_judge_scores(
    judge_id: str,
    user: dict = Depends(require_role("admin", "super_admin", "judge")),
):
    """Get all evaluations submitted by a specific judge."""
    db = get_firestore_client()
    cache = get_kafka_cache()
    cache_key = f"scores:judge:{judge_id}"

    def loader():
        docs = db.collection("scores").where("judge_id", "==", judge_id).get()
        scores = []
        for doc in docs:
            data = doc.to_dict()
            data["score_id"] = doc.id
            scores.append(ScoreResponse(**data))
        return scores

    return cache.get(cache_key, loader, ttl_secs=15)


@router.get("/{score_id}", response_model=ScoreResponse)
async def get_score(
    score_id: str,
    user: dict = Depends(require_role("admin", "super_admin", "judge")),
):
    """Get a single evaluation by ID."""
    db = get_firestore_client()
    cache = get_kafka_cache()
    cache_key = f"scores:score:{score_id}"

    def loader():
        doc = db.collection("scores").document(score_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Score not found")
        data = doc.to_dict()
        data["score_id"] = doc.id
        return ScoreResponse(**data)

    return cache.get(cache_key, loader, ttl_secs=20)
