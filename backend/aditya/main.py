"""
EMS Backend — Registration, Auth & Database Service (SET A)

FastAPI application serving authentication, registration form management,
and team formation APIs. Runs on port 8002.

Robustness features:
- Global exception handlers for structured error responses
- Request ID tracking for debugging
- Structured logging
- CORS with configurable origins
- Startup/shutdown lifecycle events

Run with:
    cd backend/aditya
    uvicorn main:app --reload --port 8002
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.routers import auth, registration, teams

# ──────────────────────────────────────────────
# Structured Logging
# ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ems.set_a")


# ──────────────────────────────────────────────
# Lifecycle events
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 EMS SET A Backend starting up on port 8002")
    logger.info("📖 API docs available at http://localhost:8002/docs")

    # Lazy-init Firebase on startup so errors are caught early
    try:
        from app.firebase_config import get_firestore_client
        get_firestore_client()
        logger.info("✅ Firebase Admin SDK initialized successfully")
    except FileNotFoundError as e:
        logger.warning(f"⚠️  Firebase not configured: {e}")
        logger.warning("   The server will run but auth+DB endpoints will fail.")
    except Exception as e:
        logger.error(f"❌ Firebase initialization failed: {e}")

    yield

    logger.info("👋 EMS SET A Backend shutting down")


# ──────────────────────────────────────────────
# App initialization
# ──────────────────────────────────────────────

app = FastAPI(
    title="EMS — Auth, Registration & Teams API",
    description=(
        "Backend service for SET A of the Hackathon Event Management System.\n\n"
        "Handles:\n"
        "- Firebase Authentication token verification & user profiles\n"
        "- Custom registration form schema management\n"
        "- Team formation with invite codes and constraints\n\n"
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

        # Only log API routes (skip favicon, static, etc.)
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
    """Catch-all for any unhandled exceptions — never expose stack traces to clients."""
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

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(registration.router, prefix="/api/registration", tags=["Registration"])
app.include_router(teams.router, prefix="/api/teams", tags=["Teams"])


# ──────────────────────────────────────────────
# Root endpoints
# ──────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "EMS Auth, Registration & Teams API",
        "port": 8002,
    }


@app.get("/")
def root():
    """Root endpoint with API info."""
    return {
        "service": "EMS SET A Backend",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "auth": "/api/auth",
            "registration": "/api/registration",
            "teams": "/api/teams",
        },
    }
