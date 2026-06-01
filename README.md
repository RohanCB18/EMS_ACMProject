# 🚀 EMS ACM Project — Setup & Run Guide

> **Branch:** `unified-backend-final`  
> **Stack:** Next.js 16 (TypeScript) · FastAPI (Python 3.12) · Firebase / Firestore

---

## Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Python | 3.10+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | any | `git --version` |

---

## 1 · Clone the repository

```bash
git clone -b unified-backend-final https://github.com/acmrvce/EMS_ACMProject.git
cd EMS_ACMProject
```

---

## 2 · Configure secrets (required before running)

### 2a · Firebase Service Account Key (Backend)

1. Go to [Firebase Console](https://console.firebase.google.com) → your project → **Project Settings → Service accounts**
2. Click **"Generate new private key"** → download the JSON file
3. Rename it to `serviceAccountKey.json` and place it at:

```
backend/serviceAccountKey.json
```

> ⚠️ This file is in `.gitignore` and must **never** be committed.

---

### 2b · Frontend Environment Variables

Create the file `frontend/.env.local` with the following content  
(values from Firebase Console → Project Settings → General → Your apps):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_API_URL=http://localhost:8001
```

> ⚠️ This file is also in `.gitignore` and must **never** be committed.

---

## 3 · Backend Setup (FastAPI)

```bash
# Navigate to backend
cd backend

# Create a virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate          # macOS / Linux
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt
```

---

## 4 · Frontend Setup (Next.js)

```bash
# From the repo root, navigate to frontend
cd frontend

# Install dependencies
npm install
```

---

## 5 · Run the application

You need **two terminals** running simultaneously.

### Terminal 1 — Backend (FastAPI on port 8001)

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

- API base: **http://localhost:8001**
- Swagger docs: **http://localhost:8001/docs**

---

### Terminal 2 — Frontend (Next.js on port 3000)

```bash
cd frontend
npm run dev
```

- App: **http://localhost:3000**

---

## 6 · Login & Roles

| Role | Default landing page after login |
|------|----------------------------------|
| `admin` / `super_admin` / `organizer` | `/dashboard/admin/roles` (Users & RBAC) |
| `participant` | `/dashboard/participant` |
| `judge` | `/dashboard/judge` |
| `volunteer` | `/dashboard/volunteer` |

---

## 7 · Project Structure

```
EMS_ACMProject/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── middleware.py        # Auth / token verification
│   │   ├── models.py            # Pydantic models
│   │   ├── core/                # Firebase config
│   │   └── routers/             # All API route handlers
│   ├── requirements.txt
│   ├── serviceAccountKey.json   # YOU create this (gitignored)
│   └── venv/                    # Created by python3 -m venv
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/            # Login / Register pages
│   │   │   └── dashboard/
│   │   │       ├── admin/       # Admin dashboard pages
│   │   │       └── participant/ # Participant pages (incl. Helpdesk)
│   │   ├── components/          # Shared UI + layout components
│   │   └── lib/                 # API clients, Firebase init
│   ├── .env.local               # YOU create this (gitignored)
│   └── package.json
│
├── .gitignore
├── API_SCHEMA.md
└── README.md
```

---

## 8 · Common Issues

### `Token verification failed: Invalid \escape`
The `serviceAccountKey.json` has a malformed private key. Re-download the key from Firebase Console and replace the file.

### CORS errors in browser
Ensure the backend is running on **port 8001** and `NEXT_PUBLIC_API_URL=http://localhost:8001` is set in `frontend/.env.local`.

### Python `ModuleNotFoundError`
Make sure your virtual environment is activated before running uvicorn:
```bash
source backend/venv/bin/activate
```

### `npm install` errors
Clear cache and retry:
```bash
cd frontend && rm -rf node_modules package-lock.json && npm install
```
