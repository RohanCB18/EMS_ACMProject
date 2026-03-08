"""
Pydantic models for the EMS Authentication, Registration, and Team modules.

These models are used for request/response validation in FastAPI endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Enums
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class UserRole(str, Enum):
    PARTICIPANT = "participant"
    ADMIN = "admin"
    JUDGE = "judge"
    MENTOR = "mentor"
    VOLUNTEER = "volunteer"


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


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Auth Models
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Registration / Form Schema Models
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    options: Optional[list[str]] = None  # For select/dropdown
    conditional: Optional[ConditionalRule] = None  # Conditional display


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
    responses: dict  # { field_id: value }


class RegistrationResponse(BaseModel):
    """Response body for a registration."""
    uid: str
    event_id: str
    responses: dict
    status: RegistrationStatus = RegistrationStatus.PENDING
    submitted_at: Optional[str] = None


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Team Models
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class TeamCreate(BaseModel):
    """Request body for creating a new team."""
    name: str = Field(..., min_length=2, max_length=50)
    track: str
    created_by: str  # UID of team creator
    looking_for: Optional[str] = None  # Roles the team is looking for
    description: Optional[str] = None
    max_size: int = Field(default=4, ge=2, le=10)
    min_size: int = Field(default=2, ge=1, le=10)
    institution_constraint: Optional[str] = None  # "same" | "different" | None


class TeamResponse(BaseModel):
    """Response body for a team."""
    team_id: str
    name: str
    invite_code: str
    track: str
    created_by: str
    members: list[str]  # list of UIDs
    member_details: Optional[list[dict]] = None  # name + email for display
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
    lock_deadline: Optional[str] = None  # ISO timestamp
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime

# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ORGANIZER = "organizer"
    ADMIN = "admin"
    JUDGE = "judge"
    MENTOR = "mentor"
    VOLUNTEER = "volunteer"
    PARTICIPANT = "participant"

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

# Attendance Models
class AttendanceRecord(BaseModel):
    uid: str
    phase_id: str
    status: AttendanceStatus
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    recorded_by: str  # Volunteer UID

class CheckInRequest(BaseModel):
    qr_data: str  # Encoded UID or Badge ID
    phase_id: str

# Mentor Models
class MentorProfile(BaseModel):
    uid: str
    display_name: str
    expertise: List[str]
    availability: List[Dict]  # List of slots: {"start": ISO, "end": ISO, "booked": bool}
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

# Helpdesk Models
class SupportTicket(BaseModel):
    ticket_id: Optional[str] = None
    raised_by_uid: str
    title: str
    description: str
    category: str  # technical / logistics / queries
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

# Sponsor & Track Models
class Track(BaseModel):
    track_id: str
    name: str
    description: str
    problem_statements: List[str] = []
    sponsor: Optional[str] = None  # Sponsor name for display
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
    metrics: Dict = {}  # engagement metrics

# Admin RBAC Models
class UserRoleUpdate(BaseModel):
    uid: str
    new_role: UserRole

class RolePermissions(BaseModel):
    role: UserRole
    allowed_pages: List[str]
    allowed_actions: List[str]

# Analytics Models
class AnalyticsOverview(BaseModel):
    total_registrations: int
    teams_formed: int
    attendance_rate: float
    tickets_resolved: int
    projects_submitted: int = 0
    finance_reconciled: float = 0.0
    top_tracks: List[Dict]
"""
Pydantic models for the EMS Judging System (SET C).

These models are used for request/response validation in FastAPI endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Enums
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class AllocationStatus(str, Enum):
    ASSIGNED = "assigned"
    PENDING = "pending"
    REVIEWED = "reviewed"


class EvaluationRound(str, Enum):
    ROUND_1 = "round_1"
    FINALS = "finals"


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Judge Models
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Rubric Models
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Allocation Models
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Scoring Models
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Ranking Models
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
