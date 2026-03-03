# Hackathon EMS — Team Work Division

> **Rohan** has started working on the **Finance & Automation part**.
> The remaining features from the master plan are divided below into **4 equal sets**.
> Each teammate picks **one set**, creates `backend/<yourname>/` and `frontend` pages as needed, and we integrate at the end.

---

## 🟦 SET A — Registration, Authentication & Database


> Core of the platform. Everything else depends on this working first.

### 🔐 Authentication & Identity
- Email / OTP login system
- Optional OAuth (Google / GitHub)
- One-person-one-account enforcement
- Firebase Authentication integration

### 🧾 Custom Registration Builder
- Drag-and-drop form builder (field types: text, dropdown, file upload, checkbox)
- Conditional logic: "If student → ask college", "If team → ask role"
- Track-specific custom questions
- Store form schema in Firebase Firestore

### 👥 Team Formation Engine
- Create / join teams during registration
- Invite via email link / unique code
- Team constraints: max/min size, same/different institution
- Auto-lock team edits after deadline cutoff

### 🗄️ Database Layer (Firebase Firestore)
- User profiles and roles collection
- Teams and registrations collection
- Event configuration collection schema
- Real-time listeners for dashboard updates

**Tech:** Next.js (frontend forms), FastAPI or Node.js (backend validation), Firebase Auth + Firestore

---

## 🟩 SET B — Participant Dashboard & Event Flow Control


> Everything the participant sees and interacts with during the event.

### 📌 Personal Participant Dashboard
- Registration status card
- Team details and team code display
- Event timeline / schedule view
- Announcements feed (reads from Firestore)

### 🧑‍💻 Team Workspace
- Team chat / shared notes section
- Problem statement selection
- Project details form: title, abstract, tech stack, GitHub / Drive links
- Submission history tracker

### ⏳ Phase-Based Event Engine
- Admin panel to define event stages: Registration → Team Formation → Ideation → Development → Submission → Judging
- Feature gating per phase: disable edits, lock submissions, open judging panel
- Phase progress indicator on participant dashboard

### 📢 In-App Communication Hub
- In-app announcement creation (admin side)
- Announcement feed rendering (participant side)
- Role/track-specific message targeting (e.g. "Only AI Track participants")
- *(Email blast is handled by Rohan's automation module)*

**Tech:** Next.js (frontend), Firebase Firestore (announcements), FastAPI (phase control API)

---

## 🟨 SET C — Judging System


> The highest-impact backend module.

### 🧑‍⚖️ Judge Onboarding
- Admin panel to invite judges via email (uses Rohan's email API)
- Judge profile page with expertise tags (e.g. AI/ML, Web, Blockchain)
- Conflict-of-interest flagging mechanism

### 🧠 Smart Project Allocation
- Auto-assign projects to judges by: track match, expertise tags, balanced judge load
- Manual override panel for admins
- Assignment status tracking (Assigned / Pending / Reviewed)

### 📝 Scoring & Feedback
- Configurable rubric builder (admin creates criteria + weights, e.g. Innovation 30%, Execution 40%, Presentation 30%)
- Weighted scoring form for judges per project
- Comments + private notes per evaluation
- Multi-round evaluation support (Round 1 shortlist → Finals)

### 📊 Ranking Engine
- Live score aggregation from all judge inputs
- Round-wise shortlisting and ranking display
- Tie-breaker rules configuration
- Export winner list (uses Rohan's reporting module)

**Tech:** Next.js (judge dashboard), FastAPI (scoring logic + ranking algorithm), Firebase Firestore (scores)

---

## 🟥 SET D — On-Ground Ops, Sponsors & Admin Control


> Everything that runs on the day of the event plus admin superpowers. 

### 🏷 QR Check-In System
- Digital QR badge generation per participant upon registration
- QR scanner interface for volunteers (mobile-friendly)
- Attendance tracking: present / absent per phase
- Role-based access validation at entry (Participant / Judge / Mentor / Volunteer)

### 🧑‍🏫 Mentor System
- Mentor profile pages with expertise and availability
- Slot booking interface (teams book time slots with mentors)
- Session history log per team

### 🆘 Helpdesk Module
- Participants raise issue tickets (technical / logistics / queries)
- Priority routing (Low / Medium / High / Urgent)
- Admin assignment and routing dashboard
- Ticket status tracking (Open / In Progress / Resolved)

### 🏆 Sponsor & Track Management
- Track creation panel: problem statements, sponsor association, eligibility rules
- Sponsor dashboard: engagement metrics, shortlisted project visibility
- Controlled winner access for sponsors

### 🔐 Admin Control Center — RBAC
- Role definitions: Super Admin, Organizer, Judge, Mentor, Volunteer
- Role assignment panel per user
- Page/feature access control based on active role

### 📊 Admin Analytics Dashboard
- Registration funnel visualization
- Team formation stats and drop-off points
- Judge scoring variance charts
- CSV / Excel export of any data table

**Tech:** Next.js (admin + volunteer UI), FastAPI (QR generation, ticket routing), Firebase Firestore (attendance, tickets)

---

## 📌 Integration Notes
At the end, all 4 sets will be merged into one unified FastAPI app and connected to a shared Firebase project. 

## 🗓️ Setup Instructions for Each Teammate
1. Pull the latest `main` branch
2. Create your backend folder: `backend/<yourname>/`
3. Create your Next.js pages under `frontend/src/app/dashboard/` 
4. Run your FastAPI server on your assigned port (see `backend/README.md`)
5. Raise a PR when done — we integrate together
