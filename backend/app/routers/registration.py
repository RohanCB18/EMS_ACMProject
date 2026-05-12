"""
Registration API Router.

Handles:
- Form schema management (admin creates/edits registration forms)
- Registration submission (participant fills and submits forms)
- Registration status tracking

Robustness: Protected by auth dependencies and role checks.
"""

from fastapi import APIRouter, HTTPException, Depends
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from datetime import datetime

from app.core.firebase_config import get_firestore_client
from app.models import (
    FormSchemaCreate,
    FormSchemaResponse,
    RegistrationSubmit,
    RegistrationResponse,
    RegistrationStatus,
)
from app.middleware import get_current_user_profile, require_role

router = APIRouter()


# ──────────────────────────────────────────────
# Form Schema Endpoints (Admin)
# ──────────────────────────────────────────────

@router.post("/schema", response_model=FormSchemaResponse)
async def save_form_schema(
    schema: FormSchemaCreate,
    admin_profile: dict = Depends(require_role("admin", "super_admin"))
):
    """
    Save or update a registration form schema for an event.
    Admin-only operation.
    """
    db = get_firestore_client()

    # Convert fields to dicts for Firestore storage
    fields_data = []
    for field in schema.fields:
        field_dict = field.model_dump()
        # Convert conditional rule to dict if present
        if field_dict.get("conditional"):
            field_dict["conditional"] = field.conditional.model_dump()
        fields_data.append(field_dict)

    schema_doc = {
        "event_id": schema.event_id,
        "form_title": schema.form_title,
        "fields": fields_data,
        "updated_at": SERVER_TIMESTAMP,
    }

    # Use event_id as the document ID in the events collection
    doc_ref = db.collection("events").document(schema.event_id)
    existing = doc_ref.get()

    if existing.exists:
        doc_ref.update(schema_doc)
    else:
        schema_doc["created_at"] = SERVER_TIMESTAMP
        doc_ref.set(schema_doc)

    return FormSchemaResponse(
        event_id=schema.event_id,
        form_title=schema.form_title,
        fields=schema.fields,
    )


@router.get("/schema/{event_id}", response_model=FormSchemaResponse)
async def get_form_schema(
    event_id: str,
    _: dict = Depends(get_current_user_profile)
):
    """
    Retrieve the registration form schema.
    Protected: Any authenticated user can view schemas to register.
    """
    db = get_firestore_client()
    doc = db.collection("events").document(event_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Event or form schema not found")

    data = doc.to_dict()
    if "fields" not in data:
        raise HTTPException(status_code=404, detail="No form schema defined for this event")

    return FormSchemaResponse(
        event_id=event_id,
        form_title=data.get("form_title", "Registration Form"),
        fields=data.get("fields", []),
        created_at=str(data.get("created_at", "")),
        updated_at=str(data.get("updated_at", "")),
    )


@router.get("/schemas")
async def list_form_schemas(
    admin_profile: dict = Depends(require_role("admin", "super_admin"))
):
    """
    List all events that have a form schema defined. (Admin only)
    """
    db = get_firestore_client()
    events = db.collection("events").get()

    results = []
    for doc in events:
        data = doc.to_dict()
        if "fields" in data:
            results.append({
                "event_id": doc.id,
                "form_title": data.get("form_title", "Untitled"),
                "field_count": len(data.get("fields", [])),
                "updated_at": str(data.get("updated_at", "")),
            })

    return {"schemas": results}


# ──────────────────────────────────────────────
# Registration Submission Endpoints (Participant)
# ──────────────────────────────────────────────

@router.post("/submit", response_model=RegistrationResponse)
async def submit_registration(
    submission: RegistrationSubmit,
    profile: dict = Depends(get_current_user_profile)
):
    """
    Submit a registration form.
    Protected: Validates UID spoofing.
    """
    if submission.uid != profile["uid"]:
        raise HTTPException(status_code=403, detail="Cannot submit registration for another user")

    db = get_firestore_client()

    event_doc = db.collection("events").document(submission.event_id).get()
    if not event_doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")

    event_data = event_doc.to_dict()
    schema_fields = event_data.get("fields", [])

    missing_fields = []
    for field in schema_fields:
        if field.get("required", False):
            field_id = field.get("id")
            if field_id not in submission.responses or not submission.responses[field_id]:
                conditional = field.get("conditional")
                if conditional:
                    depends_on = conditional.get("depends_on_field_id")
                    depends_value = conditional.get("depends_on_value")
                    actual_value = submission.responses.get(depends_on, "")
                    if str(actual_value) != str(depends_value):
                        continue
                missing_fields.append(field.get("label", field_id))

    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required fields: {', '.join(missing_fields)}"
        )

    existing = db.collection("registrations").document(submission.uid).get()
    if existing.exists:
        existing_data = existing.to_dict()
        if existing_data.get("event_id") == submission.event_id:
            raise HTTPException(
                status_code=409,
                detail="You have already submitted a registration for this event"
            )

    reg_data = {
        "uid": submission.uid,
        "event_id": submission.event_id,
        "responses": submission.responses,
        "status": RegistrationStatus.PENDING.value,
        "submitted_at": SERVER_TIMESTAMP,
    }

    db.collection("registrations").document(submission.uid).set(reg_data)

    return RegistrationResponse(
        uid=submission.uid,
        event_id=submission.event_id,
        responses=submission.responses,
        status=RegistrationStatus.PENDING,
    )


@router.get("/status/{uid}", response_model=RegistrationResponse)
async def get_registration_status(
    uid: str,
    profile: dict = Depends(get_current_user_profile)
):
    """Get the registration status. Users can only view their own."""
    if uid != profile["uid"] and profile.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Cannot view another user's registration")

    db = get_firestore_client()
    doc = db.collection("registrations").document(uid).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="No registration found for this user")

    data = doc.to_dict()
    return RegistrationResponse(
        uid=data.get("uid", uid),
        event_id=data.get("event_id", ""),
        responses=data.get("responses", {}),
        status=data.get("status", "pending"),
        submitted_at=str(data.get("submitted_at", "")),
    )


@router.put("/status/{uid}")
async def update_registration_status(
    uid: str, 
    status: str,
    admin_profile: dict = Depends(require_role("admin", "super_admin"))
):
    """Admin-only status update."""
    valid_statuses = ["pending", "confirmed", "rejected"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )

    db = get_firestore_client()
    doc_ref = db.collection("registrations").document(uid)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="No registration found for this user")

    doc_ref.update({"status": status})
    return {"message": f"Registration status updated to {status}", "uid": uid}


@router.get("/all/{event_id}")
async def get_all_registrations(
    event_id: str,
    admin_profile: dict = Depends(require_role("admin", "super_admin"))
):
    """Get all registrations for an event (Admin only)."""
    db = get_firestore_client()
    regs = db.collection("registrations").where("event_id", "==", event_id).get()

    results = []
    for doc in regs:
        data = doc.to_dict()
        results.append({
            "uid": doc.id,
            "event_id": data.get("event_id"),
            "status": data.get("status"),
            "submitted_at": str(data.get("submitted_at", "")),
            "responses": data.get("responses", {}),
        })

    return {"registrations": results, "count": len(results)}
