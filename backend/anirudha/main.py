from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import attendance, mentors, helpdesk, sponsors, admin, analytics

app = FastAPI(title="EMS - Set D API", description="On-Ground Ops, Sponsors & Admin Control")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust as needed for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(attendance.router)
app.include_router(mentors.router)
app.include_router(helpdesk.router)
app.include_router(sponsors.router)
app.include_router(admin.router)
app.include_router(analytics.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Set D - On-Ground Ops, Sponsors & Admin Control API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
