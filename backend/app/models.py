"""
Pydantic models for the EMS — Unified API.

Covers: Auth, Registration, Teams, Attendance, Helpdesk, Mentors, Sponsors,
Admin RBAC, Analytics, and Judging (SET C).
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ORGANIZER = "organizer"
    ADMIN = "admin"
    JUDGE = "judge"
    MENTOR = "mentor"
    VOLUNTEER = "volunteer"
    PARTICIPANT = "participant"


class RegistrationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class FieldType(str, Enum):
    TEXT = "text"
    EMAIL = "email"
    NUMBER = "number"
    CHECKBOX = "checkbox"
    SELECT = "select"
    FILE = "file"
    TEXTAREA = "textarea"


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"


class AllocationStatus(str, Enum):
    ASSIGNED = "assigned"
    PENDING = "pending"
    REVIEWED = "reviewed"


class EvaluationRound(str, Enum):
    ROUND_1 = "round_1"
    FINALS = "finals"


# ──────────────────────────────────────────────
# Auth Models
# ──────────────────────────────────────────────

class TokenVerifyRequest(BaseModel):
    """Request body for verifying a Firebase ID token."""
    id_token: str


class UserProfileCreate(BaseModel):
    """Request body for creating a user profile in Firestore."""
    uid: str
    email: str
    display_name: str
    role: UserRole = UserRole.PARTICIPANT
    institution: Optional[str] = None
    phone: Optional[str] = None


class UserProfileResponse(BaseModel):
    """Response body for a user profile."""
    uid: str
    email: str
    display_name: str
    role: UserRole
    institution: Optional[str] = None
    phone: Optional[str] = None
    team_id: Optional[str] = None
    created_at: Optional[str] = None


# ──────────────────────────────────────────────
# Registration / Form Schema Models
# ──────────────────────────────────────────────

class ConditionalRule(BaseModel):
    """Conditional visibility rule for a form field."""
    depends_on_field_id: str
    depends_on_value: str


class FormField(BaseModel):
    """A single field in a registration form schema."""
    id: str
    type: FieldType
    label: str
    placeholder: Optional[str] = ""
    required: bool = False
    options: Optional[list[str]] = None
    conditional: Optional[ConditionalRule] = None


class FormSchemaCreate(BaseModel):
    """Request body for saving a registration form schema."""
    event_id: str
    form_title: str = "Registration Form"
    fields: list[FormField]


class FormSchemaResponse(BaseModel):
    """Response body for a form schema."""
    event_id: str
    form_title: str
    fields: list[FormField]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class RegistrationSubmit(BaseModel):
    """Request body for submitting a registration form."""
    uid: str
    event_id: str
    responses: dict


class RegistrationResponse(BaseModel):
    """Response body for a registration."""
    uid: str
    event_id: str
    responses: dict
    status: RegistrationStatus = RegistrationStatus.PENDING
    submitted_at: Optional[str] = None


# ──────────────────────────────────────────────
# Team Models
# ──────────────────────────────────────────────

class TeamCreate(BaseModel):
    """Request body for creating a new team."""
    name: str = Field(..., min_length=2, max_length=50)
    track: str
    created_by: str
    looking_for: Optional[str] = None
    description: Optional[str] = None
    max_size: int = Field(default=4, ge=2, le=10)
    min_size: int = Field(default=2, ge=1, le=10)
    institution_constraint: Optional[str] = None


class TeamResponse(BaseModel):
    """Response body for a team."""
    team_id: str
    name: str
    invite_code: str
    track: str
    created_by: str
    members: list[str]
    member_details: Optional[list[dict]] = None
    looking_for: Optional[str] = None
    description: Optional[str] = None
    max_size: int
    min_size: int
    locked: bool = False
    lock_deadline: Optional[str] = None
    created_at: Optional[str] = None


class TeamJoinRequest(BaseModel):
    """Request body for joining a team via invite code."""
    uid: str
    invite_code: str


class TeamLeaveRequest(BaseModel):
    """Request body for leaving a team."""
    uid: str
    team_id: str


class TeamLockRequest(BaseModel):
    """Request body for locking a team (admin action)."""
    lock_deadline: Optional[str] = None


# ──────────────────────────────────────────────
# Attendance Models (Set D)
# ──────────────────────────────────────────────

class AttendanceRecord(BaseModel):
    uid: str
    phase_id: str
    status: AttendanceStatus
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    recorded_by: str

class CheckInRequest(BaseModel):
    qr_data: str
    phase_id: str

class QRBlastRequest(BaseModel):
    """Request body for blasting QR codes to participants via email."""
    usns: List[str] = Field(..., description="List of user UIDs (USNs) to send QR codes to")
    event_id: str = Field(default="hackodyssey2026", description="Event identifier for QR payload")
    expiry_hours: int = Field(default=24, ge=1, le=168, description="QR code validity period in hours")
    include_certificate: bool = Field(default=False, description="Also attach a participation certificate")


# ──────────────────────────────────────────────
# Mentor Models (Set D)
# ──────────────────────────────────────────────

class MentorProfile(BaseModel):
    uid: str
    display_name: str
    expertise: List[str]
    availability: List[Dict]
    bio: Optional[str] = None

class MentorSlot(BaseModel):
    mentor_uid: str
    start_time: datetime
    end_time: datetime
    is_booked: bool = False
    booked_by_team_id: Optional[str] = None

class SlotBookingRequest(BaseModel):
    mentor_uid: str
    slot_index: int
    team_id: str


# ──────────────────────────────────────────────
# Helpdesk Models (Set D)
# ──────────────────────────────────────────────

class SupportTicket(BaseModel):
    ticket_id: Optional[str] = None
    raised_by_uid: str
    title: str
    description: str
    category: str
    priority: TicketPriority = TicketPriority.MEDIUM
    status: TicketStatus = TicketStatus.OPEN
    assigned_to_uid: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to_uid: Optional[str] = None
    comment: Optional[str] = None


# ──────────────────────────────────────────────
# Sponsor & Track Models (Set D)
# ──────────────────────────────────────────────

class Track(BaseModel):
    track_id: str
    name: str
    description: str
    problem_statements: List[str] = []
    sponsor: Optional[str] = None
    sponsor_id: Optional[str] = None
    eligibility_rules: Optional[str] = None
    enrolled_teams: int = 0

class Sponsor(BaseModel):
    sponsor_id: Optional[str] = None
    name: str
    tier: str
    industry: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    metrics: Dict = {}


# ──────────────────────────────────────────────
# Admin RBAC Models (Set D)
# ──────────────────────────────────────────────

class UserRoleUpdate(BaseModel):
    uid: str
    new_role: UserRole

class RolePermissions(BaseModel):
    role: UserRole
    allowed_pages: List[str]
    allowed_actions: List[str]


# ──────────────────────────────────────────────
# Analytics Models (Set D)
# ──────────────────────────────────────────────

class AnalyticsOverview(BaseModel):
    total_registrations: int
    teams_formed: int
    attendance_rate: float
    tickets_resolved: int
    projects_submitted: int = 0
    finance_reconciled: float = 0.0
    top_tracks: List[Dict]


# ──────────────────────────────────────────────
# Judge Models (SET C)
# ──────────────────────────────────────────────

class JudgeInvite(BaseModel):
    """Request body for inviting a judge."""
    email: str
    name: str
    expertise_tags: list[str] = Field(default_factory=list)
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
# Rubric Models (SET C)
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
# Allocation Models (SET C)
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
    round: EvaluationRound = EvaluationRound.ROUND_1


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
# Scoring Models (SET C)
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
# Ranking Models (SET C)
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
