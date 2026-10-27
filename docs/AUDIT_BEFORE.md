# Precedent — Pre-Implementation Audit (Phase 1)

Date: 2026-10-27
Backend URL: `http://127.0.0.1:8000`
Frontend URL: `http://127.0.0.1:5173`
Test runner: Python live HTTP client (`scratch/audit_runner.py`), pytest suite (24 passing), and manual execution checks.

---

## Executive Summary

Precedent already has a solid frontend (12 screens) and an existing FastAPI backend with SQLite/SQLAlchemy models, Argon2 auth, deterministic rule checking, and initial mock-to-API seams. However, several critical requirements are **PARTIAL**, **MISSING**, or contain **critical behavioral bugs** (such as approvals carrying over to new content versions, missing file validation, missing guideline passage storage and full-text search, lack of exception revocation, missing simulation activation endpoints, and lack of workspace isolation).

---

## Audit Table (A to L)

| Feature Area | Status | File Path Evidence | Live Test & Observed Result | Missing / Gaps |
|---|---|---|---|---|
| **A. Auth and RBAC** | **PARTIAL** | `backend/app/routers/auth.py`<br>`backend/app/deps.py`<br>`backend/app/security.py` | `POST /auth/login` returns valid JWT + User.<br>Invalid password returns 401.<br>Protected routes without token return 401.<br>Creator token on all manager endpoints returns 403.<br>CORS headers present for `http://localhost:5173`. | **Workspace isolation is missing**: queries do not filter by user workspace/tenant.<br>**No logout endpoint** or token invalidation/audit log event for logout.<br>Role is derived server-side (good). |
| **B. Guideline Library** | **PARTIAL** | `backend/app/routers/guidelines.py`<br>`backend/app/services/documents.py`<br>`backend/app/models.py` | `POST /guidelines` uploads PDF and DOCX successfully.<br>`POST /rules/{id}/confirm` activates rule. | **File upload validation missing**: accepts any file extension (e.g. `.exe`) without MIME or size checks.<br>**No GuidelinePassage table**: text is not segmented with page/paragraph refs or indexed for full-text search.<br>`GET /guidelines/search` is missing (404).<br>`POST /rules/{id}/reject` is missing (404).<br>PyMuPDF dependency is AGPL v3; need permissive BSD alternative (`pypdf`). |
| **C. Evidence-Linked Review** | **PARTIAL** | `backend/app/services/submissions.py`<br>`backend/app/rule_engine.py`<br>`backend/app/ai.py` | `POST /submissions` creates submission and runs deterministic checks.<br>Findings include `sourcePassage` and `evidenceVerified`. | **Evidence verification is unverified**: `evidenceVerified` is set to `bool(rule.source_passage)` without verifying exact quotes against stored guideline passages.<br>Fabricated quotes/rule IDs are not rejected.<br>Pydantic-validated structured output for AI findings is not enforced. |
| **D. Minimal-Edit Suggestions** | **PARTIAL** | `backend/app/services/submissions.py`<br>`src/pages/content/Feedback.tsx` | Suggested fixes are rendered.<br>Applying a fix opens edit modal with replaced text.<br>Saving creates a new version (`ContentVersion`). | **Auto-approval bug**: When a submission was Approved, saving an edit via `add_version` left `status = "Approved"` instead of resetting to `"Pending"`.<br>Accepting must create v2 and reset approval state. |
| **E. Version-Based Approvals** | **PARTIAL** | `backend/app/routers/submissions.py`<br>`backend/app/services/submissions.py` | `POST /submissions/{id}/decide` records reviewer, timestamp, and version.<br>Deciding against outdated version returns 409 Conflict. | **Approval carried over to new version**: Adding a version to an approved submission retained `"Approved"` status.<br>Needs atomic transaction guarantees and resetting status to `"Pending"`. |
| **F. Exception Rulings** | **PARTIAL** | `backend/app/routers/exceptions.py`<br>`backend/app/services/exceptions.py` | `POST /exceptions` creates exception request.<br>`POST /exceptions/{id}/decide` allows manager to approve/reject.<br>Expired exceptions rejected at decision time. | **Revocation is missing**: No `POST /exceptions/{id}/revoke` endpoint (404).<br>**Decision history missing**: Only records last decision, no audit history table for multiple rulings/revisions/revocations.<br>Evaluation does not reject revoked exceptions at runtime. |
| **G. Conflict Detection** | **PARTIAL** | `backend/app/routers/rules.py`<br>`backend/app/services/rules.py` | `GET /rules/conflicts` returns deterministic conflict list. | **Only detects superficial code overlaps**: Contradictory permitted/prohibited values, overlapping conditions, conflicting scopes, incompatible dates, rule-vs-exception, and proposed-rule-vs-ruling conflicts are not fully detected.<br>AI semantic suggestions must be explicitly labeled "potential". |
| **H. Rule Impact Sandbox** | **PARTIAL** | `backend/app/routers/simulations.py`<br>`backend/app/services/simulation.py`<br>`src/pages/manager/Sandbox.tsx` | `POST /simulations` simulates rule relaxation on stored content without activating rule.<br>Rule remains active and unchanged. | **Separate activation endpoint missing**: No `POST /simulations/{id}/activate` endpoint (404).<br>**Comparison breakdown incomplete**: Does not return `newlyFlagged`, `resolved`, `unchanged`, `potentialConflicts`, `exceptionsNeedingAttention`.<br>Proposed rules are not stored in a dedicated model. |
| **I. Audit Log & Health** | **PARTIAL** | `backend/app/routers/audit.py`<br>`backend/app/services/audit.py` | `GET /audit` lists events.<br>Immutable: PUT/DELETE return 405/404.<br>`GET /audit/health` returns computed metrics from DB. | **Export endpoint missing**: `GET /audit/export` returns 404.<br>**Security events missing**: Failed logins, unauthorized accesses are not logged to `audit_events`.<br>Rule activation and simulation events are incomplete. |
| **J. Product/Brand Images** | **PARTIAL** | `backend/app/routers/assets.py`<br>`backend/app/services/assets.py` | Upload and approval work.<br>Research returns honest `{"configured": false, "results": []}` when unconfigured. | **File validation missing**: Bad file types (e.g. `.exe`) are accepted without MIME/size validation.<br>Serving protected assets in browser needs authenticated streaming or safe URL resolution. |
| **K. Dashboards** | **WORKING** | `src/pages/content/Overview.tsx`<br>`src/pages/manager/Overview.tsx`<br>`src/lib/selectors.ts` | All metrics are derived from DB records via `DataContext` and selectors.<br>Creating a submission or exception updates counts live. | Ensure all 11 screens refresh cleanly after mutations without relying on mock data. |
| **L. Frontend Wiring (11 Screens)** | **PARTIAL** | `src/pages/**`<br>`src/services/api.ts` | All screens render with real data from `DataContext`. Forms call `api.ts`. | **Missing UI actions**: Sandbox lacks proposed rule activation button; Guidelines lacks rule rejection button; Exceptions lacks revoke button; Audit lacks CSV/JSON export trigger; Guideline search UI is missing. |

