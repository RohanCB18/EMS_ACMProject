"""
EMS Backend — Judging System Service (SET C)

FastAPI application serving judge onboarding, rubric management,
project allocation, scoring, and ranking APIs. Runs on port 8003.

Run with:
    cd backend/judging
    uvicorn main:app --reload --port 8003
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.routers import judges, rubrics, allocation, scoring, ranking

# ──────────────────────────────────────────────
# Structured Logging
# ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ems.set_c")


# ──────────────────────────────────────────────
# Lifecycle events
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 EMS SET C Judging Backend starting up on port 8003")
    logger.info("📖 API docs available at http://localhost:8003/docs")

    try:
        from app.firebase_config import get_firestore_client
        get_firestore_client()
        logger.info("✅ Firebase Admin SDK initialized successfully")
    except FileNotFoundError as e:
        logger.warning(f"⚠️  Firebase not configured: {e}")
        logger.warning("   The server will run but endpoints requiring Firestore will fail.")
    except Exception as e:
        logger.error(f"❌ Firebase initialization failed: {e}")

    yield

    logger.info("👋 EMS SET C Judging Backend shutting down")


# ──────────────────────────────────────────────
# App initialization
# ──────────────────────────────────────────────

app = FastAPI(
    title="EMS — Judging System API",
    description=(
        "Backend service for SET C of the Hackathon Event Management System.\n\n"
        "Handles:\n"
        "- Judge onboarding & profile management\n"
        "- Configurable scoring rubrics\n"
        "- Smart project-to-judge allocation\n"
        "- Weighted scoring & feedback\n"
        "- Live ranking engine with shortlisting\n\n"
        "All protected endpoints require a `Bearer <firebase_id_token>` in the Authorization header."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ──────────────────────────────────────────────
# Middleware
# ──────────────────────────────────────────────

# CORS
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


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """
    Middleware that:
    1. Assigns a unique request ID for tracing
    2. Logs request method, path, and response time
    3. Catches unhandled exceptions and returns clean 500s
    """
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id

    start_time = time.time()

    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 1)

        if request.url.path.startswith("/api") or request.url.path in ("/health", "/"):
            log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
            logger.log(
                log_level,
                f"[{request_id}] {request.method} {request.url.path} → {response.status_code} ({duration_ms}ms)",
            )

        response.headers["X-Request-ID"] = request_id
        return response

    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000, 1)
        logger.error(
            f"[{request_id}] {request.method} {request.url.path} → 500 UNHANDLED ({duration_ms}ms): {str(e)}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )


# ──────────────────────────────────────────────
# Global exception handlers
# ──────────────────────────────────────────────

@app.exception_handler(ValidationError)
async def pydantic_validation_error_handler(request: Request, exc: ValidationError):
    """Return structured Pydantic validation errors instead of raw 500s."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.warning(f"[{request_id}] Validation error: {exc.error_count()} errors")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "request_id": request_id,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all for any unhandled exceptions."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{request_id}] Unhandled exception: {type(exc).__name__}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please try again.",
            "request_id": request_id,
        },
    )


# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────

app.include_router(judges.router, prefix="/api/judging/judges", tags=["Judges"])
app.include_router(rubrics.router, prefix="/api/judging/rubrics", tags=["Rubrics"])
app.include_router(allocation.router, prefix="/api/judging/allocations", tags=["Allocations"])
app.include_router(scoring.router, prefix="/api/judging/scores", tags=["Scoring"])
app.include_router(ranking.router, prefix="/api/judging/rankings", tags=["Rankings"])


# ──────────────────────────────────────────────
# Root endpoints
# ──────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "EMS Judging System API",
        "port": 8003,
    }


@app.get("/")
def root():
    """Root endpoint with API info."""
    return {
        "service": "EMS SET C Backend — Judging System",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "judges": "/api/judging/judges",
            "rubrics": "/api/judging/rubrics",
            "allocations": "/api/judging/allocations",
            "scores": "/api/judging/scores",
            "rankings": "/api/judging/rankings",
        },
    }
