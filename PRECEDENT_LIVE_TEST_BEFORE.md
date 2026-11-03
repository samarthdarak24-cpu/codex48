# PRECEDENT Live Test — BEFORE State

**Product:** Precedent — AI-Assisted Brand Governance & Content Approval Platform  
**Date:** 2026-11-03  
**Tester:** Autonomous QA Agent  
**Status:** PRE-TEST INSPECTION

---

## Environment

| Component | Value |
|-----------|-------|
| Frontend | React 18 + TypeScript + Vite 5.4.11 on `http://127.0.0.1:5173` |
| Backend | FastAPI + SQLAlchemy 2 + Python 3.12 on `http://127.0.0.1:8000` |
| Database | SQLite (`precedent.db`, `qa_test.db`) |
| Auth | Argon2 + JWT (HS256), RBAC: creator / manager |
| AI LLM | OpenAI-compatible client, `gsk_...` key configured (Groq), model `openai/gpt-oss-20b` |
| OCR | Tesseract (eng), RapidOCR fallback |
| File Storage | `backend/uploads/` directory |
| Browser Automation | Playwright 1.64.1 (Chromium) |

**Both servers confirmed running:**
- Port 8000: LISTENING (PID 13064)
- Port 5173: LISTENING (PID 6288)

---

## Credentials (from existing scripts)

| Role | Email | Password |
|------|-------|----------|
| Brand Manager | `david.kim@pureglow.co` | `precedent` |
| Creator | `emily.carter@pureglow.co` | `precedent` |

---

## 21 Feature Screens (confirmed in source)

### Creator (10 screens)

| # | Feature | Route | Component |
|---|---------|-------|-----------|
| C01 | Creator Overview | `/creator/dashboard` | `CreatorDashboardView.tsx` |
| C02 | New Content | `/creator/new-content` | `NewContentView.tsx` |
| C03 | My Submissions | `/creator/my-submissions` | `MySubmissionsView.tsx` |
| C04 | AI Review | `/creator/ai-review` | `AIReviewView.tsx` |
| C05 | Brand Guidelines (read-only) | `/creator/guidelines` | `CreatorGuidelinesView.tsx` |
| C06 | Exception Requests | `/creator/exception-requests` | `CreatorExceptionRequestsView.tsx` |
| C07 | Sentinel Tasks | `/creator/sentinel-tasks` | `CreatorSentinelTasksView.tsx` |
| C08 | Notifications | `/creator/notifications` | `NotificationsView.tsx` |
| C09 | Approved Content | `/creator/approved-content` | `ApprovedContentView.tsx` |
| C10 | Creator Profile | `/creator/profile` | `MyProfileView.tsx` |

### Brand Manager (11 screens)

| # | Feature | Route | Component |
|---|---------|-------|-----------|
| M01 | Brand Manager Overview | `/manager/overview` | `OverviewView.tsx` |
| M02 | Review Queue | `/manager/review-queue` | `ReviewQueueView.tsx` |
| M03 | All Submissions | `/manager/submissions` | `AllSubmissionsView.tsx` |
| M04 | Brand Guidelines | `/manager/brand-guidelines` | `BrandGuidelinesView.tsx` |
| M05 | Rules & Conflicts | `/manager/rules` | `RulesConflictsView.tsx` |
| M06 | Exceptions | `/manager/exceptions` | `ExceptionsView.tsx` |
| M07 | Rule Impact Sandbox | `/manager/sandbox` | `RuleImpactSandboxView.tsx` |
| M08 | Sentinel Monitoring | `/manager/sentinel` | `SentinelMonitoringView.tsx` |
| M09 | Asset Library | `/manager/assets` | `AssetLibraryView.tsx` |
| M10 | Analytics & Health | `/manager/analytics` | `AnalyticsHealthView.tsx` |
| M11 | Audit History | `/manager/audit` | `AuditHistoryView.tsx` |

---

## Backend API Routes (confirmed)

| Domain | Router | Key Endpoints |
|--------|--------|---------------|
| Auth | `auth.py` | `/auth/login`, `/auth/me` |
| Guidelines | `guidelines.py` | `/guidelines`, `/guidelines/search`, `/guidelines/{id}/file`, `/guidelines/{id}/passages` |
| Assets | `assets.py` | `/assets`, `/assets/{id}/approve`, `/assets/{id}/file`, `/assets/research` |
| Analysis | `analysis.py` | `/analysis/upload`, `/analysis/{id}`, `/analysis/submission/{id}` |
| Submissions | `submissions.py` | `/submissions`, `/submissions/{id}`, `/submissions/{id}/versions`, `/submissions/{id}/decide` |
| Rules | `rules.py` | `/rules`, `/rules/conflicts` |
| Exceptions | `exceptions.py` | `/exceptions`, `/exceptions/{id}/decide` |
| Audit | `audit.py` | `/audit`, `/audit/health` |
| Analytics | `analytics.py` | Analytics aggregates |
| Sentinel | `sentinel.py` | Sentinel tasks |
| Evidence | `evidence.py` | `/evidence/findings/{id}`, `/evidence/review/{id}`, `/evidence/search` |
| Simulations | `simulations.py` | `/simulations` |
| Crew / Agents | `crew.py`, `agents/` | Agent Studio |

---

## Existing Test Assets

Already generated in `qa_test_assets/`:

| File | Size | Type |
|------|------|------|
| `PureGlow_Marketing_Guidelines_QA.docx` | 38,131 bytes | DOCX |
| `PureGlow_Poster_Image_01.png` | 94,281 bytes | PNG (1200×1500) |
| `PureGlow_Poster_Image_02.png` | 99,114 bytes | PNG (1600×1000) |

Existing test results from prior runs:
- `results_document.json` — Document upload: PASS (24 passages, CL-03/04/05 found, hash verified)
- `results_assets.json` — Image uploads: PASS (both images, unique IDs, previews verified)
- `results_creator.json` — Creator content: PASS (submission SUB-1017, both images stored)
- `results_ai_errors.json` — AI/OCR + error handling: PASS (OCR works, validation errors return correct codes)

---

## Known Bugs Already Fixed

1. **Files with spaces/special characters rejected (415)** — Fixed in `backend/app/services/assets.py` by adding `"application/octet-stream"` to `ALLOWED_MIME_TYPES`. Magic bytes still validate the real file type.

---

## Backend Test Status

Backend pytest suite was running at last check (69% complete, 1 failure observed). Need to re-verify after fixes.

---

## Test Data Identifier

`QA_LIVE_NOV_2026` — will be used for all QA-created records.

---

## Workspace

`PRECEDENT_QA_WORKSPACE` — dedicated QA workspace for all testing.

---

**Status: READY TO BEGIN LIVE TESTING**