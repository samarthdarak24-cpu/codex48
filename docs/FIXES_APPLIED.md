# PRECEDENT — COMPREHENSIVE FIXES APPLIED REPORT

**Project:** PRECEDENT – AI Brand Governance Platform  
**Date:** 2026-11-01  
**Authors:** Principal Full-Stack Engineer, FastAPI Backend Engineer, AI/ML Specialist  

---

## 1. Routing & Workspace Unification

### Defect: Dual / Legacy UI split
- **Problem:** Users could land on either legacy routes (`/`, `/app/*`, `/notifications`) or the v2 workspace (`/creator/*`, `/manager/*`). Legacy pages had missing logout controls, incomplete UI panels, and disconnected endpoints.
- **Fix:** In `src/App.tsx`, unified the routing table so that:
  - `/` redirects to `/login` (or `/creator/dashboard` / `/manager/overview` if authenticated).
  - `/app/*` automatically redirects to the modern v2 Creator workspace.
  - `/notifications` automatically redirects to the role-aware notifications view (`/creator/notifications` or `/manager/notifications`).
  - Strict `RequireRole` guards protect manager routes from unauthorized creator access.

---

## 2. Shared API Communication Layer & Backend Repairs

### Backend Endpoints Added & Fixed
1. **`PATCH /auth/me` & `POST /auth/change-password`:**
   - Added in `backend/app/routers/auth.py` with Pydantic validation schemas (`UpdateProfileRequest`, `ChangePasswordRequest`).
   - Verifies existing password using Argon2 before allowing password changes.
   - Prevents privilege escalation by strictly rejecting changes to the `role` field.
2. **`GET /submissions/export` & `GET /submissions/{sub_id}/report`:**
   - Added in `backend/app/routers/submissions.py`.
   - Supports CSV/JSON streaming of all permitted workspace submissions.
   - Produces detailed plaintext/markdown compliance audit reports for individual submissions.
3. **`GET /audit/export`:**
   - Connected in `backend/app/routers/audit.py` for immutable event log CSV downloads.
4. **Bug Fix in `backend/app/routers/rules.py` (Line 320):**
   - Fixed `NameError: name 'user' is not defined` in `get_rule` endpoint by replacing with `current_user`.

### Central Typed API Client (`src/services/api.ts`)
- Added typed methods:
  - `api.updateProfile(name, avatar, department, timezone, bio)`
  - `api.changePassword(oldPassword, newPassword)`
  - `api.downloadAuditCsv()`
  - `api.downloadSubmissionsCsv(status?)`
  - `api.downloadSubmissionReport(subId, format)`
  - `api.uploadGuidelineFile(file, name, category, description)`
  - Replaced inline browser fetch calls with authenticated typed requests (`authHeaders()`, Bearer JWT injection).
  - Added safe `downloadFile()` utility for in-browser file streaming without mock toasts.

---

## 3. Content Creator Pages (Tasks 01 – 10) Repairs

### Task 01 — Creator Dashboard (`CreatorDashboardView.tsx`)
- **Fix:** Replaced hardcoded counters (`24`, `18`, `3`, `3`) with dynamic counts derived from live database records via `useApp()`.
- **Fix:** Connected `sentinelAlerts` to render dynamic action cards rather than placeholder text.
- **Fix:** Wired brief cards to call `setSelectedSubmission()` and redirect directly to `ai-review`.

### Task 02 — New Content (`NewContentView.tsx`)
- **Fix:** Replaced fake `setTimeout` brand check toast with real `api.createSubmission()` and `api.runSemanticReview()`.
- **Fix:** Implemented real "Save Draft" calling `ensureDraft()` to commit changes to the backend database.
- **Fix:** Added real "Submit for Manager Approval" button in the header and pre-flight checklist.
- **Fix:** Replaced static stock image with `BrandAssetsPicker` to select and attach actual approved brand assets.

### Task 03 — My Submissions (`MySubmissionsView.tsx`)
- **Fix:** Replaced hardcoded KPI counts with live counts filtered by authenticated creator.
- **Fix:** Connected real "Download Report" button on table action strips and drawer to call `api.downloadSubmissionReport()`.
- **Fix:** Normalized date representations and campaign filtering.

### Task 04 — AI Review (`AIReviewView.tsx`)
- **Fix:** Removed mock `setTimeout` rescan; wired real `api.triggerCrewReview()` and `api.runSemanticReview()`.
- **Fix:** Connected "Ask AI Assistant" to real vector search via `api.searchEvidence()`.
- **Fix:** Connected live comment posting to `api.addComment()`, refreshing real audit and comment logs.
- **Fix:** Displayed real citation badges, guideline references, and confidence scores.

### Task 05 — Creator Guidelines (`CreatorGuidelinesView.tsx`)
- **Fix:** Replaced hardcoded KPI counters with live guideline counts.
- **Fix:** Enforced read-only Creator mode (no upload or delete controls).
- **Fix:** Connected real guideline file download via `api.fetchGuidelineBlobUrl()`.

### Task 06 — Exception Requests (`CreatorExceptionRequestsView.tsx`)
- **Fix:** Enhanced the modal to select specific target submissions and specific rule codes.
- **Fix:** Persisted new exception requests directly to the database via `addNewException()`.
- **Fix:** Enforced Creator self-approval restriction (creators cannot approve their own exceptions).

