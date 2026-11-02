# PRECEDENT — API Endpoints Catalogue & Routing Registry

**Standard Compliance:** `PRECEDENT_MASTER_BACKEND_PROMPT.md` §9 & §10  
**Specification Reference:** `docs/openapi.json` (OpenAPI 3.1.0)  
**Status Legend:** All endpoints verified operational (`PASS`).  

---

## 1. Authentication & Identity Endpoints

| Method | Endpoint | Auth / Role | Description | Response Status |
|---|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticates user credentials (Argon2id/Bcrypt), returns JWT access token and user profile. | `200 OK` |
| `POST` | `/api/v1/auth/login` | Public | Canonical v1 login endpoint returning bearer token, expiry, and permissions. | `200 OK` |
| `GET` | `/auth/me` | Authenticated | Retrieves current authenticated user session, role, avatar, and workspace. | `200 OK` |
| `POST` | `/auth/logout` | Authenticated | Invalidates current refresh tokens and terminates user session. | `200 OK` |
| `POST` | `/api/v1/auth/refresh` | Refresh Token | Issues new short-lived access token using valid refresh token hash. | `200 OK` |
| `GET` | `/api/v1/users` | Manager | Lists team members within active workspace. | `200 OK` |

---

## 2. Content Submissions & Evaluation Endpoints

| Method | Endpoint | Auth / Role | Description | Response Status |
|---|---|---|---|---|
| `GET` | `/submissions` | Authenticated | Lists submissions with search, channel filter, status filter, and pagination. | `200 OK` |
| `GET` | `/submissions/my` | Creator | Lists submissions authored by the current creator. | `200 OK` |
| `GET` | `/submissions/{id}` | Authenticated | Fetches complete submission detail, versions, findings, and comment threads. | `200 OK` |
| `POST` | `/submissions` | Creator | Creates a new draft submission and triggers automatic rule evaluation. | `201 Created` |
| `PUT` | `/submissions/{id}` | Creator | Updates draft submission copy or metadata with optimistic locking check (`row_version`). | `200 OK` |
| `POST` | `/submissions/{id}/version` | Creator | Submits a new content version, resetting approval status and re-running rules. | `201 Created` |
| `POST` | `/submissions/{id}/decide` | Manager | Records Brand Manager ruling (`Approved`, `Changes Requested`, `Declined`) on specific version. | `200 OK` |
| `GET` | `/submissions/{id}/findings` | Authenticated | Retrieves deterministic rule engine findings and evidence citations for submission. | `200 OK` |
| `GET` | `/submissions/{id}/analysis` | Authenticated | Retrieves VisualGuard CV facts (contrast samples, dominant colors, logo matches). | `200 OK` |
| `POST` | `/submissions/{id}/ai-review` | Authenticated | Triggers advisory Review Crew evaluation and returns structured suggestions. | `200 OK` |
| `GET` | `/api/v1/submissions/{id}/report` | Authenticated | Generates and streams official PDF compliance certificate. | `200 OK` (PDF stream) |

---

## 3. Brand Rules, Conflicts & Impact Sandbox Endpoints

| Method | Endpoint | Auth / Role | Description | Response Status |
|---|---|---|---|---|
| `GET` | `/rules` | Authenticated | Lists active brand governance rules with category, severity, and condition configs. | `200 OK` |
| `POST` | `/rules` | Manager | Creates a new governance rule with automatic conflict detection and versioning. | `201 Created` |
| `PUT` | `/rules/{id}` | Manager | Modifies rule parameters, triggers version increment, and logs audit record. | `200 OK` |
| `PATCH` | `/rules/{id}/status` | Manager | Activates or deactivates a rule. Triggers Sentinel reassessment across live content. | `200 OK` |
| `GET` | `/rules/conflicts` | Manager | Scans active rulebook and returns detected logical contradictions. | `200 OK` |
| `GET` | `/api/v1/rules/condition-types` | Authenticated | Returns catalog of all 13 supported deterministic condition types and schemas. | `200 OK` |
| `POST` | `/simulations` | Manager | Executes Rule Impact Sandbox, replaying proposed rule against historical content. | `201 Created` |
| `POST` | `/simulations/{id}/activate` | Manager | Activates simulated rule into production rulebook following manager sign-off. | `200 OK` |

---

