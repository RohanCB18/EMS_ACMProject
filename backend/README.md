# Backend — Hackathon EMS

This folder hosts all backend microservices for the Hackathon Event Management System.

## How to Work Here

Each team member **creates their own subfolder** inside `/backend` named after themselves.

```
backend/
├── rohan/         ← Finance & Automation Engineer (complete)
├── yourname/      ← Your microservice goes here
└── README.md
```

## Setup Instructions (Each Member)

1. Create your own folder: `backend/<yourname>/`
2. Set up a Python virtual environment inside it:
   ```
   cd backend/<yourname>
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Start your FastAPI server on a **unique port** (e.g., Rohan uses `8001`, use `8002`, `8003`, etc.)
   ```
   uvicorn main:app --reload --port 8002
   ```
4. Push your changes and raise a PR. We will integrate everything at the end.

## Port Convention

| Engineer | Folder     | Port |
|----------|------------|------|
| Rohan    | /rohan     | 8001 |
| TBD      | /yourname  | 8002 |
| TBD      | /yourname2 | 8003 |

## Integration Plan
Once all individual modules are done, we will move all routers into a single unified FastAPI app and connect it to a Firebase Firestore database.