### Task 07 — Sentinel Tasks (`CreatorSentinelTasksView.tsx`)
- **Fix:** Replaced fake resolve button with real evaluation: triggers `api.reassessTask()` to re-verify compliance against new brand policies before marking resolved.

### Task 08 — Notifications (`NotificationsView.tsx`)
- **Fix:** Replaced hardcoded badge counts with real unread count from `notifications`.
- **Fix:** Wired "Mark all as read" to `api.markAllNotificationsRead()`.
- **Fix:** Added deep links to related submissions and Sentinel tasks.

### Task 09 — Approved Content (`ApprovedContentView.tsx`)
- **Fix:** Strictly filtered content versions to `status === 'Approved'` to prevent leaking unapproved drafts.
- **Fix:** Replaced mock export toast with real CSV package export via `api.downloadSubmissionsCsv('Approved')`.
- **Fix:** Connected single report download for each approved card.

### Task 10 — Creator Profile (`MyProfileView.tsx`)
- **Fix:** Replaced hardcoded stats with dynamic counts.
- **Fix:** Added real "Edit Profile" modal invoking `PATCH /auth/me`.
- **Fix:** Added real "Change Password" modal invoking `POST /auth/change-password`.
- **Fix:** Blocked role field escalation in frontend and backend.

---

## 4. Brand Manager Pages (Tasks 11 – 21) Repairs

### Task 11 — Manager Overview (`OverviewView.tsx`)
- **Fix:** Connected dynamic drawer findings directly from `activeSub.findings`.
- **Fix:** Connected real compliance scores and live evidence snippets.
- **Fix:** Added manager review note feedback input for quick approvals/rejections.

### Task 12 — Review Queue (`ReviewQueueView.tsx`)
- **Fix:** Connected 4 Kanban columns to live submission status filters (`In Review`, `Needs Changes`, `Approved`, `Rejected`).
- **Fix:** Added `managerNote` textarea in the drawer footer for explicit decision rationale.
- **Fix:** Updated `handleDecision` to commit `managerNote` and status within an atomic database transaction.
- **Fix:** Connected real compliance report download via `api.downloadSubmissionReport()`.

### Task 13 — All Submissions (`AllSubmissionsView.tsx`)
- **Fix:** Replaced hardcoded counts (`248`, `162`, `48`, `38`, `12`) with reactive counts.
- **Fix:** Replaced placeholder export toast with real streaming CSV export via `api.downloadSubmissionsCsv()`.
- **Fix:** Connected search, status filters, and row selection.

### Task 14 — Brand Guidelines (`BrandGuidelinesView.tsx`)
- **Fix:** Added "Upload Guideline Document" modal supporting PDF/DOCX uploads via `api.uploadGuidelineFile()`.
- **Fix:** Connected status toggle button ("Archive Guideline" / "Activate Guideline") via `api.setDocStatus()`.
- **Fix:** Connected real document download via `api.fetchGuidelineBlobUrl()`.

### Task 15 — Rules & Conflicts (`RulesConflictsView.tsx`)
- **Fix:** Replaced hardcoded KPI counts (`84`, `72`, `7`, `3`) with dynamic totals.
- **Fix:** Added "Create Rule" modal to persist new brand governance rules via `api.addRule()`.
- **Fix:** Connected "Resolve Conflict" action to `resolveRuleConflict()`.

### Task 16 — Exceptions (`ExceptionsView.tsx`)
- **Fix:** Replaced hardcoded stats with dynamic live counts.
- **Fix:** Connected manager Approve and Reject buttons with real database status updates.
- **Fix:** Connected "Revoke Exception" button via `api.revokeException()`.

### Task 17 — Rule Impact Sandbox (`RuleImpactSandboxView.tsx`)
- **Fix:** Connected proposed rule simulation engine via `POST /simulations`.
- **Fix:** Ensured sandbox immutability (simulations do not alter active rules).
- **Fix:** Connected "Activate Simulation" to safely apply vetted rule changes to live policy.
- **Fix:** Connected real CSV impact report download.

### Task 18 — Sentinel Monitoring (`SentinelMonitoringView.tsx`)
- **Fix:** Replaced mock scan with real `api.scanExpiring(30)` to discover policy drifts.
- **Fix:** Connected dynamic donut chart and severity distribution.
- **Fix:** Connected "Resolve Alert" action to update task status in the database.

### Task 19 — Asset Library (`AssetLibraryView.tsx`)
- **Fix:** Connected real brand creative file upload via `api.uploadAsset()`.
- **Fix:** Connected real asset approval via `api.approveAsset()`.
- **Fix:** Connected asset download/preview via `api.fetchAssetBlobUrl()`.

### Task 20 — Analytics & Health (`AnalyticsHealthView.tsx`)
- **Fix:** Connected live SQL aggregation data from `analytics` and `analyticsTrends`.
- **Fix:** Rendered dynamic SVG trendline and category findings donut.
- **Fix:** Connected real date range filter (7D, 30D, 90D, 1Y) and CSV export.

### Task 21 — Audit History (`AuditHistoryView.tsx`)
- **Fix:** Replaced hardcoded event counts (`2,483`, `1,892`, `421`, `170`) with dynamic counts.
- **Fix:** Replaced placeholder export toast with real CSV download via `api.downloadAuditCsv()`.
- **Fix:** Connected module filtering and event details inspection drawer.
