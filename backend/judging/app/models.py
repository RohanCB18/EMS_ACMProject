"""
Pydantic models for the EMS Judging System (SET C).

These models are used for request/response validation in FastAPI endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class AllocationStatus(str, Enum):
    ASSIGNED = "assigned"
    PENDING = "pending"
    REVIEWED = "reviewed"


class EvaluationRound(str, Enum):
    ROUND_1 = "round_1"
    FINALS = "finals"


# ──────────────────────────────────────────────
# Judge Models
# ──────────────────────────────────────────────

class JudgeInvite(BaseModel):
    """Request body for inviting a judge."""
    email: str
    name: str
    expertise_tags: list[str] = Field(default_factory=list, description="e.g. ['AI/ML', 'Web', 'Blockchain']")
    organization: Optional[str] = None


class JudgeProfileUpdate(BaseModel):
    """Request body for updating a judge profile."""
    expertise_tags: Optional[list[str]] = None
    organization: Optional[str] = None
    name: Optional[str] = None


class JudgeCoiFlag(BaseModel):
    """Request body for flagging conflict of interest."""
    project_id: str
    reason: str


class JudgeResponse(BaseModel):
    """Response body for a judge profile."""
    judge_id: str
    email: str
    name: str
    expertise_tags: list[str] = []
    organization: Optional[str] = None
    coi_flags: list[dict] = []
    assigned_count: int = 0
    reviewed_count: int = 0
    created_at: Optional[str] = None


# ──────────────────────────────────────────────
# Rubric Models
# ──────────────────────────────────────────────

class RubricCriteria(BaseModel):
    """A single criterion in a rubric."""
    id: str
    name: str = Field(..., description="e.g. 'Innovation', 'Execution', 'Presentation'")
    weight: float = Field(..., ge=0, le=100, description="Weight percentage (0-100)")
    max_score: int = Field(default=10, ge=1, le=100)
    description: Optional[str] = None


class RubricCreate(BaseModel):
    """Request body for creating/updating a rubric."""
    event_id: str
    name: str = "Default Rubric"
    criteria: list[RubricCriteria]
    round: EvaluationRound = EvaluationRound.ROUND_1


class RubricResponse(BaseModel):
    """Response body for a rubric."""
    rubric_id: str
    event_id: str
    name: str
    criteria: list[RubricCriteria]
    round: EvaluationRound
    total_weight: float = 100.0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ──────────────────────────────────────────────
# Allocation Models
# ──────────────────────────────────────────────

class AutoAllocateRequest(BaseModel):
    """Request body for auto-allocating projects to judges."""
    event_id: str
    round: EvaluationRound = EvaluationRound.ROUND_1
    projects_per_judge: int = Field(default=5, ge=1, le=50)
    judges_per_project: int = Field(default=3, ge=1, le=10)


class AllocationOverride(BaseModel):
    """Request body for manually overriding an allocation."""
    judge_id: str
    project_id: str
    action: str = Field(..., description="'assign' or 'remove'")


class AllocationResponse(BaseModel):
    """Response body for a project-judge allocation."""
    allocation_id: str
    judge_id: str
    judge_name: str
    project_id: str
    project_title: str
    track: Optional[str] = None
    status: AllocationStatus = AllocationStatus.ASSIGNED
    round: EvaluationRound = EvaluationRound.ROUND_1
    assigned_at: Optional[str] = None


# ──────────────────────────────────────────────
# Scoring Models
# ──────────────────────────────────────────────

class CriteriaScore(BaseModel):
    """Score for a single rubric criterion."""
    criteria_id: str
    score: float = Field(..., ge=0)
    comment: Optional[str] = None


class ScoreSubmit(BaseModel):
    """Request body for submitting scores for a project."""
    event_id: str
    project_id: str
    round: EvaluationRound = EvaluationRound.ROUND_1
    criteria_scores: list[CriteriaScore]
    overall_comment: Optional[str] = None
    private_notes: Optional[str] = None


class ScoreResponse(BaseModel):
    """Response body for a submitted evaluation."""
    score_id: str
    judge_id: str
    judge_name: str
    project_id: str
    project_title: str
    event_id: str
    round: EvaluationRound
    criteria_scores: list[CriteriaScore]
    weighted_total: float = 0.0
    overall_comment: Optional[str] = None
    private_notes: Optional[str] = None
    submitted_at: Optional[str] = None


# ──────────────────────────────────────────────
# Ranking Models
# ──────────────────────────────────────────────

class ProjectRanking(BaseModel):
    """Ranking entry for a single project."""
    project_id: str
    project_title: str
    team_name: Optional[str] = None
    track: Optional[str] = None
    avg_weighted_score: float = 0.0
    total_evaluations: int = 0
    rank: int = 0
    shortlisted: bool = False


class RankingResponse(BaseModel):
    """Response body for event rankings."""
    event_id: str
    round: EvaluationRound
    rankings: list[ProjectRanking]
    total_projects: int = 0
    total_evaluated: int = 0


class ShortlistRequest(BaseModel):
    """Request body for shortlisting projects."""
    project_ids: list[str]
    round: EvaluationRound = EvaluationRound.ROUND_1
    advance_to: EvaluationRound = EvaluationRound.FINALS
