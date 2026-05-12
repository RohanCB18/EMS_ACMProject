"""
Phase Router — Set B Backend

Endpoints:
  GET  /phases           → list all phases ordered by `order`
  GET  /phases/current   → the currently active phase
  POST /phases/set-active → admin: activate a phase (deactivates all others)
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from firebase_admin_config import get_db

router = APIRouter()


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

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


# ──────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────

class SetActiveRequest(BaseModel):
    phaseId: str


class FeatureFlags(BaseModel):
    allowEdits: bool = True
    allowSubmission: bool = False
    allowJudging: bool = False


class PhaseUpdateRequest(BaseModel):
    phaseId: str
    featureFlags: Optional[FeatureFlags] = None


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("/")
def get_all_phases():
    """Return all phases ordered by their `order` field."""
    try:
        db = get_db()
        docs = db.collection("phases").order_by("order").stream()
        return [phase_doc_to_dict(doc) for doc in docs]
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch phases: {str(e)}")


@router.get("/current")
def get_current_phase():
    """Return the currently active phase."""
    try:
        db = get_db()
        docs = db.collection("phases").where("isActive", "==", True).limit(1).stream()
        phases = [phase_doc_to_dict(doc) for doc in docs]
        if not phases:
            return {"message": "No active phase set.", "phase": None}
        return phases[0]
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

        updated = phase_ref.get()
        return {"message": "Feature flags updated.", "phase": phase_doc_to_dict(updated)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update feature flags: {str(e)}")
