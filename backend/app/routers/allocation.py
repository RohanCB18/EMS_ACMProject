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
    Intelligent auto-allocation algorithm based on dynamic scoring.
    1. Score judges per project (-1 to skip, +10 match track, -2 per existing assign).
    2. Respect strict COI and duplicate assignment checks.
    3. Update judge load dynamically to balance distribution.
    """
    db = get_firestore_client()

    judge_docs = db.collection("judges").get()
    judges = [{"id": d.id, **d.to_dict()} for d in judge_docs]
    if not judges:
        raise HTTPException(status_code=400, detail="No judges found. Invite judges first.")

    team_docs = db.collection("teams").get()
    projects = []
    for d in team_docs:
        data = d.to_dict()
        projects.append({
            "id": d.id,
            "title": data.get("name", "Untitled Team"),
            "track": data.get("track", "General"),
            "event_id": body.event_id
        })

    if not projects:
        logger.info("No teams found, falling back to projects collection")
        project_docs = db.collection("projects").where("event_id", "==", body.event_id).get()
        projects = [{"id": d.id, **d.to_dict()} for d in project_docs]

    if not projects:
        raise HTTPException(status_code=400, detail="No projects or teams found to allocate.")

    if body.round == EvaluationRound.FINALS:
        logger.info(f"Allocating for Finals round. Fetching shortlist for event {body.event_id}")
        shortlist_docs = db.collection("shortlists") \
            .where("event_id", "==", body.event_id) \
            .where("advance_to", "==", EvaluationRound.FINALS.value).get()
        
        shortlisted_ids = set()
        for doc in shortlist_docs:
            shortlisted_ids.update(doc.to_dict().get("project_ids", []))
        
        if not shortlisted_ids:
            logger.warning(f"No projects found in shortlist for Finals round of event {body.event_id}")
            projects = []
        else:
            projects = [p for p in projects if p["id"] in shortlisted_ids]
            logger.info(f"Filtered to {len(projects)} shortlisted projects for Finals")

    if not projects:
        raise HTTPException(status_code=400, detail=f"No suitable projects found to allocate for {body.round.value} round.")

    load_map = {j["id"]: j.get("assigned_count", 0) for j in judges}
    existing_assignments = set()

    existing = db.collection("allocations") \
        .where("event_id", "==", body.event_id) \
        .where("round", "==", body.round.value).get()
    
    for doc in existing:
        data = doc.to_dict()
        if data.get("status") == AllocationStatus.ASSIGNED.value:
            doc.reference.delete()
        else:
            existing_assignments.add((data["project_id"], data["judge_id"]))

    coi_map = {}
    for judge in judges:
        coi_ids = {f["project_id"] for f in judge.get("coi_flags", [])}
        coi_map[judge["id"]] = coi_ids

    allocations_created = []
    now = datetime.now(timezone.utc).isoformat()

    for project in projects:
        project_track = project.get("track", "").lower()
        scored_judges = []

        for judge in judges:
            if project["id"] in coi_map.get(judge["id"], set()):
                continue
            
            if (project["id"], judge["id"]) in existing_assignments:
                continue

            score = 0
            tags = [t.lower() for t in judge.get("expertise_tags", [])]
            if project_track and project_track in tags:
                score += 10

            score -= load_map[judge["id"]] * 2
            scored_judges.append((judge, score))

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
            existing_assignments.add((project["id"], judge["id"]))
            allocations_created.append({**alloc_data, "allocation_id": doc_ref.id})

    for judge in judges:
        if load_map[judge["id"]] > judge.get("assigned_count", 0):
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

        # Try project first, then fallback to teams
        project_doc = db.collection("projects").document(body.project_id).get()
        if project_doc.exists:
            project = project_doc.to_dict()
            project_title = project.get("title", "Untitled")
            track = project.get("track", "")
            event_id = project.get("event_id", "default_event")
        else:
            team_doc = db.collection("teams").document(body.project_id).get()
            if not team_doc.exists:
                raise HTTPException(status_code=404, detail="Project/Team not found")
            team = team_doc.to_dict()
            project_title = team.get("name", "Untitled Team")
            track = team.get("track", "")
            event_id = team.get("event_id", "default_event")

        judge = judge_doc.to_dict()

        alloc_data = {
            "judge_id": body.judge_id,
            "judge_name": judge.get("name", ""),
            "project_id": body.project_id,
            "project_title": project_title,
            "track": track,
            "event_id": event_id,
            "status": AllocationStatus.ASSIGNED.value,
            "round": body.round.value,
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
