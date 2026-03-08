from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import (
    auth, teams, registration,
    finance, automation,
    phases,
    attendance, helpdesk, mentors, sponsors,
    allocation, judges, ranking, rubrics, scoring
)

app = FastAPI(title="HackOdyssey Unified API")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Aditya's Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(registration.router, prefix="/api/registration", tags=["Registration"])
app.include_router(teams.router, prefix="/api/teams", tags=["Teams"])

# Rohan's Routers
app.include_router(finance.router, prefix="/api/finance", tags=["Finance"])
app.include_router(automation.router, prefix="/api/automation", tags=["Automation"])

# Sandesh's Routers (Judging)
app.include_router(judges.router, prefix="/api/judging/judges", tags=["Judges"])
app.include_router(rubrics.router, prefix="/api/judging/rubrics", tags=["Rubrics"])
app.include_router(allocation.router, prefix="/api/judging/allocations", tags=["Allocations"])
app.include_router(scoring.router, prefix="/api/judging/scores", tags=["Scoring"])
app.include_router(ranking.router, prefix="/api/judging/rankings", tags=["Rankings"])

# Aparna's Router
app.include_router(phases.router, prefix="/api/phases", tags=["Phases"])

# Anirudha's Routers
app.include_router(attendance.router, prefix="/api/checkin", tags=["Attendance / Checkin"])
app.include_router(helpdesk.router, prefix="/api/helpdesk", tags=["Helpdesk"])
app.include_router(mentors.router, prefix="/api/mentors", tags=["Mentors"])
app.include_router(sponsors.router, prefix="/api/sponsors", tags=["Sponsors"])

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "HackOdyssey Unified API"}
