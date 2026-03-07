from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import finance, automation

app = FastAPI(
    title="Hackathon EMS Backend",
    description="Finance & Automation APIs for the Event Management System",
    version="1.0.0"
)

# Configure CORS for Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(finance.router, prefix="/api/finance", tags=["Finance"])
app.include_router(automation.router, prefix="/api/automation", tags=["Automation"])

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "EMS Finance & Automation API"}
