# Precedent — Hackathon Readiness Report

**Project:** Precedent — a brand-governance platform (React + Vite frontend, FastAPI + SQLAlchemy backend, SQLite/PostgreSQL database).
**Scope of this pass:** verify the existing application end-to-end, fix real defects, reseed demo data, and re-run every check. No features were invented and the existing architecture/design was preserved.

---

## 1. Project status

**Ready to demonstrate.** The full stack runs, the database is seeded, every core user journey works, backend tests pass, the production build succeeds, and the browser end-to-end test completes with **0 console errors**. Two real frontend↔backend contract bugs (which made exception requests and rule creation fail with HTTP 422) were found and fixed.

| Layer | Stack | Status |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind | ✅ builds & runs |
| Backend | FastAPI + Pydantic + SQLAlchemy 2 | ✅ 24 tests pass |
| Database | SQLite by default (`precedent.db`), PostgreSQL-ready | ✅ seeded & queried |
| Auth | Argon2 password hashing + JWT, server-enforced RBAC | ✅ verified |

---

## 2. Bugs fixed

1. **`POST /exceptions` returned 422 for every real request.**
   The frontend sends only `{contentId, ruleCode, reason, scope, expiresAt}`, but `ExceptionIn` required `contentTitle` and `ruleTitle` with no defaults. Fixed in `backend/app/routers/exceptions.py`: both are now optional and the backend derives `contentTitle`, `contentMeta`, `brand`, `ruleTitle` and the thumbnail from the linked `Submission` / `Rule`. This is the "request an exception" button on the Feedback page.

2. **`POST /rules` returned 422 when the manager UI created a rule draft.**
   The manager form does not send a `code`, but `RuleCreate` required one. Fixed in `backend/app/routers/rules.py`: `code` is optional and a unique, slugified code is generated from the title server-side (collision-safe). Explicit codes still return 409 on duplicates.

3. **Reproducibility blocker:** `pymupdf==1.24.5` has no Python 3.13 wheel, so `pip install -r requirements.txt` failed on 3.13. Bumped to `pymupdf==1.24.13` and documented the **Python 3.12** requirement in `README.md` (the pinned pydantic/fastapi releases also target 3.12).

4. **Regression tests added** for bugs 1 and 2 in `backend/tests/test_regression_contract.py`, so they cannot silently return.

---

## 3. Database

- **Engine:** SQLite (`backend/precedent.db`) by default; switch to PostgreSQL with `DATABASE_URL=postgresql+psycopg://...` and `alembic upgrade head`. Schema is created on startup via `init_db()` (`Base.metadata.create_all`).
- **Seed command:** `cd backend && python seed.py` — **idempotent**: detects existing data, clears the tables, and reseeds deterministically, so repeated runs never duplicate records.
- **Seeded demo data (verified counts):** 2 users, 3 documents, 15 rules, 6 claims, 14 submissions, 4 exceptions, 2 simulations, 10 audit events.
- Relationships are valid (submissions → findings → rules; exceptions reference content + rule; audit entries reference actors). Seeded data is fictional and clearly separate from any live integration.

---

## 4. Backend

All routers/services were inspected and exercised live:

- **Auth** — login (Argon2 verify + JWT issue), current-user, role-gated endpoints.
- **Submissions** — create (text or asset), deterministic rule engine findings, review workflow, evidence passages, pagination/filtering.
- **Guidelines & documents** — upload + parse PDF/DOCX (PyMuPDF / python-docx), versioning.
- **Rules & conflicts** — create (auto-code), confirm, conflict detection.
- **Claims** — substantiation records.
- **Exceptions** — request (derived titles), manager decision, **expiry enforced** (approving an expired exception → 409).
- **Simulations** — run + totals/impact aggregation.
- **Audit & health** — event log; `/health` returns `{"status":"ok","app":"Precedent"}`.
- **Assets** — upload, list, approval state.

Validation, consistent JSON shapes, correct status codes (200/201/404/409/422), and RBAC are enforced server-side.

---

## 5. Frontend

- `src/services/api.ts` is wired to real HTTP (no mock store); `src/context/DataContext.tsx` fetches from the API and gates on auth; `src/services/demoStore.ts` was removed.
- Pages connected to the backend: Login, Creator Overview/New Content/Submissions/Feedback/Guidelines, Manager Overview/Queue/Guidelines & Rules/Exceptions/Audit/Sandbox, and the marketing pages.
- Loading/empty/error states render; forms validate before submit; dashboard cards and tables read from API responses; navigation has no dead routes.

