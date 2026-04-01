# HackOdyssey Unified API Schema

> **Base URL:** `http://localhost:8000`  
> **Auth:** Firebase ID Token via `Authorization: Bearer <token>` header  
> **Docs:** `http://localhost:8000/docs` (Swagger UI)

## Table of Contents

| # | Module | Prefix | Endpoints |
|---|--------|--------|-----------|
| 1 | [Auth](#post-apiauthverify-token) | `/api/auth` | 4 |
| 2 | [Registration](#post-apiregistrationschema) | `/api/registration` | 7 |
| 3 | [Teams](#get-apiteams) | `/api/teams` | 9 |
| 4 | [Finance](#get-apifinance) | `/api/finance` | 3 |
| 5 | [Automation](#post-apiautomationcertificatesgenerate) | `/api/automation` | 2 |
| 6 | [Judges](#post-apijudgingjudgesinvite) | `/api/judging/judges` | 6 |
| 7 | [Rubrics](#post-apijudgingrubrics) | `/api/judging/rubrics` | 4 |
| 8 | [Allocations](#post-apijudgingallocationsauto) | `/api/judging/allocations` | 3 |
| 9 | [Scoring](#post-apijudgingscores) | `/api/judging/scores` | 4 |
| 10 | [Rankings](#get-apijudgingrankingsevent_id) | `/api/judging/rankings` | 3 |
| 11 | [Phases](#get-apiphases) | `/api/phases` | 6 |
| 12 | [Announcements](#get-apiannouncements) | `/api/announcements` | 3 |
| 13 | [Attendance / Check-in](#post-apicheckinattendancecheck-in) | `/api/checkin` | 4 |
| 14 | [Helpdesk](#post-apihelpdeskhelp) | `/api/helpdesk` | 3 |
| 15 | [Mentors](#get-apimentorsmentors) | `/api/mentors` | 5 |
| 16 | [Sponsors](#post-apisponsorssponsorstracks) | `/api/sponsors` | 4 |
| 17 | [Admin](#patch-apiadminroles) | `/api` | 2 |
| 18 | [Analytics](#get-apianalyticsoverview) | `/api` | 2 |

**Total: 74 endpoints**

---


## POST /api/auth/verify-token
**Description:** Verify Token

Verify a Firebase ID token sent from the frontend via the Authorization header.
Returns the decoded user info and checks if a Firestore profile exists.


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/auth/create-profile
**Description:** Create User Profile

Create or update a user profile in Firestore.
Protected: Only the authenticated user can create/update their own profile.
Enforces one-person-one-account by checking for existing email duplicates.


### Request Payload
```json
{
  "uid": "string",
  "email": "string",
  "display_name": "string",
  "role": "participant",
  "institution": "string",
  "phone": "string"
}
```


### Sample Response
Status 200:
```json
{
  "uid": "string",
  "email": "string",
  "display_name": "string",
  "role": "string",
  "institution": "string",
  "phone": "string",
  "team_id": "string",
  "created_at": "string"
}
```

---

## GET /api/auth/profile/{uid}
**Description:** Get User Profile

Retrieve a user profile from Firestore by UID.
Protected: Any authenticated user can view basic profiles (e.g., for team info).


### Sample Response
Status 200:
```json
{
  "uid": "string",
  "email": "string",
  "display_name": "string",
  "role": "string",
  "institution": "string",
  "phone": "string",
  "team_id": "string",
  "created_at": "string"
}
```

---

## PUT /api/auth/profile/{uid}/role
**Description:** Update User Role

Update a user's role. 
Protected: Admin-only operation.


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/registration/schema
**Description:** Save Form Schema

Save or update a registration form schema for an event.
Admin-only operation.


### Request Payload
```json
{
  "event_id": "string",
  "form_title": "Registration Form",
  "fields": [
    {
      "id": "string",
      "type": "string",
      "label": "string",
      "placeholder": "",
      "required": false,
      "options": [
        {}
      ],
      "conditional": {}
    }
  ]
}
```


### Sample Response
Status 200:
```json
{
  "event_id": "string",
  "form_title": "string",
  "fields": [
    {
      "id": "string",
      "type": "string",
      "label": "string",
      "placeholder": "",
      "required": false,
      "options": [
        {}
      ],
      "conditional": {}
    }
  ],
  "created_at": "string",
  "updated_at": "string"
}
```

---

## GET /api/registration/schema/{event_id}
**Description:** Get Form Schema

Retrieve the registration form schema.
Protected: Any authenticated user can view schemas to register.


### Sample Response
Status 200:
```json
{
  "event_id": "string",
  "form_title": "string",
  "fields": [
    {
      "id": "string",
      "type": "string",
      "label": "string",
      "placeholder": "",
      "required": false,
      "options": [
        {}
      ],
      "conditional": {}
    }
  ],
  "created_at": "string",
  "updated_at": "string"
}
```

---

## GET /api/registration/schemas
**Description:** List Form Schemas

List all events that have a form schema defined. (Admin only)


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/registration/submit
**Description:** Submit Registration

Submit a registration form.
Protected: Validates UID spoofing.


### Request Payload
```json
{
  "uid": "string",
  "event_id": "string",
  "responses": {}
}
```


### Sample Response
Status 200:
```json
{
  "uid": "string",
  "event_id": "string",
  "responses": {},
  "status": "pending",
  "submitted_at": "string"
}
```

---

## GET /api/registration/status/{uid}
**Description:** Get Registration Status

Get the registration status. Users can only view their own.


### Sample Response
Status 200:
```json
{
  "uid": "string",
  "event_id": "string",
  "responses": {},
  "status": "pending",
  "submitted_at": "string"
}
```

---

## PUT /api/registration/status/{uid}
**Description:** Update Registration Status

Admin-only status update.


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/registration/all/{event_id}
**Description:** Get All Registrations

Get all registrations for an event (Admin only).


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/teams/
**Description:** List All Teams

List all teams (Admin only).


### Sample Response
Status 200:
```json
[
  {
    "team_id": "string",
    "name": "string",
    "invite_code": "string",
    "track": "string",
    "created_by": "string",
    "members": [
      "string"
    ],
    "member_details": [
      {}
    ],
    "looking_for": "string",
    "description": "string",
    "max_size": 0,
    "min_size": 0,
    "locked": false,
    "lock_deadline": "string",
    "created_at": "string"
  }
]
```

---

## POST /api/teams/create
**Description:** Create Team

Create a new team. Protected by auth.


### Request Payload
```json
{
  "name": "string",
  "track": "string",
  "created_by": "string",
  "looking_for": "string",
  "description": "string",
  "max_size": 4,
  "min_size": 2,
  "institution_constraint": "string"
}
```


### Sample Response
Status 200:
```json
{
  "team_id": "string",
  "name": "string",
  "invite_code": "string",
  "track": "string",
  "created_by": "string",
  "members": [
    "string"
  ],
  "member_details": [
    {}
  ],
  "looking_for": "string",
  "description": "string",
  "max_size": 0,
  "min_size": 0,
  "locked": false,
  "lock_deadline": "string",
  "created_at": "string"
}
```

---

## POST /api/teams/join
**Description:** Join Team

Join a team. Protected by auth and fully transactional to prevent
exceeding maximum capacity in race conditions.


### Request Payload
```json
{
  "uid": "string",
  "invite_code": "string"
}
```


### Sample Response
Status 200:
```json
{
  "team_id": "string",
  "name": "string",
  "invite_code": "string",
  "track": "string",
  "created_by": "string",
  "members": [
    "string"
  ],
  "member_details": [
    {}
  ],
  "looking_for": "string",
  "description": "string",
  "max_size": 0,
  "min_size": 0,
  "locked": false,
  "lock_deadline": "string",
  "created_at": "string"
}
```

---

## POST /api/teams/leave
**Description:** Leave Team

Leave a team. Transactional to handle leadership transfer properly.


### Request Payload
```json
{
  "uid": "string",
  "team_id": "string"
}
```


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/teams/{team_id}
**Description:** Get Team

Get team details (Protected).


### Sample Response
Status 200:
```json
{
  "team_id": "string",
  "name": "string",
  "invite_code": "string",
  "track": "string",
  "created_by": "string",
  "members": [
    "string"
  ],
  "member_details": [
    {}
  ],
  "looking_for": "string",
  "description": "string",
  "max_size": 0,
  "min_size": 0,
  "locked": false,
  "lock_deadline": "string",
  "created_at": "string"
}
```

---

## GET /api/teams/my-team/{uid}
**Description:** Get My Team

Get the user's current team (Protected).


### Sample Response
Status 200:
```json
{}
```

---

## PUT /api/teams/lock/{team_id}
**Description:** Lock Team

Lock a team (Admin only).


### Request Payload
```json
{
  "lock_deadline": "string"
}
```


### Sample Response
Status 200:
```json
{}
```

---

## PUT /api/teams/unlock/{team_id}
**Description:** Unlock Team

Unlock a team (Admin only).


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/teams/browse/open
**Description:** Browse Open Teams

Browse open teams (Protected).


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/finance/
**Description:** Test Finance

### Sample Response
Status 200:
```json
{}
```

---

## POST /api/finance/upload
**Description:** Ingest Bank Statement

Ingests a CSV bank statement.
Expected CSV columns: Date, Description, Amount


### Request Payload
```json
{}
```


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/finance/upload-receipt
**Description:** Upload Receipt

Uploads a receipt image to Firebase Storage and returns the download URL.
This bypasses CORS issues by performing the upload server-side.


### Request Payload
```json
{}
```


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/automation/certificates/generate
**Description:** Generate Certificate

Generates a PDF certificate and returns it as a downloadable file.


### Request Payload
```json
{
  "name": "string",
  "role": "Participant",
  "track": "General",
  "project_name": "",
  "email": "string"
}
```


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/automation/email/blast
**Description:** Email Blast

Sends an email blast to an array of users.
Can optionally generate and attach a certificate on the fly.


### Request Payload
```json
{
  "to_emails": [
    "string"
  ],
  "subject": "string",
  "body": "string",
  "include_certificate_for": "string",
  "role": "Participant",
  "track": "General",
  "project_name": ""
}
```


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/judging/judges/invite
**Description:** Invite Judge

Invite a new judge by email. Creates a judge profile in Firestore.


### Request Payload
```json
{
  "email": "string",
  "name": "string",
  "expertise_tags": [
    "string"
  ],
  "organization": "string"
}
```


### Sample Response
Status 200:
```json
{
  "judge_id": "string",
  "email": "string",
  "name": "string",
  "expertise_tags": [],
  "organization": "string",
  "coi_flags": [],
  "assigned_count": 0,
  "reviewed_count": 0,
  "created_at": "string"
}
```

---

## GET /api/judging/judges/
**Description:** List Judges

List all judges.


### Sample Response
Status 200:
```json
[
  {
    "judge_id": "string",
    "email": "string",
    "name": "string",
    "expertise_tags": [],
    "organization": "string",
    "coi_flags": [],
    "assigned_count": 0,
    "reviewed_count": 0,
    "created_at": "string"
  }
]
```

---

## GET /api/judging/judges/{judge_id}
**Description:** Get Judge

Get a single judge profile.


### Sample Response
Status 200:
```json
{
  "judge_id": "string",
  "email": "string",
  "name": "string",
  "expertise_tags": [],
  "organization": "string",
  "coi_flags": [],
  "assigned_count": 0,
  "reviewed_count": 0,
  "created_at": "string"
}
```

---

## PUT /api/judging/judges/{judge_id}
**Description:** Update Judge

Update judge profile (expertise tags, organization, name).


### Request Payload
```json
{
  "expertise_tags": [
    "string"
  ],
  "organization": "string",
  "name": "string"
}
```


### Sample Response
Status 200:
```json
{
  "judge_id": "string",
  "email": "string",
  "name": "string",
  "expertise_tags": [],
  "organization": "string",
  "coi_flags": [],
  "assigned_count": 0,
  "reviewed_count": 0,
  "created_at": "string"
}
```

---

## DELETE /api/judging/judges/{judge_id}
**Description:** Remove Judge

Remove a judge profile.


### Sample Response
Status 200:
```json
{}
```

---

## PUT /api/judging/judges/{judge_id}/coi
**Description:** Flag Coi

Flag a conflict of interest for a judge on a specific project.


### Request Payload
```json
{
  "project_id": "string",
  "reason": "string"
}
```


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/judging/rubrics/
**Description:** Create Rubric

Create a new scoring rubric for an event.


### Request Payload
```json
{
  "event_id": "string",
  "name": "Default Rubric",
  "criteria": [
    {
      "id": "string",
      "name": "string",
      "weight": 0.0,
      "max_score": 10,
      "description": "string"
    }
  ],
  "round": "round_1"
}
```


### Sample Response
Status 200:
```json
{
  "rubric_id": "string",
  "event_id": "string",
  "name": "string",
  "criteria": [
    {
      "id": "string",
      "name": "string",
      "weight": 0.0,
      "max_score": 10,
      "description": "string"
    }
  ],
  "round": "string",
  "total_weight": 100.0,
  "created_at": "string",
  "updated_at": "string"
}
```

---

## GET /api/judging/rubrics/{event_id}
**Description:** Get Rubrics

Get all rubrics for an event.


### Sample Response
Status 200:
```json
[
  {
    "rubric_id": "string",
    "event_id": "string",
    "name": "string",
    "criteria": [
      {
        "id": "string",
        "name": "string",
        "weight": 0.0,
        "max_score": 10,
        "description": {}
      }
    ],
    "round": "string",
    "total_weight": 100.0,
    "created_at": "string",
    "updated_at": "string"
  }
]
```

---

## PUT /api/judging/rubrics/{rubric_id}
**Description:** Update Rubric

Update an existing rubric.


### Request Payload
```json
{
  "event_id": "string",
  "name": "Default Rubric",
  "criteria": [
    {
      "id": "string",
      "name": "string",
      "weight": 0.0,
      "max_score": 10,
      "description": "string"
    }
  ],
  "round": "round_1"
}
```


### Sample Response
Status 200:
```json
{
  "rubric_id": "string",
  "event_id": "string",
  "name": "string",
  "criteria": [
    {
      "id": "string",
      "name": "string",
      "weight": 0.0,
      "max_score": 10,
      "description": "string"
    }
  ],
  "round": "string",
  "total_weight": 100.0,
  "created_at": "string",
  "updated_at": "string"
}
```

---

## DELETE /api/judging/rubrics/{rubric_id}
**Description:** Delete Rubric

Delete a rubric.


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/judging/allocations/auto
**Description:** Auto Allocate

Intelligent auto-allocation algorithm based on dynamic scoring.
1. Score judges per project (-1 to skip, +10 match track, -2 per existing assign).
2. Respect strict COI and duplicate assignment checks.
3. Update judge load dynamically to balance distribution.


### Request Payload
```json
{
  "event_id": "string",
  "round": "round_1",
  "projects_per_judge": 5,
  "judges_per_project": 3
}
```


### Sample Response
Status 200:
```json
{}
```

---

## PUT /api/judging/allocations/{allocation_id}
**Description:** Override Allocation

Manual override: assign or remove a judge from a project.


### Request Payload
```json
{
  "judge_id": "string",
  "project_id": "string",
  "action": "string",
  "round": "round_1"
}
```


### Sample Response
Status 200:
```json
{
  "allocation_id": "string",
  "judge_id": "string",
  "judge_name": "string",
  "project_id": "string",
  "project_title": "string",
  "track": "string",
  "status": "assigned",
  "round": "round_1",
  "assigned_at": "string"
}
```

---

## GET /api/judging/allocations/
**Description:** List Allocations

List all allocations, optionally filtered by event and round.


### Sample Response
Status 200:
```json
[
  {
    "allocation_id": "string",
    "judge_id": "string",
    "judge_name": "string",
    "project_id": "string",
    "project_title": "string",
    "track": "string",
    "status": "assigned",
    "round": "round_1",
    "assigned_at": "string"
  }
]
```

---

## GET /api/judging/allocations/judge/{judge_id}
**Description:** Get Judge Allocations

Get all allocations for a specific judge.


### Sample Response
Status 200:
```json
[
  {
    "allocation_id": "string",
    "judge_id": "string",
    "judge_name": "string",
    "project_id": "string",
    "project_title": "string",
    "track": "string",
    "status": "assigned",
    "round": "round_1",
    "assigned_at": "string"
  }
]
```

---

## POST /api/judging/scores/
**Description:** Submit Score

Submit an evaluation score for a project.


### Request Payload
```json
{
  "event_id": "string",
  "project_id": "string",
  "round": "round_1",
  "criteria_scores": [
    {
      "criteria_id": "string",
      "score": 0.0,
      "comment": "string"
    }
  ],
  "overall_comment": "string",
  "private_notes": "string"
}
```


### Sample Response
Status 200:
```json
{
  "score_id": "string",
  "judge_id": "string",
  "judge_name": "string",
  "project_id": "string",
  "project_title": "string",
  "event_id": "string",
  "round": "string",
  "criteria_scores": [
    {
      "criteria_id": "string",
      "score": 0.0,
      "comment": "string"
    }
  ],
  "weighted_total": 0.0,
  "overall_comment": "string",
  "private_notes": "string",
  "submitted_at": "string"
}
```

---

## GET /api/judging/scores/project/{project_id}
**Description:** Get Project Scores

Get all scores for a specific project (admin only).


### Sample Response
Status 200:
```json
[
  {
    "score_id": "string",
    "judge_id": "string",
    "judge_name": "string",
    "project_id": "string",
    "project_title": "string",
    "event_id": "string",
    "round": "string",
    "criteria_scores": [
      {
        "criteria_id": "string",
        "score": 0.0,
        "comment": {}
      }
    ],
    "weighted_total": 0.0,
    "overall_comment": "string",
    "private_notes": "string",
    "submitted_at": "string"
  }
]
```

---

## GET /api/judging/scores/judge/{judge_id}
**Description:** Get Judge Scores

Get all evaluations submitted by a specific judge.


### Sample Response
Status 200:
```json
[
  {
    "score_id": "string",
    "judge_id": "string",
    "judge_name": "string",
    "project_id": "string",
    "project_title": "string",
    "event_id": "string",
    "round": "string",
    "criteria_scores": [
      {
        "criteria_id": "string",
        "score": 0.0,
        "comment": {}
      }
    ],
    "weighted_total": 0.0,
    "overall_comment": "string",
    "private_notes": "string",
    "submitted_at": "string"
  }
]
```

---

## GET /api/judging/scores/{score_id}
**Description:** Get Score

Get a single evaluation by ID.


### Sample Response
Status 200:
```json
{
  "score_id": "string",
  "judge_id": "string",
  "judge_name": "string",
  "project_id": "string",
  "project_title": "string",
  "event_id": "string",
  "round": "string",
  "criteria_scores": [
    {
      "criteria_id": "string",
      "score": 0.0,
      "comment": "string"
    }
  ],
  "weighted_total": 0.0,
  "overall_comment": "string",
  "private_notes": "string",
  "submitted_at": "string"
}
```

---

## GET /api/judging/rankings/{event_id}
**Description:** Get Rankings

Get aggregated rankings for an event.


### Sample Response
Status 200:
```json
{
  "event_id": "string",
  "round": "string",
  "rankings": [
    {
      "project_id": "string",
      "project_title": "string",
      "team_name": "string",
      "track": "string",
      "avg_weighted_score": 0.0,
      "total_evaluations": 0,
      "rank": 0,
      "shortlisted": false
    }
  ],
  "total_projects": 0,
  "total_evaluated": 0
}
```

---

## POST /api/judging/rankings/{event_id}/shortlist
**Description:** Shortlist Projects

Shortlist selected projects to advance to the next round.


### Request Payload
```json
{
  "project_ids": [
    "string"
  ],
  "round": "round_1",
  "advance_to": "finals"
}
```


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/judging/rankings/{event_id}/export
**Description:** Export Winners

Export the top N ranked projects as a winner list.


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/phases/
**Description:** Get All Phases

Return all phases ordered by their `order` field.


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/phases/
**Description:** Create Phase

Admin only. Create a new event phase in Firestore.
Phases define the event lifecycle: Registration → Team Formation → Ideation
→ Development → Submission → Judging


### Request Payload
```json
{
  "name": "string",
  "order": 0,
  "description": "string",
  "featureFlags": {
    "allowEdits": true,
    "allowSubmission": false,
    "allowJudging": false
  }
}
```


### Sample Response
Status 201:
```json
{}
```

---

## GET /api/phases/current
**Description:** Get Current Phase

Return the currently active phase.


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/phases/set-active
**Description:** Set Active Phase

Admin only. Deactivates all phases, then sets the specified phase as active.


### Request Payload
```json
{
  "phaseId": "string"
}
```


### Sample Response
Status 200:
```json
{}
```

---

## PATCH /api/phases/flags
**Description:** Update Feature Flags

Admin only. Update the feature flags for a specific phase.


### Request Payload
```json
{
  "phaseId": "string",
  "featureFlags": {
    "allowEdits": true,
    "allowSubmission": false,
    "allowJudging": false
  }
}
```


### Sample Response
Status 200:
```json
{}
```

---

## DELETE /api/phases/{phase_id}
**Description:** Delete Phase

Admin only. Delete a phase by its Firestore document ID.


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/announcements/
**Description:** Get Announcements

Return all announcements ordered newest-first.
If `track` is provided, returns announcements targeting 'all' OR the given track.


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/announcements/
**Description:** Create Announcement

Admin only. Create a new announcement for all or a specific track.


### Request Payload
```json
{
  "title": "string",
  "body": "string",
  "targetTrack": "all"
}
```


### Sample Response
Status 201:
```json
{}
```

---

## DELETE /api/announcements/{announcement_id}
**Description:** Delete Announcement

Admin only. Delete an announcement by its Firestore document ID.


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/checkin/attendance/check-in
**Description:** Check In

Mark a participant as present for a specific phase.


### Request Payload
```json
{
  "qr_data": "string",
  "phase_id": "string"
}
```


### Sample Response
Status 200:
```json
{
  "uid": "string",
  "phase_id": "string",
  "status": "string",
  "timestamp": "2025-01-01T00:00:00Z",
  "recorded_by": "string"
}
```

---

## GET /api/checkin/attendance/stats/{phase_id}
**Description:** Get Attendance Stats

Get attendance statistics for a specific phase.


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/checkin/attendance/qr/{usn}
**Description:** Generate Qr For Usn

Generate a QR code for a specific USN with expiry. Returns base64 PNG.


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/checkin/attendance/qr-blast
**Description:** Blast Qr Codes

Blast QR attendance codes to participants via email.
Each participant gets a personalized QR code with expiry embedded in the same
email as their participation certificate (if include_certificate is True).
Uses the same SMTP infrastructure as certificate blasting.


### Request Payload
```json
{
  "usns": [
    "string"
  ],
  "event_id": "hackodyssey2026",
  "expiry_hours": 24,
  "include_certificate": false
}
```


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/helpdesk/helpdesk/
**Description:** Create Ticket

Raise a new helpdesk ticket.


### Request Payload
```json
{
  "ticket_id": "string",
  "raised_by_uid": "string",
  "title": "string",
  "description": "string",
  "category": "string",
  "priority": "medium",
  "status": "open",
  "assigned_to_uid": "string",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```


### Sample Response
Status 200:
```json
{
  "ticket_id": "string",
  "raised_by_uid": "string",
  "title": "string",
  "description": "string",
  "category": "string",
  "priority": "medium",
  "status": "open",
  "assigned_to_uid": "string",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

---

## GET /api/helpdesk/helpdesk/
**Description:** List Tickets

List tickets (participants see their own, admins/volunteers see all).


### Sample Response
Status 200:
```json
{}
```

---

## PATCH /api/helpdesk/helpdesk/{ticket_id}
**Description:** Update Ticket

Update ticket status, priority, or assignment.


### Request Payload
```json
{
  "status": "string",
  "priority": "string",
  "assigned_to_uid": "string",
  "comment": "string"
}
```


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/mentors/mentors/
**Description:** List Mentors

List all available mentors and their profiles.


### Sample Response
Status 200:
```json
[
  {
    "uid": "string",
    "display_name": "string",
    "expertise": [
      "string"
    ],
    "availability": [
      {}
    ],
    "bio": "string"
  }
]
```

---

## POST /api/mentors/mentors/
**Description:** Create Mentor

Create a new mentor profile (admin-only).


### Request Payload
```json
{
  "uid": "string",
  "display_name": "string",
  "expertise": [
    "string"
  ],
  "availability": [
    {}
  ],
  "bio": "string"
}
```


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/mentors/mentors/book
**Description:** Book Slot

Book a mentor slot for a team using a transaction.


### Request Payload
```json
{
  "mentor_uid": "string",
  "slot_index": 0,
  "team_id": "string"
}
```


### Sample Response
Status 200:
```json
{}
```

---

## DELETE /api/mentors/mentors/{uid}
**Description:** Delete Mentor

Delete a mentor profile (admin-only).


### Sample Response
Status 200:
```json
{}
```

---

## PATCH /api/mentors/mentors/profile
**Description:** Update Mentor Profile

Update mentor profile (only by the mentor or admin).


### Request Payload
```json
{
  "uid": "string",
  "display_name": "string",
  "expertise": [
    "string"
  ],
  "availability": [
    {}
  ],
  "bio": "string"
}
```


### Sample Response
Status 200:
```json
{}
```

---

## POST /api/sponsors/sponsors/tracks
**Description:** Create Track

Create a new track for the hackathon.


### Request Payload
```json
{
  "track_id": "string",
  "name": "string",
  "description": "string",
  "problem_statements": [],
  "sponsor": "string",
  "sponsor_id": "string",
  "eligibility_rules": "string",
  "enrolled_teams": 0
}
```


### Sample Response
Status 200:
```json
{
  "track_id": "string",
  "name": "string",
  "description": "string",
  "problem_statements": [],
  "sponsor": "string",
  "sponsor_id": "string",
  "eligibility_rules": "string",
  "enrolled_teams": 0
}
```

---

## GET /api/sponsors/sponsors/tracks
**Description:** List Tracks

List all hackathon tracks.


### Sample Response
Status 200:
```json
[
  {
    "track_id": "string",
    "name": "string",
    "description": "string",
    "problem_statements": [],
    "sponsor": "string",
    "sponsor_id": "string",
    "eligibility_rules": "string",
    "enrolled_teams": 0
  }
]
```

---

## POST /api/sponsors/sponsors/
**Description:** Add Sponsor

Add a new sponsor.


### Request Payload
```json
{
  "sponsor_id": "string",
  "name": "string",
  "tier": "string",
  "industry": "string",
  "logo_url": "string",
  "website_url": "string",
  "metrics": {}
}
```


### Sample Response
Status 200:
```json
{
  "sponsor_id": "string",
  "name": "string",
  "tier": "string",
  "industry": "string",
  "logo_url": "string",
  "website_url": "string",
  "metrics": {}
}
```

---

## GET /api/sponsors/sponsors/
**Description:** List Sponsors

List all sponsors.


### Sample Response
Status 200:
```json
[
  {
    "sponsor_id": "string",
    "name": "string",
    "tier": "string",
    "industry": "string",
    "logo_url": "string",
    "website_url": "string",
    "metrics": {}
  }
]
```

---

## PATCH /api/admin/roles
**Description:** Update User Role

Update a user's role (Super Admin / Organizer only).


### Request Payload
```json
{
  "uid": "string",
  "new_role": "string"
}
```


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/admin/users
**Description:** List Users With Roles

List all users with their current roles.


### Sample Response
Status 200:
```json
{}
```

---

## GET /api/analytics/overview
**Description:** Get Overview Stats

Get aggregated statistics for the admin dashboard.


### Sample Response
Status 200:
```json
{
  "total_registrations": 0,
  "teams_formed": 0,
  "attendance_rate": 0.0,
  "tickets_resolved": 0,
  "projects_submitted": 0,
  "finance_reconciled": 0.0,
  "top_tracks": [
    {}
  ]
}
```

---

## GET /api/analytics/export
**Description:** Export Collection Csv

Export any Firestore collection as a downloadable CSV file.


### Sample Response
Status 200:
```json
{}
```

---

## GET /
**Description:** Root

### Sample Response
Status 200:
```json
{}
```

---

## GET /health
**Description:** Health Check

### Sample Response
Status 200:
```json
{}
```

---
