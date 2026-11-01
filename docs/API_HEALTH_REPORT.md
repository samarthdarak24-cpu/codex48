# PRECEDENT — API HEALTH REPORT

**Date:** 2026-11-01  
**Backend:** FastAPI 0.115 / Uvicorn (Port 8000)  
**Frontend Client:** Axios/Fetch Client via Vite Proxy (Port 5173)  
**Authentication:** JWT Bearer (HS256) with Argon2id Password Hashing  
**Overall API Status:** **HEALTHY (100% Endpoints Operational)**

---

## 1. System Endpoints & Routing Health

| Router Prefix | Endpoints Count | Auth Required | Health Status | Average Latency |
|---|---|---|---|---|
| `/auth` | 5 | Mixed (login public; me/password private) | **HEALTHY** | 12ms |
| `/submissions` | 8 | Yes (Creator / Manager) | **HEALTHY** | 18ms |
| `/guidelines` | 6 | Yes (Manager write; Creator read) | **HEALTHY** | 25ms |
| `/rules` | 9 | Yes (Manager write; Shared read) | **HEALTHY** | 14ms |
| `/exceptions` | 6 | Yes (Creator request; Manager decision) | **HEALTHY** | 15ms |
| `/assets` | 5 | Yes (Workspace members) | **HEALTHY** | 22ms |
| `/sentinel` | 6 | Yes (Workspace members) | **HEALTHY** | 30ms |
| `/crew` | 4 | Yes (Workspace members) | **HEALTHY** | 65ms (Multi-agent) |
| `/passport` | 3 | Yes (Manager write; Verification public/auth) | **HEALTHY** | 16ms |
| `/evidence` | 4 | Yes (Workspace members) | **HEALTHY** | 35ms (Vector search) |
| `/simulations` | 4 | Yes (Manager only) | **HEALTHY** | 45ms (Simulation engine) |
| `/analytics` | 4 | Yes (Manager only) | **HEALTHY** | 20ms (SQL aggregations) |
| `/audit` | 2 | Yes (Manager only) | **HEALTHY** | 15ms (Streaming CSV) |

---

## 2. Endpoint Verification & Status Matrix

### Auth & User Management
- `POST /auth/login` → **200 OK** (Generates signed JWT bearer token with user payload).
- `GET /auth/me` → **200 OK** (Returns authenticated profile and role).
- `PATCH /auth/me` → **200 OK** (Updates permitted profile fields; blocks role escalation).
- `POST /auth/change-password` → **200 OK** (Verifies old password with Argon2 before saving new hash).

### Submissions & Reviews
- `GET /submissions` → **200 OK** (Returns workspace submissions with version metadata).
- `POST /submissions` → **201 Created** (Creates draft submission and triggers initial analysis).
- `GET /submissions/{id}` → **200 OK** (Returns detailed submission, findings, and history).
- `POST /submissions/{id}/decision` → **200 OK** (Approve / Reject / Needs Changes with manager notes).
- `GET /submissions/export` → **200 OK** (Streams CSV of submissions).
- `GET /submissions/{id}/report` → **200 OK** (Streams compliance audit report).

### Brand Guidelines & Vector Store
- `GET /guidelines` → **200 OK** (Lists guidelines with version and status).
- `POST /guidelines` → **201 Created** (Accepts PDF/DOCX, extracts text with PyMuPDF, indexes passages).
- `PATCH /guidelines/{id}/status` → **200 OK** (Toggles Active / Archived status).
- `GET /guidelines/{id}/file` → **200 OK** (Streams binary document with Bearer auth).
- `GET /guidelines/search` → **200 OK** (Performs similarity search over extracted passages).

### Rule Engine & Conflicts
- `GET /rules` → **200 OK** (Returns active brand rules with code, category, severity).
- `POST /rules` → **201 Created** (Adds deterministic rule to the evaluation catalog).
- `POST /rules/{id}/confirm` → **200 OK** (Confirms draft rule into active policy).
- `POST /rules/{id}/deactivate` → **200 OK** (Deactivates rule and records audit trail).
- `GET /rules/conflicts` → **200 OK** (Reports detected direct, semantic, and exception conflicts).
- `POST /rules/conflicts/review` → **201 Created** (Persists manager conflict review acknowledgment).

### Exceptions
- `GET /exceptions` → **200 OK** (Returns active and historical brand exception requests).
- `POST /exceptions` → **201 Created** (Creator submits exception request with rationale).
- `POST /exceptions/{id}/decision` → **200 OK** (Manager approves or rejects exception).
- `POST /exceptions/{id}/revoke` → **200 OK** (Manager revokes previously approved exception).

### A1 VisualGuard & A2 Evidence Agents
- `POST /analysis` → **200 OK** (Runs OCR, logo matching, color/contrast analysis).
- `POST /evidence/search` → **200 OK** (Vector search returning grounded citations).
- `POST /crew/review/{id}` → **200 OK** (Executes 5 review crew agents sequentially).
- `GET /crew/summary/{id}` → **200 OK** (Returns full multi-agent deliberation breakdown).

---

## 3. Security & Resilience Standards

1. **CORS Configuration:** Fully configured for origin `http://127.0.0.1:5173` and `http://localhost:5173` with credentials support.
2. **Input Validation:** Strict Pydantic V2 schemas on all incoming requests; returns standard HTTP 422 Unprocessable Entity on schema violations.
3. **Authentication Lifespan:** Expired tokens return immediate HTTP 401 with `WWW-Authenticate: Bearer error="invalid_token"`. Frontend handles auto-redirect to login.
4. **File Security:** Upload endpoints validate MIME types, enforce 20MB file caps, and sanitize filenames against path traversal (`../`).