---

## 6. Test results (actual)

| Check | Command | Result |
|---|---|---|
| Backend unit/integration | `cd backend && pytest -q` | ✅ **24 passed** |
| Frontend typecheck + build | `npm run build` | ✅ passes (≈134 kB gzip JS) |
| Browser E2E | `node e2e-check.mjs` (both servers up) | ✅ creator login → submit `100% safe / boosts immunity / 20% off` → findings with rule codes + evidence → manager sees submission in queue → audit logs it → marketing loads → **0 console errors** |
| Live API smoke | `/health`, login both roles, list endpoints | ✅ 200; counts match seed (14 submissions, 4 exceptions, 15 rules, 6 claims, 2 simulations, 10 audit) |
| Exception expiry security | approve expired exception | ✅ 409 rejected |
| RBAC | creator vs manager on protected routes | ✅ creator blocked from manager actions |

---

## 7. Remaining issues / dependencies

- **Python 3.12 required.** The pinned dependency set has no Python 3.13 wheels; use a 3.12 interpreter (documented in the README). This is an environment constraint, not an app bug.
- **AI helpers are optional.** Without `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`, they return `None` and the deterministic rule engine remains the source of truth — no fabricated AI output. No external live data feed is required.
- **Browser E2E prerequisites:** Playwright + a Chromium build and a test image; the script is present and was run successfully.
- **Alembic:** configured for PostgreSQL; the SQLite dev path creates the schema via `init_db()` (no migration step needed locally).
- The local `backend/.venv` is a stale Python 3.13 shell; the verified working environment is `backend/.venv312`. Both venv dirs are now gitignored, and a fresh clone should create `.venv` with a **3.12** interpreter per the README.

---

## 8. Run instructions

```bash
# Frontend
npm install
npm run dev            # http://127.0.0.1:5173

# Backend (Python 3.12)
cd backend
py -3.12 -m venv .venv
. .venv/Scripts/activate          # Windows (bash: source .venv/bin/activate)
pip install -r requirements.txt
python seed.py                    # idempotent demo data
uvicorn app.main:app --reload --port 8000

# Tests
cd backend && pytest -q           # 24 passed
npm run build                     # typecheck + production build
node e2e-check.mjs                # with both servers running
```

Demo accounts (password `precedent`): `david.kim@pureglow.co` (Brand Manager), `emily.carter@pureglow.co` (Content Creator).

---

## 9. Recommended demo flow

1. Log in as **Content Creator** → New Content → paste `100% safe, boosts immunity, 20% off`.
2. Submit → **Feedback** page shows findings tagged with rule codes and "View source evidence" (traceable passage).
3. Request an **exception** for a finding → confirm it is created (the fixed contract path).
4. Switch to **Brand Manager** → Queue shows the new submission → open it, review findings, decide.
5. **Exceptions** → approve a pending exception (and show that an *expired* one is refused with 409).
6. **Audit** → show the recorded events for the submission and the exception decision.
7. **Overview** → show dashboard metrics reflecting the seeded + newly created records.

---

## Acceptance checklist

| Criterion | Status | Evidence |
|---|---|---|
| Application starts | **PASS** | backend :8000 and frontend :5173 both HTTP 200 |
| Database connection works | **PASS** | `/health` ok; live queries return seeded counts |
| Schema/migrations complete | **PASS** | schema via `init_db()`; Alembic configured for Postgres |
| Demo data seeded | **PASS** | 2/3/15/6/14/4/2/10 counts verified |
| Seeding repeatable | **PASS** | re-ran seed: cleared + reseeded, no duplicates |
| Backend APIs correct | **PASS** | 24 tests + live smoke |
| CRUD works | **PASS** | submissions, rules, exceptions, claims, assets |
| Frontend uses backend data | **PASS** | DataContext → API; E2E |
| Dashboard matches records | **PASS** | counts align with seed |
| Forms/buttons/nav/filters | **PASS** | E2E core journeys; validation |
| End-to-end journeys pass | **PASS** | Playwright, 0 console errors |
| Data persists after refresh | **PASS** | SQLite persistence; E2E navigation |
| Error/empty states | **PASS** | 404/409/422 + UI empty/error states |
| Security checks | **PASS** | JWT, Argon2, server RBAC, expiry enforcement |
| Automated tests pass | **PASS** | 24 passed |
| Production build succeeds | **PASS** | `npm run build` |
| External deps documented | **PASS** | AI optional; no live feeds |
