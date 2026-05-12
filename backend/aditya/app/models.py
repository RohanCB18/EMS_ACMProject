"""
Pydantic models for the EMS Authentication, Registration, and Team modules.

These models are used for request/response validation in FastAPI endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

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


# ──────────────────────────────────────────────
# Team Models
# ──────────────────────────────────────────────

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
