"""
Rubric Management Router

Endpoints:
- POST /                 â€” Create a new rubric (admin)
- GET  /{event_id}       â€” Get rubric for an event
- PUT  /{rubric_id}      â€” Update a rubric
- DELETE /{rubric_id}    â€” Delete a rubric
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.firebase_config import get_firestore_client
from app.middleware import require_role
from app.models import RubricCreate, RubricResponse

logger = logging.getLogger("ems.set_c.rubrics")
router = APIRouter()


def _validate_weights(criteria: list) -> float:
    """Validate that rubric criteria weights sum to 100."""
    total = sum(c.weight for c in criteria)
    if abs(total - 100.0) > 0.01:
        raise HTTPException(
            status_code=422,
            detail=f"Criteria weights must sum to 100%. Current total: {total}%"
        )
    return total


@router.post("/", response_model=RubricResponse)
async def create_rubric(
    body: RubricCreate,
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """Create a new scoring rubric for an event."""
    total = _validate_weights(body.criteria)
    db = get_firestore_client()

    now = datetime.now(timezone.utc).isoformat()
    rubric_data = {
        "event_id": body.event_id,
        "name": body.name,
        "criteria": [c.model_dump() for c in body.criteria],
        "round": body.round.value,
        "total_weight": total,
        "created_at": now,
        "updated_at": now,
        "created_by": admin.get("uid", "unknown"),
    }

    doc_ref = db.collection("rubrics").document()
    doc_ref.set(rubric_data)

    logger.info(f"Rubric created: {body.name} for event {body.event_id}")
    return RubricResponse(rubric_id=doc_ref.id, **rubric_data)


@router.get("/{event_id}", response_model=list[RubricResponse])
async def get_rubrics(
    event_id: str,
    user: dict = Depends(require_role("admin", "super_admin", "judge")),
):
    """Get all rubrics for an event."""
    db = get_firestore_client()
    docs = db.collection("rubrics").where("event_id", "==", event_id).get()

    rubrics = []
    for doc in docs:
        data = doc.to_dict()
        data["rubric_id"] = doc.id
        rubrics.append(RubricResponse(**data))

    return rubrics


@router.put("/{rubric_id}", response_model=RubricResponse)
async def update_rubric(
    rubric_id: str,
    body: RubricCreate,
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """Update an existing rubric."""
    total = _validate_weights(body.criteria)
    db = get_firestore_client()

    doc_ref = db.collection("rubrics").document(rubric_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Rubric not found")

    updates = {
        "name": body.name,
        "criteria": [c.model_dump() for c in body.criteria],
        "round": body.round.value,
        "total_weight": total,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    doc_ref.update(updates)

    updated = doc_ref.get().to_dict()
    updated["rubric_id"] = rubric_id
    logger.info(f"Rubric {rubric_id} updated")
    return RubricResponse(**updated)


@router.delete("/{rubric_id}")
async def delete_rubric(
    rubric_id: str,
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """Delete a rubric."""
    db = get_firestore_client()
    doc = db.collection("rubrics").document(rubric_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Rubric not found")

    db.collection("rubrics").document(rubric_id).delete()
    logger.info(f"Rubric {rubric_id} deleted")
    return {"message": "Rubric deleted", "rubric_id": rubric_id}
