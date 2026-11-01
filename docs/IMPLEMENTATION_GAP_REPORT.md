# PRECEDENT — Implementation Gap Report (Phase 0 Reconnaissance)

**Date:** 2026-11-02  
**Baseline Test Execution:** 41 passed, 0 failed in `backend/tests/` (Python 3.12)  
**Target Spec:** `PRECEDENT_MASTER_BACKEND_PROMPT.md` (391 lines) & `DESIGN.md` (21 feature pages, A1–A3 AI pipelines)

---

## 1. Executive Summary

A thorough reconnaissance of the repository confirms:
- **Baseline Foundation:** FastAPI backend with SQLite/Postgres compatibility, Argon2 password hashing, JWT authentication, deterministic rule engine, and 41 passing tests covering auth, RBAC, workspace tenancy, exception lifecycles, and audit logging.
- **Frontend Inventory:** 12 existing screen implementations (`src/pages/content/`, `src/pages/manager/`, `src/pages/marketing/`) consuming endpoints via `src/services/api.ts` and `src/context/DataContext.tsx`.
- **Target Gap:** To achieve the full 21-page target specification and judge-ready autonomy specified in `PRECEDENT_MASTER_BACKEND_PROMPT.md`, the backend must close 15 architectural gaps (G1–G15), implement the full canonical endpoint catalogue (`/api/v1`), provide the DB-backed job queue, build A1 VisualGuard (vision + OCR), A2 Evidence Intelligence (hybrid retrieval + citation validation), and A3 Sentinel (continuous post-publication monitoring).

---

## 2. Documented Gaps & Action Plan (G1 – G15)

| Gap ID | Description in Master Prompt | Existing Baseline Status | Action in Phase 1–8 |
|---|---|---|---|
| **G1** | No publication endpoints | Missing | Implement `publications` table and endpoints: `POST /api/v1/submissions/{id}/publications`, `GET /api/v1/submissions/{id}/publications`, `POST /api/v1/publications/{id}/unpublish` |
| **G2** | No Brand Kit table/API | Missing | Implement `brand_kits` and `brand_logos` tables, palette ΔE76 calculation, `GET/PUT /api/v1/brand-kit` |
| **G3** | Claims registry under-specified | Basic `approved_claims` table exists | Enhance `claims` with status (`approved`, `withdrawn`, `expired`), evidence refs, withdrawal Sentinel triggers, and `PATCH /api/v1/claims/{id}/withdraw` |
| **G4** | Rule condition types never enumerated | String conditions | Implement the 13-type condition catalogue (Pydantic discriminated unions) and `GET /api/v1/rules/condition-types` |
| **G5** | No state machines / UI label mapping | String statuses | Formalize state machines: `draft`, `in_review`, `changes_requested`, `approved`, `rejected`, `published`, `withdrawn`, with immutable version freezing |
| **G6** | Missing global search & shared utilities | Missing | Implement `GET /api/v1/search?q=&types=`, `/api/v1/jobs/{id}`, notification preferences, user avatar, and activity feed |
| **G7** | Review Queue lacks assignment, due date, risk, AI Compare | Basic queue only | Add `review_assignments`, due date metadata, risk derivation, `POST /submissions/{id}/ai-compare`, Review Crew runner |
| **G8** | Sandbox history & Sentinel coverage/preview | Basic simulation only | Add simulation history (`GET /api/v1/simulations`), export (CSV/PDF), Sentinel impact preview, summary stats, task events |
| **G9** | Analytics lacks granular endpoints | Basic audit health | Add `/api/v1/analytics/approval-time`, `/exceptions`, `/sentinel`, `/guideline-health`, `/rule-coverage`, all with denominators (`sample_size`) |
| **G10** | Missing supporting tables | 14 tables in models | Add `jobs`, `brand_kits`, `brand_logos`, `asset_versions`, `tags`, `review_assignments`, `exception_events`, `task_events`, `user_preferences`, `refresh_tokens`, `scan_runs`, `publications`, `reassessment_tasks`, `ai_call_log`, `agent_runs`, `agent_tool_calls` |
| **G11** | No standardized list/error envelope | Raw lists, HTTPException | Implement list envelope `{ items, total, page, page_size, filters, generated_at }` and structured error shape `{ code, message, details, request_id }` |
| **G12** | Rich deterministic seed/demo data | Basic seed script | Create comprehensive seed and reset scripts (`scripts/seed.py`, `scripts/reset_db.py`) generating Demo Brand Co, guidelines, rules, posters, exceptions, and publications |
| **G13** | Exception matching conditions undefined | String conditions | Implement engine predicate evaluator: `{"type": "phrase_present"}`, `{"type": "rule_compliant"}`, etc. |
| **G14** | Background job queue undefined | Synchronous only | Implement DB-backed `jobs` table with `SELECT ... FOR UPDATE SKIP LOCKED` polling worker and `JOBS_INLINE=true` test runner |
| **G15** | Self-registration role spoofing risk | Open registration | Enforce server-side role defaults (`creator` only for self-registration, manager created via seed/CLI only) |

---

## 3. Technology Stack & Delta Decisions

1. **Database:** SQLite for local fast testing + PostgreSQL 16 schema compatibility (Alembic migrations provided).
2. **Deterministic Engine:** Pure Python, zero-LLM, immutable evaluations, rule versions, and deterministic test cases.
3. **Background Jobs:** DB-backed queue with `jobs` table and worker polling; synchronous test inline mode.
4. **Vision & OCR:** RapidOCR / OpenCV + Pillow + ΔE76 color distance calculations.
5. **PDF & Document Processing:** PyMuPDF (`fitz`) and `python-docx` for structured passage chunking.
6. **AI Fallbacks:** Graceful degradation when `LLM_API_KEY` is absent; citation verification against persisted passages.
7. **Dual-Route Compatibility:** Both `/api/v1/*` (canonical master prompt contract) and legacy routes (`/submissions`, `/guidelines`, etc.) supported simultaneously to preserve 100% frontend continuity.