---

## Detailed Evidence & Gap Analysis

### 1. Database & Auth/RBAC
- **Evidence**: `test_auth.py` and `test_rbac.py` pass. Manager endpoints return 403 when called with creator JWT.
- **Critical Gap**: No workspace isolation. A user from `PureGlow` can retrieve and view records belonging to `WellnessLife`. Workspace membership must be verified on every data access query.
- **Fix Required**: Add workspace foreign keys / filters to `User`, `GuidelineDoc`, `Rule`, `Submission`, `ExceptionRequest`, `BrandAsset`, and filter all queries by `current_user.workspace`. Add `POST /auth/logout`.

### 2. Guideline Library & Passage Indexing
- **Evidence**: Document upload currently takes an entire file, extracts text with `fitz` or `docx`, and stores the full string.
- **Critical Gap**: No passage-level chunking with page number and paragraph indices. No full-text search across passages. Upload does not validate magic bytes or MIME types.
- **Fix Required**:
  1. Add `GuidelinePassage` model (`id`, `doc_id`, `page_number`, `paragraph_number`, `passage_text`, `heading`, `tsv` or search vector).
  2. Implement text extractor using `pypdf` (BSD) and `python-docx` that chunks text by page and paragraph.
  3. Add `GET /guidelines/search?q=...` endpoint with SQLite/PostgreSQL full-text search.
  4. Add `POST /rules/{id}/reject`.
  5. Validate uploaded files against allowed MIME types (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`) and max size (15MB).

### 3. Evidence-Linked Review & Fabricated Quote Rejection
- **Evidence**: In `backend/app/services/submissions.py`, `evidence_verified` is set to `bool(rule.source_passage)`.
- **Critical Gap**: A finding with an invented or fabricated quote from an LLM or user is never verified against stored `GuidelinePassage` records.
- **Fix Required**:
  1. Verify every finding's `source_passage` against the database of stored passages for that rule's `source_doc_id`. If the text cannot be matched (exact or normalized substring match), mark `evidence_verified = False`.
  2. Add Pydantic structured output models for AI review (`AiFindingSchema`, `AiReviewResponse`).
  3. Ensure deterministic rule checks run even if the AI provider fails.

### 4. Minimal Edits, Versioning & Approvals
- **Evidence**: In `backend/app/services/submissions.py`:
  ```python
  sub.version = next_version
  ```
  `sub.status` was NOT reset! If a manager approved v1, and the creator added v2 with new policy violations, `sub.status` remained `"Approved"`.
- **Critical Gap**: Approval carried over to subsequent versions.
- **Fix Required**:
  1. In `add_version`, explicitly set `sub.status = "Pending"`.
  2. Ensure approvals strictly bind to `version` in `ReviewDecision`.

### 5. Exception Rulings & Revocation
- **Evidence**: `backend/app/routers/exceptions.py` only implements `POST /exceptions` and `POST /exceptions/{id}/decide`.
- **Critical Gap**: No `POST /exceptions/{id}/revoke`. Status `'Revoked'` is not handled. No decision history tracking.
- **Fix Required**:
  1. Add `POST /exceptions/{id}/revoke` (manager-only).
  2. Add `ExceptionRulingHistory` table to record every status change, actor, reason, timestamp, and conditions.
  3. In `_active_exception`, verify that exceptions with status `'Revoked'` or `'Expired'` or out-of-scope are rejected at evaluation time.

### 6. Conflict Detection
- **Evidence**: `backend/app/services/rules.py:detect_conflicts` only checks a couple hardcoded codes.
- **Critical Gap**: Does not check contradictory permitted/prohibited values, overlapping conditions, conflicting scopes, incompatible dates, rule vs exception conflicts, and proposed rule vs ruling conflicts.
- **Fix Required**: Implement comprehensive deterministic conflict detection covering all 6 conflict categories, plus AI semantic conflict analysis labeled strictly as `"potential"`.

### 7. Rule Impact Sandbox & Proposed Rule Activation
- **Evidence**: `backend/app/services/simulation.py` runs a what-if check, but returns only `checked`, `compliant`, `needsReview`, `nonCompliant`.
- **Critical Gap**: Missing `newlyFlagged`, `resolved`, `unchanged`, `potentialConflicts`, `exceptionsNeedingAttention`. Missing `POST /simulations/{id}/activate` to activate the proposed rule.
- **Fix Required**:
  1. Store proposed rules with validation.
  2. Return the full comparison breakdown: `newlyFlagged`, `resolved`, `unchanged`, `potentialConflicts`, `exceptionsNeedingAttention`.
  3. Implement `POST /simulations/{id}/activate` (manager-only) that safely updates the live rule, records an audit event, and returns the activated rule.
  4. Add UI trigger in `Sandbox.tsx`.

### 8. Audit Log & Security Events
- **Evidence**: `backend/app/routers/audit.py` lists events.
- **Critical Gap**: Missing security event logging (failed login, forbidden access attempt). Missing CSV/JSON export (`GET /audit/export`).
- **Fix Required**:
  1. Add `GET /audit/export` supporting format `csv` or `json`.
  2. Record security events in `audit_events` for 401/403 attempts.
  3. Ensure all guideline, rule, exception, and simulation mutations write audit logs.

### 9. Product/Brand Images
- **Evidence**: `backend/app/routers/assets.py` uploads and approves assets.
- **Critical Gap**: No MIME type validation or file size limits.
- **Fix Required**:
  1. Validate image format (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`) and max size (10MB).
  2. Ensure asset preview and links persist on refresh in My Submissions and Review Queue.

---

## Next Steps: Phase 2 Execution Plan
1. **Foundation & Auth/RBAC**: Update models/schema with workspace isolation, logout, audit security events.
2. **Guideline Library & Passages**: Add `GuidelinePassage` model, `pypdf` text chunker with page/paragraph refs, full-text search, rule reject.
3. **Evidence-Linked Review**: Implement passage verification, quote check, Pydantic AI schema.
4. **Minimal Edits & Versioned Approvals**: Fix `sub.status = "Pending"` in `add_version`, verify version-bound decisions.
5. **Exception Rulings & Revocation**: Add revoke endpoint, decision history, and rule evaluation rejection.
6. **Conflict Detection & Sandbox**: Add all conflict types, full comparison breakdown, simulation activation endpoint.
7. **Audit Export & Image Validation**: Add CSV/JSON export, upload validation, security event audit.
8. **Frontend Wiring**: Wire new endpoints to UI (search, revoke, activate, export, reject).
9. **Automated Testing & End-to-End Verification**: Pytest suite and live journey.
