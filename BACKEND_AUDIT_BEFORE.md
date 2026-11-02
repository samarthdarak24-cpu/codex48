# PRECEDENT — Comprehensive Backend Audit (BEFORE)

**Audit Date:** 2026-11-02  
**Platform:** Precedent — AI-Assisted Brand Governance & Content Approval Platform  
**Target Architecture:** FastAPI + SQLAlchemy + SQLite/PostgreSQL + Deterministic Rule Engine + React 18 UI  
**Auditor:** Senior Full-Stack & AI Systems Integration Specialist  

---

## 1. Executive Summary: Initial State

Before undertaking this repair cycle, the repository was in a broken and desynchronized state:
1. **Broken Python Virtual Environment**: The active `.venv` was configured for Python 3.13.0, causing binary ABI and import incompatibilities across core packages (`pymupdf`, `opencv-python`, `onnxruntime`, `rapidocr-onnxruntime`).
2. **Missing Module Root Resolution**: Launching `pytest` or `uvicorn` failed immediately with `ModuleNotFoundError: No module named 'app'`. Neither `backend/__init__.py` nor `backend/app/main.py` ensured the parent directory was present in `sys.path`.
3. **Missing Critical Runtime Libraries**: `reportlab` (required for PDF compliance export) and `charset-normalizer` were absent from the environment, crashing any test or endpoint importing `app.services.reports`.
4. **Git Branch & Merge Conflict State**: Work from Palak (`origin/palak` - 21 redesigned views, `v2.css` animations, layout components) and Balaji (`origin/balaji` - canonical `/api/v1` architecture, background workers, jobs queue) were stranded in remote branches with severe merge conflicts in `.env.example`, `models.py`, `main.py`, `sentinel.py`, `Shell.tsx`, `Misc.tsx`, and `Queue.tsx`.
5. **Python Module vs Package Namespace Collisions**:
   - `backend/app/services/semantic.py` (added by Balaji) collided with the existing directory `backend/app/services/semantic/`. Python package resolution always favored `semantic/__init__.py`, rendering the functions in `semantic.py` unimportable.
   - `backend/app/services/visual.py` collided with `backend/app/services/visual/` package directory in identical fashion.
6. **SQLAlchemy Model Schema Regressions**:
   - `AssetAnalysis` lacked `submission_id`, `workspace`, `width`, `height`, `layout_metrics`, `contrast_findings`, breaking Round 2/3 VisualGuard and ProofPass integrations.
   - `Publication` and `Notification` lacked `workspace` columns, causing SQL queries and isolation tests to crash with `AttributeError`.
   - `Notification` had an unqualified `UniqueConstraint("user_id", "idempotency_key")` with a default of `""`, preventing multiple standard notifications from being stored for a user.
   - `ReassessmentTask` was missing `workspace`, `affected_rule_codes`, `reason`, and resolution attributes.
7. **Sentinel Automation Scoping & Import Bugs**:
   - `backend/app/services/sentinel.py` lacked `import uuid`, throwing `NameError: name 'uuid' is not defined` when triggering scans.
   - Model references inside `trigger_sentinel_scan` lacked `models.` qualification (`ScanRun`, `Submission`, `Rule`, `ReassessmentTask`).
8. **Live API Decoupling**: Frontend API requests to `/proofpass/verify/...` and `/crew/review` received 404 or JSONDecodeError because route aliases were unmounted.

---

## 2. File-by-File Pre-Audit Diagnosis

| File / Component | Initial Condition | Identified Root Cause | Risk Level |
|---|---|---|---|
| `backend/app/main.py` | Broken startup / No canonical v1 | Missing `canonical_v1.router` registration, no `sys.path` injection | High |
| `backend/app/models.py` | Conflicted & desynchronized | Dropped `workspace` on 5 tables; stripped VisualGuard analysis fields | Critical |
| `backend/app/services/semantic.py` | Unimportable duplicate | Name collision with `backend/app/services/semantic/` directory | Critical |
| `backend/app/services/visual.py` | Unimportable duplicate | Name collision with `backend/app/services/visual/` directory | Critical |
| `backend/app/services/sentinel.py` | Failed at runtime | Missing `import uuid`, bad indentation on line 1249, unqualified model calls | High |
| `backend/app/services/reports.py` | Crashed on import | `reportlab` library not installed in `.venv` | High |
| `backend/seed.py` | Database seed failed | `NOT NULL constraint failed: publications.submission_version_id` | Critical |
| `backend/precedent.db` | Stale SQLite schema | Old tables without `avatar_asset_id`, `department`, `phone`, `workspace_id` | High |
| `src/components/layout/Shell.tsx` | Merge conflict | Conflict between topbar notification bell, Judge Tour button, and layout | Medium |
| `src/components/ui/Misc.tsx` | Merge conflict | Conflicted modal, tab, and dialog classes | Medium |
| `src/pages/content/Feedback.tsx` | Merge conflict | Balaji's branch reverted VisualGuard evidence inspector in favor of old UI | High |
| `src/pages/manager/Queue.tsx` | Merge conflict | Publication and status workflow stripped in remote branch | High |

---

## 3. Pre-Repair Test Suite Baseline

When attempting to run pytest prior to remediation:
```
ModuleNotFoundError: No module named 'reportlab'
ImportError: cannot import name 'validate_citation' from 'app.services.semantic'
AttributeError: type object 'Publication' has no attribute 'workspace'
AttributeError: type object 'AssetAnalysis' has no attribute 'submission_id'
NameError: name 'uuid' is not defined
IntegrityError: NOT NULL constraint failed: publications.submission_version_id
Result: 24 FAILED, 3 ERRORS, 120 PASSED out of 147 items
```

---

## 4. Remediation Plan

1. **Reconstruct Environment**: Use Python 3.12.10 virtual environment populated with exact requirements.
2. **Resolve Service Package Collisions**:
   - Move `semantic.py` logic into `backend/app/services/semantic/citation.py` and export cleanly in `__init__.py`.
   - Move `visual.py` logic into `backend/app/services/visual/canonical.py` and export cleanly in `__init__.py`.
   - Delete loose colliding `.py` files.
3. **Restore Model Parity in `models.py`**:
   - Restore `workspace`, `submission_id`, pixel coordinates, and analysis fields to `AssetAnalysis`.
   - Restore `workspace` to `Publication`, `Notification`, `AiFinding`, `AiCallLog`, `PassageEmbedding`, `ReassessmentTask`.
   - Make `Publication.submission_version_id` and `Notification.idempotency_key` nullable.
4. **Repair Sentinel Scan Routine**:
   - Add `import uuid` to `sentinel.py`.
   - Correct 4-space indentation.
   - Use `models.ScanRun`, `models.Submission`, `models.Rule`, `models.ReassessmentTask`, `models.TaskEvent`.
5. **Re-initialize SQLite Schema & Seed**:
   - Execute `scripts/reset_db.py` to regenerate all tables with the unified schema.
   - Run `backend/seed.py` to populate baseline demonstration entities.
   - Synchronize `backend/precedent.db` with root `precedent.db`.
6. **Verify End-to-End**:
   - `npm run build` (TypeScript + Vite).
   - `pytest backend/tests` (Full suite).
   - `python scripts/test_live_api.py`.
   - `python scripts/test_all_technologies.py`.
   - `node qa_ui.mjs` (Playwright inspection across 21 screens).
