from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime

# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ORGANIZER = "organizer"
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
    top_tracks: List[Dict]
