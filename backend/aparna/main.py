"""
EMS Backend — Set B: Participant Dashboard & Event Flow Control
Aparna's Module

Serves:
  - /phases/*         Phase management (list, current, set-active, feature flags)
  - /announcements/*  Announcement CRUD for admins + participants

Run with:
    cd backend/aparna
    uvicorn main:app --reload --port 8004

NOTE: Add serviceAccountKey.json to this directory before running.
      Do NOT commit that file to version control.
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from phase_router import router as phase_router
from announcements_router import router as announcements_router

# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ems.set_b")


# ──────────────────────────────────────────────
# Lifecycle
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 EMS Set B Backend starting on port 8004")
    logger.info("📖 API docs available at http://localhost:8004/docs")

    try:
        from firebase_admin_config import get_db
        get_db()
        logger.info("✅ Firebase Admin SDK initialized successfully")
    except FileNotFoundError as e:
        logger.warning(f"⚠️  Firebase not configured: {e}")
        logger.warning("   Server will run but Firestore endpoints will fail.")
    except Exception as e:
        logger.error(f"❌ Firebase initialization failed: {e}")

    yield
    logger.info("👋 EMS Set B Backend shutting down")


# ──────────────────────────────────────────────
# App
# ──────────────────────────────────────────────

app = FastAPI(
    title="EMS — Participant Dashboard & Event Flow API",
    description=(
        "Set B backend for the Hackathon Event Management System.\n\n"
        "Handles:\n"
        "- Phase lifecycle management\n"
        "- Feature flags per phase\n"
        "- Announcement broadcasting with track filtering\n\n"
        "Admin endpoints require a `Bearer <firebase_id_token>` in Authorization header."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ──────────────────────────────────────────────
# CORS
# ──────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Request logging middleware
# ──────────────────────────────────────────────

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    start_time = time.time()

    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 1)
        if request.url.path.startswith("/api") or request.url.path in ("/health", "/"):
            level = logging.WARNING if response.status_code >= 400 else logging.INFO
            logger.log(level, f"[{request_id}] {request.method} {request.url.path} → {response.status_code} ({duration_ms}ms)")
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000, 1)
        logger.error(f"[{request_id}] {request.method} {request.url.path} → 500 UNHANDLED ({duration_ms}ms): {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Internal server error", "request_id": request_id}, headers={"X-Request-ID": request_id})


# ──────────────────────────────────────────────
# Exception handlers
# ──────────────────────────────────────────────

@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────

app.include_router(phase_router, prefix="/phases", tags=["Phases"])
app.include_router(announcements_router, prefix="/announcements", tags=["Announcements"])


# ──────────────────────────────────────────────
# Root endpoints
# ──────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "EMS Set B — Participant Dashboard API", "port": 8004}


@app.get("/")
def root():
    return {
        "service": "EMS Set B Backend",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {"phases": "/phases", "announcements": "/announcements"},
    }
