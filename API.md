# PRECEDENT — API Specification & Canonical Catalogue

All canonical routes are hosted under `/api/v1` and fully documented in `docs/openapi.json`. Legacy root aliases are also maintained for seamless backward compatibility.

---

## 1. Authentication & Session

- `POST /api/v1/auth/login`: Signs in using email and password. Returns JWT token and UserOut record.
- `POST /api/v1/auth/logout`: Invalidates session and logs audit event.
- `POST /api/v1/auth/refresh`: Issues a refreshed JWT.
- `GET /api/v1/auth/me`: Authoritative identity and role (`creator` | `manager`).

---

## 2. Core Governance Endpoints

### Shared
- `GET /health` & `GET /ready`: System health & database readiness probes.
- `GET /api/v1/search?q=&types=`: Global role-scoped search across submissions, guidelines, rules, and assets.
- `GET /api/v1/jobs/{job_id}`: Polling endpoint for asynchronous background jobs.
- `GET /api/v1/brand-kit`: Retrieves active brand color palette, approved phrases, and mandatory disclaimers.
- `PUT /api/v1/brand-kit`: Manager update to brand kit; automatically triggers Sentinel impact scan.
- `GET /api/v1/claims` & `POST /api/v1/claims`: Registry of verified product substantiation claims.

### Content Creator
- `GET /api/v1/creator/dashboard`: Overview statistics (total, approved, in review, needs attention, open sentinel tasks).
- `POST /api/v1/submissions`: Creates new content submission with initial version and runs deterministic rule checks.
- `GET /api/v1/submissions/my`: Lists creator's content submissions.
- `GET /api/v1/submissions/{id}/report`: Generates official PDF compliance certificate.
- `POST /api/v1/exception-requests`: Requests time-bounded and scoped policy exception.
- `GET /api/v1/sentinel/tasks/my`: Retrieves reassessment tasks assigned to creator.
- `POST /api/v1/sentinel/tasks/{id}/resolution`: Submits resolution notes for reassessment task.
- `GET /api/v1/notifications`: List user notifications (filters: `all`, `unread`).

### Brand Manager
- `GET /api/v1/manager/dashboard`: Live KPI indicators (pending reviews, approved today, active exceptions, open conflicts).
- `GET /api/v1/ai/health`: Real-time probe results (LLM, OCR, vector search, daily tokens).
- `GET /api/v1/rules/condition-types`: Schema catalogue for the 13 supported rule conditions.
- `POST /api/v1/rules`: Creates draft rule with source passage reference.
- `POST /api/v1/rule-conflicts/detect`: Deterministic detection of contradictory or clashing rule configurations.
- `POST /api/v1/submissions/{id}/decisions`: Atomic human review decision (`approve`, `request_changes`, `reject`). Stale review submissions return 409 Conflict.
- `POST /api/v1/submissions/{id}/publications`: Publishes approved submission to marketing channels (e.g., Instagram).
- `GET /api/v1/sentinel/summary`: Real-time summary of monitored content and reassessment tasks.
- `POST /api/v1/sentinel/scan`: Triggers immediate Sentinel scan across active and published assets.
- `GET /api/v1/analytics/overview` & `GET /api/v1/analytics/approval-time`: Multi-metric analytics with denominators.
- `GET /api/v1/analytics/export`: Exports full submission register to CSV.
- `GET /api/v1/audit-events`: Append-only audit stream.

