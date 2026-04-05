"""
Phase Router â€” Set B Backend

Endpoints:
  GET  /phases           â†’ list all phases ordered by `order`
  GET  /phases/current   â†’ the currently active phase
  POST /phases/set-active â†’ admin: activate a phase (deactivates all others)
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from app.core.firebase_config import get_firestore_client as get_db
from app.core.kafka_cache import get_kafka_cache

router = APIRouter()


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Helpers
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def verify_admin_token(authorization: Optional[str] = Header(None)) -> str:
    """
    Minimal token gate. In production, verify the Firebase ID token with
    firebase_admin.auth.verify_id_token(token). For now we accept any Bearer token.
    Returns the raw token so callers can use it.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")
    return authorization.split("Bearer ")[1]


def phase_doc_to_dict(doc) -> dict:
    data = doc.to_dict()
    data["id"] = doc.id
    return data


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Models
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class SetActiveRequest(BaseModel):
    phaseId: str


class FeatureFlags(BaseModel):
    allowEdits: bool = True
    allowSubmission: bool = False
    allowJudging: bool = False


class PhaseUpdateRequest(BaseModel):
    phaseId: str
    featureFlags: Optional[FeatureFlags] = None


class PhaseCreate(BaseModel):
    name: str
    order: int
    description: Optional[str] = None
    featureFlags: Optional[FeatureFlags] = None


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Routes
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.get("/")
def get_all_phases():
    """Return all phases ordered by their `order` field."""
    try:
        db = get_db()
        cache = get_kafka_cache()
        cache_key = "phases:all"

        def loader():
            docs = db.collection("phases").order_by("order").stream()
            return [phase_doc_to_dict(doc) for doc in docs]

        return cache.get(cache_key, loader, ttl_secs=15)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch phases: {str(e)}")


@router.get("/current")
def get_current_phase():
    """Return the currently active phase."""
    try:
        db = get_db()
        cache = get_kafka_cache()
        cache_key = "phases:current"

        def loader():
            docs = db.collection("phases").where("isActive", "==", True).limit(1).stream()
            phases = [phase_doc_to_dict(doc) for doc in docs]
            if not phases:
                return {"message": "No active phase set.", "phase": None}
            return phases[0]

        return cache.get(cache_key, loader, ttl_secs=10)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch current phase: {str(e)}")


@router.post("/set-active")
def set_active_phase(
    request: SetActiveRequest,
    _token: str = Depends(verify_admin_token),
):
    """
    Admin only. Deactivates all phases, then sets the specified phase as active.
    """
    try:
        db = get_db()

        # 1. Deactivate all phases atomically
        all_docs = db.collection("phases").stream()
        batch = db.batch()
        for doc in all_docs:
            batch.update(doc.reference, {"isActive": False})
        batch.commit()

        # 2. Activate the requested phase
        phase_ref = db.collection("phases").document(request.phaseId)
        phase_doc = phase_ref.get()
        if not phase_doc.exists:
            raise HTTPException(status_code=404, detail=f"Phase '{request.phaseId}' not found.")

        phase_ref.update({"isActive": True})
        get_kafka_cache().invalidate_prefix("phases:")

        updated = phase_ref.get()
        return {"message": "Phase activated successfully.", "phase": phase_doc_to_dict(updated)}

    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set active phase: {str(e)}")


@router.patch("/flags")
def update_feature_flags(
    request: PhaseUpdateRequest,
    _token: str = Depends(verify_admin_token),
):
    """Admin only. Update the feature flags for a specific phase."""
    try:
        db = get_db()
        phase_ref = db.collection("phases").document(request.phaseId)
        if not phase_ref.get().exists:
            raise HTTPException(status_code=404, detail=f"Phase '{request.phaseId}' not found.")

        if request.featureFlags:
            phase_ref.update({"featureFlags": request.featureFlags.model_dump()})
        get_kafka_cache().invalidate_prefix("phases:")

        updated = phase_ref.get()
        return {"message": "Feature flags updated.", "phase": phase_doc_to_dict(updated)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update feature flags: {str(e)}")


@router.post("/", status_code=201)
def create_phase(
    payload: PhaseCreate,
    _token: str = Depends(verify_admin_token),
):
    """
    Admin only. Create a new event phase in Firestore.
    Phases define the event lifecycle: Registration → Team Formation → Ideation
    → Development → Submission → Judging
    """
    try:
        db = get_db()

        # Ensure order is unique
        existing = list(
            db.collection("phases").where("order", "==", payload.order).limit(1).stream()
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"A phase with order={payload.order} already exists.",
            )

        flags = payload.featureFlags.model_dump() if payload.featureFlags else {
            "allowEdits": True,
            "allowSubmission": False,
            "allowJudging": False,
        }
        doc_ref = db.collection("phases").document()
        doc_ref.set({
            "name": payload.name,
            "order": payload.order,
            "description": payload.description or "",
            "isActive": False,
            "featureFlags": flags,
        })
        get_kafka_cache().invalidate_prefix("phases:")
        created = doc_ref.get()
        return phase_doc_to_dict(created)

    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create phase: {str(e)}")


@router.delete("/{phase_id}")
def delete_phase(
    phase_id: str,
    _token: str = Depends(verify_admin_token),
):
    """Admin only. Delete a phase by its Firestore document ID."""
    try:
        db = get_db()
        ref = db.collection("phases").document(phase_id)
        if not ref.get().exists:
            raise HTTPException(status_code=404, detail="Phase not found.")
        ref.delete()
        get_kafka_cache().invalidate_prefix("phases:")
        return {"message": f"Phase '{phase_id}' deleted successfully."}
    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete phase: {str(e)}")
