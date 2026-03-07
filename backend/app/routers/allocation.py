"""
Smart Project Allocation Router

Endpoints:
- POST /auto              â€” Auto-assign projects to judges
- PUT  /{allocation_id}   â€” Manual override (assign/remove)
- GET  /                  â€” List all allocations
- GET  /judge/{judge_id}  â€” Get allocations for a specific judge
"""

import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.firebase_config import get_firestore_client
from app.middleware import get_current_user, require_role
from app.models import (
    AutoAllocateRequest,
    AllocationOverride,
    AllocationResponse,
    AllocationStatus,
    EvaluationRound,
)

logger = logging.getLogger("ems.set_c.allocation")
router = APIRouter()


@router.post("/auto")
async def auto_allocate(
    body: AutoAllocateRequest,
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """
    Auto-assign projects to judges using smart allocation:
    1. Match by track/expertise tags
    2. Balance judge load
    3. Respect COI flags
    """
    db = get_firestore_client()

    # Fetch all judges
    judge_docs = db.collection("judges").get()
    judges = [{"id": d.id, **d.to_dict()} for d in judge_docs]
    if not judges:
        raise HTTPException(status_code=400, detail="No judges found. Invite judges first.")

    # Fetch all projects (team submissions)
    project_docs = db.collection("projects").where("event_id", "==", body.event_id).get()
    projects = [{"id": d.id, **d.to_dict()} for d in project_docs]
    if not projects:
        raise HTTPException(status_code=400, detail="No projects found for this event.")

    # Build COI lookup: judge_id -> set of project_ids
    coi_map = {}
    for judge in judges:
        coi_ids = {f["project_id"] for f in judge.get("coi_flags", [])}
        coi_map[judge["id"]] = coi_ids

    # Track current load per judge
    load_map = {j["id"]: 0 for j in judges}

    # Delete existing allocations for this event+round to start fresh
    existing = db.collection("allocations") \
        .where("event_id", "==", body.event_id) \
        .where("round", "==", body.round.value).get()
    for doc in existing:
        doc.reference.delete()

    allocations_created = []
    now = datetime.now(timezone.utc).isoformat()

    for project in projects:
        project_track = project.get("track", "").lower()

        # Score each judge for this project
        scored_judges = []
        for judge in judges:
            # Skip COI conflicts
            if project["id"] in coi_map.get(judge["id"], set()):
                continue

            score = 0
            # Expertise match bonus
            tags = [t.lower() for t in judge.get("expertise_tags", [])]
            if project_track and project_track in tags:
                score += 10

            # Lower load = higher priority (load-balancing)
            score -= load_map[judge["id"]] * 2

            scored_judges.append((judge, score))

        # Sort by score descending, pick top N
        scored_judges.sort(key=lambda x: x[1], reverse=True)
        selected = scored_judges[:body.judges_per_project]

        for judge, _ in selected:
            alloc_data = {
                "judge_id": judge["id"],
                "judge_name": judge.get("name", ""),
                "project_id": project["id"],
                "project_title": project.get("title", "Untitled"),
                "track": project.get("track", ""),
                "event_id": body.event_id,
                "status": AllocationStatus.ASSIGNED.value,
                "round": body.round.value,
                "assigned_at": now,
            }
            doc_ref = db.collection("allocations").document()
            doc_ref.set(alloc_data)
            load_map[judge["id"]] += 1
            allocations_created.append({**alloc_data, "allocation_id": doc_ref.id})

    # Update assigned_count on judge profiles
    for judge in judges:
        if load_map[judge["id"]] > 0:
            db.collection("judges").document(judge["id"]).update({
                "assigned_count": load_map[judge["id"]]
            })

    logger.info(f"Auto-allocation complete: {len(allocations_created)} assignments for event {body.event_id}")

    return {
        "message": f"Auto-allocated {len(allocations_created)} project-judge assignments",
        "total_allocations": len(allocations_created),
        "total_projects": len(projects),
        "total_judges": len(judges),
    }


@router.put("/{allocation_id}", response_model=AllocationResponse)
async def override_allocation(
    allocation_id: str,
    body: AllocationOverride,
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """Manual override: assign or remove a judge from a project."""
    db = get_firestore_client()

    if body.action == "remove":
        doc = db.collection("allocations").document(allocation_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Allocation not found")
        db.collection("allocations").document(allocation_id).delete()
        data = doc.to_dict()
        data["allocation_id"] = doc.id
        return AllocationResponse(**data)

    elif body.action == "assign":
        # Create a new allocation
        judge_doc = db.collection("judges").document(body.judge_id).get()
        if not judge_doc.exists:
            raise HTTPException(status_code=404, detail="Judge not found")

        project_doc = db.collection("projects").document(body.project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")

        judge = judge_doc.to_dict()
        project = project_doc.to_dict()

        alloc_data = {
            "judge_id": body.judge_id,
            "judge_name": judge.get("name", ""),
            "project_id": body.project_id,
            "project_title": project.get("title", "Untitled"),
            "track": project.get("track", ""),
            "event_id": project.get("event_id", ""),
            "status": AllocationStatus.ASSIGNED.value,
            "round": EvaluationRound.ROUND_1.value,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
        }
        doc_ref = db.collection("allocations").document()
        doc_ref.set(alloc_data)

        return AllocationResponse(allocation_id=doc_ref.id, **alloc_data)

    raise HTTPException(status_code=400, detail="Action must be 'assign' or 'remove'")


@router.get("/", response_model=list[AllocationResponse])
async def list_allocations(
    event_id: str = Query(None),
    round: EvaluationRound = Query(None),
    user: dict = Depends(require_role("admin", "super_admin")),
):
    """List all allocations, optionally filtered by event and round."""
    db = get_firestore_client()
    query = db.collection("allocations")

    if event_id:
        query = query.where("event_id", "==", event_id)
    if round:
        query = query.where("round", "==", round.value)

    docs = query.get()

    allocations = []
    for doc in docs:
        data = doc.to_dict()
        data["allocation_id"] = doc.id
        allocations.append(AllocationResponse(**data))

    return allocations


@router.get("/judge/{judge_id}", response_model=list[AllocationResponse])
async def get_judge_allocations(
    judge_id: str,
    user: dict = Depends(require_role("admin", "super_admin", "judge")),
):
    """Get all allocations for a specific judge."""
    db = get_firestore_client()
    docs = db.collection("allocations").where("judge_id", "==", judge_id).get()

    allocations = []
    for doc in docs:
        data = doc.to_dict()
        data["allocation_id"] = doc.id
        allocations.append(AllocationResponse(**data))

    return allocations
