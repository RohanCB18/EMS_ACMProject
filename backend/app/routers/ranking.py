"""
Ranking Engine Router

Endpoints:
- GET  /{event_id}            â€” Get aggregated rankings for an event
- POST /{event_id}/shortlist  â€” Shortlist projects for next round
- GET  /{event_id}/export     â€” Export winner list as JSON
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.firebase_config import get_firestore_client
from app.middleware import require_role
from app.models import (
    RankingResponse,
    ProjectRanking,
    ShortlistRequest,
    EvaluationRound,
)

logger = logging.getLogger("ems.set_c.ranking")
router = APIRouter()


def _aggregate_rankings(db, event_id: str, round_val: str) -> list[ProjectRanking]:
    """Aggregate all scores for an event/round and compute rankings."""
    # Get all scores for this event + round
    score_docs = db.collection("scores") \
        .where("event_id", "==", event_id) \
        .where("round", "==", round_val).get()

    # Aggregate by project
    project_scores: dict[str, dict] = {}
    for doc in score_docs:
        data = doc.to_dict()
        pid = data["project_id"]
        score_val = data.get("weighted_total", 0)
        
        # Retroactive fix: if score is 0 but criteria exist, recalculate
        if score_val == 0 and data.get("criteria_scores"):
            criteria_scores = data.get("criteria_scores", [])
            # Standard weights fallback (25/25/25/25)
            total = 0.0
            for cs in criteria_scores:
                score = cs.get("score", 0)
                # Assume standard max_score 10 and 25% weight
                total += (score / 10) * 100 * 0.25
            score_val = round(total, 2)
            logger.info(f"Retroactively fixed 0% score for project {pid}: {score_val}%")
        
        logger.debug(f"Aggregation: Found score {score_val} for project {pid}")
        
        if pid not in project_scores:
            project_scores[pid] = {
                "project_id": pid,
                "project_title": data.get("project_title", "Untitled"),
                "scores": [],
            }
        project_scores[pid]["scores"].append(score_val)

    # Get project metadata for track and team info
    for pid, pdata in project_scores.items():
        proj_doc = db.collection("projects").document(pid).get()
        if proj_doc.exists:
            proj = proj_doc.to_dict()
            pdata["track"] = proj.get("track", "")
            pdata["team_name"] = proj.get("team_name", "")
        else:
            # Fallback to teams collection if no projects doc exists
            team_doc = db.collection("teams").document(pid).get()
            if team_doc.exists:
                team = team_doc.to_dict()
                pdata["track"] = team.get("track", "")
                pdata["team_name"] = team.get("name", "")
            else:
                pdata["track"] = "General"
                pdata["team_name"] = "Unknown Team"

    # Check shortlist status
    shortlist_docs = db.collection("shortlists") \
        .where("event_id", "==", event_id) \
        .where("round", "==", round_val).get()
    shortlisted_ids = set()
    for doc in shortlist_docs:
        shortlisted_ids.update(doc.to_dict().get("project_ids", []))

    # Build ranking list
    rankings = []
    for pid, pdata in project_scores.items():
        scores = pdata["scores"]
        avg = round(sum(scores) / len(scores), 2) if scores else 0
        rankings.append(ProjectRanking(
            project_id=pid,
            project_title=pdata["project_title"],
            team_name=pdata.get("team_name"),
            track=pdata.get("track"),
            avg_weighted_score=avg,
            total_evaluations=len(scores),
            shortlisted=pid in shortlisted_ids,
        ))

    # Sort by average weighted score descending
    rankings.sort(key=lambda r: r.avg_weighted_score, reverse=True)

    # Assign ranks (handle ties)
    for i, r in enumerate(rankings):
        if i > 0 and r.avg_weighted_score == rankings[i - 1].avg_weighted_score:
            r.rank = rankings[i - 1].rank  # Same rank for tied scores
        else:
            r.rank = i + 1

    return rankings


@router.get("/{event_id}", response_model=RankingResponse)
async def get_rankings(
    event_id: str,
    round: EvaluationRound = Query(EvaluationRound.ROUND_1),
    user: dict = Depends(require_role("admin", "super_admin")),
):
    """Get aggregated rankings for an event."""
    db = get_firestore_client()
    rankings = _aggregate_rankings(db, event_id, round.value)

    evaluated_count = sum(1 for r in rankings if r.total_evaluations > 0)

    return RankingResponse(
        event_id=event_id,
        round=round,
        rankings=rankings,
        total_projects=len(rankings),
        total_evaluated=evaluated_count,
    )


@router.post("/{event_id}/shortlist")
async def shortlist_projects(
    event_id: str,
    body: ShortlistRequest,
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """Shortlist selected projects to advance to the next round."""
    db = get_firestore_client()

    now = datetime.now(timezone.utc).isoformat()
    shortlist_data = {
        "event_id": event_id,
        "round": body.round.value,
        "advance_to": body.advance_to.value,
        "project_ids": body.project_ids,
        "shortlisted_at": now,
        "shortlisted_by": admin.get("uid", "unknown"),
    }

    doc_ref = db.collection("shortlists").document()
    doc_ref.set(shortlist_data)

    logger.info(
        f"Shortlisted {len(body.project_ids)} projects from {body.round.value} "
        f"to {body.advance_to.value} for event {event_id}"
    )

    return {
        "message": f"{len(body.project_ids)} projects shortlisted for {body.advance_to.value}",
        "project_ids": body.project_ids,
    }


@router.get("/{event_id}/export")
async def export_winners(
    event_id: str,
    round: EvaluationRound = Query(EvaluationRound.FINALS),
    top_n: int = Query(10, ge=1, le=100),
    admin: dict = Depends(require_role("admin", "super_admin")),
):
    """Export the top N ranked projects as a winner list."""
    db = get_firestore_client()
    rankings = _aggregate_rankings(db, event_id, round.value)

    winners = rankings[:top_n]

    return {
        "event_id": event_id,
        "round": round.value,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "winners": [
            {
                "rank": w.rank,
                "project_id": w.project_id,
                "project_title": w.project_title,
                "team_name": w.team_name,
                "track": w.track,
                "avg_score": w.avg_weighted_score,
                "evaluations": w.total_evaluations,
            }
            for w in winners
        ],
    }