## 4. Brand Guidelines & Document Intelligence Endpoints

| Method | Endpoint | Auth / Role | Description | Response Status |
|---|---|---|---|---|
| `GET` | `/guidelines` | Authenticated | Lists official brand guideline documents with page counts and extracted passages. | `200 OK` |
| `POST` | `/guidelines` | Manager | Ingests new PDF/DOCX guideline document, chunking text into passages with page numbers. | `201 Created` |
| `GET` | `/guidelines/{id}` | Authenticated | Fetches guideline metadata and document passages. | `200 OK` |
| `GET` | `/guidelines/{id}/download` | Authenticated | Securely downloads original guideline PDF/DOCX binary. | `200 OK` (Binary stream) |
| `GET` | `/guidelines/search` | Authenticated | Hybrid semantic search (BM25 + ONNX multilingual dense embeddings + RRF). | `200 OK` |
| `PATCH` | `/guidelines/{id}/status` | Manager | Activates/archives guideline document. | `200 OK` |

---

## 5. Exceptions, Publications & Sentinel Endpoints

| Method | Endpoint | Auth / Role | Description | Response Status |
|---|---|---|---|---|
| `GET` | `/exceptions` | Authenticated | Lists exception requests filtered by workspace, status, or submission. | `200 OK` |
| `POST` | `/exceptions` | Creator | Submits formal exception request against a specific rule finding with business rationale. | `201 Created` |
| `POST` | `/exceptions/{id}/decide` | Manager | Approves (with required expiry date) or rejects an exception request. | `200 OK` |
| `POST` | `/exceptions/{id}/revoke` | Manager | Revokes an approved exception prematurely, triggering Sentinel reassessment. | `200 OK` |
| `GET` | `/api/v1/sentinel/summary` | Manager | Returns Sentinel monitoring metrics (monitored items, tasks created, scan history). | `200 OK` |
| `POST` | `/api/v1/sentinel/scan` | Manager | Triggers on-demand idempotent Sentinel scan across live approved content. | `200 OK` |
| `GET` | `/sentinel/tasks` | Authenticated | Lists policy reassessment tasks resulting from rule/exception changes. | `200 OK` |
| `POST` | `/sentinel/tasks/{id}/resolve` | Manager | Records human resolution on a Sentinel task (Re-approve, Request Changes, Withdraw). | `200 OK` |
| `POST` | `/api/v1/submissions/{id}/publications` | Manager | Records official publishing of an approved content version to an external channel. | `201 Created` |

---

## 6. ProofPass & Security Verification Endpoints

| Method | Endpoint | Auth / Role | Description | Response Status |
|---|---|---|---|---|
| `POST` | `/passport/issue` | Manager | Generates cryptographically signed ProofPass token (HMAC-SHA256, pHash, rule hashes). | `201 Created` |
| `GET` | `/passport/verify/{token}` | Public / Auth | Validates passport token against current asset pHash and rule revocation status. | `200 OK` |
| `GET` | `/proofpass/verify/{token}` | Public / Auth | Alias endpoint ensuring seamless verification link resolution. | `200 OK` |
| `POST` | `/passport/revoke` | Manager | Revokes compliance passport for withdrawn or modified content. | `200 OK` |

---

## 7. Analytics, Audit & Health Endpoints

| Method | Endpoint | Auth / Role | Description | Response Status |
|---|---|---|---|---|
| `GET` | `/analytics` | Manager | Retrieves aggregate platform governance health, pass rates, and cycle time statistics. | `200 OK` |
| `GET` | `/analytics/trends` | Manager | Returns time-series compliance trend data points (7d, 30d, 90d, 1y). | `200 OK` |
| `GET` | `/analytics/export` | Manager | Exports compliance metrics in CSV format. | `200 OK` (CSV stream) |
| `GET` | `/audit` | Manager | Reads immutable append-only audit trail with actor details and state diffs. | `200 OK` |
| `GET` | `/api/v1/audit/export` | Manager | Exports immutable audit event history to CSV. | `200 OK` (CSV stream) |
| `GET` | `/health` | Public | Returns subsystem health status (Database, Storage, OCR, Embeddings, Scheduler). | `200 OK` |
| `GET` | `/ready` | Public | Kubernetes/container readiness probe confirming database and scheduler connectivity. | `200 OK` |
