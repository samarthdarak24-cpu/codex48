# Precedent

**A Smarter Way to Manage Brand Rules and Approvals.**

AI-assisted brand governance and content approval platform. Marketing teams submit content, Precedent checks it
against structured brand rules and cites the exact guideline passage behind every finding, brand managers approve
specific content versions, scoped exceptions expire on their own schedule, and proposed rule changes can be simulated
against real stored content before anything is activated.

---

## Status — frontend + backend + database + AI integration complete

The React frontend (Phase 2), the FastAPI backend (Phase 3), SQLAlchemy models + Alembic (Phase 4), document
extraction, configurable AI, and the brand/product image library are all built. The UI talks to the real API,
every mutation persists to the database, and the deterministic rule engine runs **server-side**.

| Area | State |
|---|---|
| 12 screens (login + 5 creator + 6 manager) | ✅ Responsive, shared design system |
| Design system (tokens, cards, tables, badges, modals, toasts, empty/loading/error) | ✅ |
| Navigation, route guards, role separation | ✅ Client + **server-enforced RBAC** |
| Deterministic rule engine (text + asset rules) | ✅ `backend/app/rule_engine.py` (mirror of the client) |
| Content submission → findings → version → decision → audit | ✅ End-to-end against the database |
| Exception request → decision → expiry checks | ✅ Enforced server-side (expired cannot be approved) |
| Rule impact simulation | ✅ Server-side, over stored content |
| Rule conflict detection | ✅ `GET /rules/conflicts` |
| Audit trail + guideline health | ✅ `GET /audit`, `GET /audit/health` |
| Persistence | ✅ SQLAlchemy + SQLite (dev) / PostgreSQL via `DATABASE_URL` |
| Authentication | ✅ Argon2 hashing + signed JWT |
| Document upload / PDF+DOCX extraction | ✅ PyMuPDF + python-docx with page counts |
| AI-assisted rule suggestions | ✅ Configurable LLM; degrades gracefully when no key |
| Brand / product image library | ✅ Upload, approve, optional external-source adapter |
| Backend tests | ✅ 24 pytest tests passing |
| Browser e2e | ✅ Login (both roles) → submit → findings → evidence → queue → audit, 0 console errors |

---

## Run it

### Frontend

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # typecheck + production build
npm run typecheck
```

### Backend (FastAPI + SQLAlchemy)

> **Python version:** use **Python 3.12**. The pinned FastAPI / pydantic / pymupdf
> releases publish wheels for 3.12 only; on 3.13 `pip install -r requirements.txt`
> tries to compile them from source and fails. (pymupdf is pinned to `1.24.13`, which
> does have a 3.13 wheel, but pydantic-core still requires 3.12.)

```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate      # Windows — use a 3.12 interpreter
pip install -r requirements.txt
cp .env.example .env                                  # optional: DATABASE_URL / LLM_*
python seed.py                                        # fictional demo data (idempotent: clears + reseeds)
uvicorn app.main:app --reload --port 8000
```

- API: `http://127.0.0.1:8000` · OpenAPI docs: `http://127.0.0.1:8000/docs`
- The Vite dev server calls `http://127.0.0.1:8000` (override with `VITE_API_BASE`).
- **Database**: defaults to SQLite (`precedent.db`) so it runs with zero setup. For PostgreSQL set
  `DATABASE_URL=postgresql+psycopg://user:pass@host:5432/precedent` and run `alembic upgrade head`.
- **AI (optional)**: set `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` to any OpenAI-compatible endpoint. Without a
  key, AI helpers return `None` and the deterministic engine remains the source of truth.
- **Tests**: `cd backend && pytest -q`.
- **E2E**: with both servers running, `npm i --no-save playwright-core && node e2e-check.mjs`.

### Demo accounts

Fictional accounts. Both use the password `precedent`.

| Role | Email | Lands on |
|---|---|---|
| Brand Manager | `david.kim@pureglow.co` | `/manager/overview` |
| Content Creator | `emily.carter@pureglow.co` | `/app/overview` |

The login screen has one-click buttons for both. The role comes from the backend account record, never from a field
the browser can set, and each role is blocked from the other's routes (client guard **and** server `require_manager`).

---

## Screen inventory

Mapped 1:1 to the reference images.

| # | Reference | Route | File |
|---|---|---|---|
| — | Login | `/login` | `src/pages/Login.tsx` |
| 1 | Content Team Overview | `/app/overview` | `src/pages/content/Overview.tsx` |
| 2 | New Content | `/app/new` | `src/pages/content/NewContent.tsx` |
| 3 | My Submissions | `/app/submissions` | `src/pages/content/Submissions.tsx` |
| 4 | Brand Guidelines (creator) | `/app/guidelines` | `src/pages/content/Guidelines.tsx` |
| 5 | Review & Feedback | `/app/feedback/:id?` | `src/pages/content/Feedback.tsx` |
| 6 | Brand Manager Overview | `/manager/overview` | `src/pages/manager/Overview.tsx` |
| 7 | Review Queue | `/manager/queue/:id?` | `src/pages/manager/Queue.tsx` |
| 8 | Guidelines & Rules | `/manager/guidelines` | `src/pages/manager/GuidelinesRules.tsx` |
| 9 | Exceptions | `/manager/exceptions` | `src/pages/manager/Exceptions.tsx` |
| 10 | Rule Impact Sandbox | `/manager/sandbox` | `src/pages/manager/Sandbox.tsx` |
| 11 | Audit History | `/manager/audit` | `src/pages/manager/Audit.tsx` |

### Deliberate deviation from the references

Reference image 8 shows an **Upload Document** button on the creator's Brand Guidelines page. The creator view here
is read-only and shows a "Read-only access" chip instead, because the brief states creators must not be granted
policy-management permissions. Upload lives on the manager's Guidelines & Rules page.

---

## Architecture

```
src/
  components/
    layout/Shell.tsx        Sidebar, topbar, page header, rail helpers, route layout
    ui/                     Button, Badge, Card, Field, Table, Misc, Toast
  context/
    AuthContext.tsx         Session, login, logout, role guard (JWT from the API)
    DataContext.tsx         Loads the working set from the API; mutations call the API then refetch
  lib/
    types.ts                Domain types — the backend contract
    selectors.ts            Every dashboard metric is DERIVED here, never hardcoded
    ruleEngine.ts           Client mirror of the server rule engine
  services/
    api.ts                  The single HTTP seam (Bearer token, ApiError, all reads + writes)
  pages/                    One file per screen
```

```
backend/
  app/
    main.py                 FastAPI app, CORS, router wiring
    config.py               pydantic-settings (DATABASE_URL, SECRET_KEY, LLM_*, uploads)
    db.py                   engine, SessionLocal, Base, get_db, init_db
    models.py               SQLAlchemy models — 1:1 with src/lib/types.ts
    schemas.py              Auth + common Pydantic
    security.py             Argon2 hashing + JWT
    deps.py                 get_current_user, require_manager (RBAC)
    rule_engine.py          Deterministic engine (text + asset facts)
    ai.py                   Configurable LLM client; returns None when unconfigured
    services/               submissions, documents, rules, exceptions, simulation, assets, audit
    routers/                auth, team, submissions, guidelines, rules, claims, exceptions,
                            simulations, audit, assets
  alembic/                  migrations wired to app settings
  seed.py                   fictional demo dataset
  tests/                    pytest (engine, auth, RBAC, exceptions, submissions, simulation, conflicts)
```

### Two rules the codebase follows

1. **No hardcoded metrics.** Every number on every dashboard comes from `lib/selectors.ts`, computed from the
   records the API returned. Empty database → honest zero states, not fake numbers.
2. **One seam for data.** No component calls `fetch` or imports demo data. Swapping the backend is confined to
   `services/api.ts`.

---

## The rule engine (deterministic, server-side)

`backend/app/rule_engine.py` is the production engine; `src/lib/ruleEngine.ts` is a faithful client mirror.

- **Text rules** (`CL-03`, `CL-04`, `CL-06`, `MK-02`, `PA-05`, `TV-02`) use explicit, testable conditions —
  superlatives, regulated health language, discount claims without a window, urgency stacking, unapproved claim
  wording, missing disclosure.
- **Asset rules** (`BR-01`, `LO-02`, `TY-01`, `IM-03`, `SM-01`) read facts captured with the submission
  (`backgroundColour`, `clearSpaceRatio`, `typeface`, `aspectRatio`, `unreadable`).
- When a rule **cannot** be evaluated from stored evidence, the result is `unknown` → surfaced as
  **Needs review**, never a pass or a fail.
- Every finding carries the rule's stored `sourcePassage`, so a displayed citation always resolves to real source
  data. Nothing is generated by a model.

### Simulation semantics

The sandbox compares the current rule set against a proposed rule set over **stored** content:

- A change that *adds* an allowed colour resolves the assets that were previously flagged.
- A change that *tightens* a rule leaves recorded violations standing.
- Assets whose properties could not be extracted are reported as **Needs Review**.
- A simulation **never** activates the proposed rule; activation is a separate manager action.
- With no stored content the result is an explicit empty state, not a fabricated percentage.

---

## The eight features → endpoints

| Feature | Endpoint(s) |
|---|---|
| Brand Guideline Library | `GET/POST /guidelines`, `GET /guidelines/{id}/file` (PyMuPDF / python-docx) |
| Evidence-Linked Review | findings embedded in `GET /submissions/{id}` (cite `sourcePassage`) |
| Minimal-Edit Suggestions | `suggestedFix` on each finding (deterministic) |
| Version-Based Approvals | `POST /submissions/{id}/versions`, `POST /submissions/{id}/decide` |
| Exception Rulings | `GET/POST /exceptions`, `POST /exceptions/{id}/decide` (expiry enforced) |
| Rule Conflict Detection | `GET /rules/conflicts` |
| Rule Impact Sandbox | `GET/POST /simulations` |
| Audit Log + Guideline Health | `GET /audit`, `GET /audit/health` |
| Brand / Product Image Management | `GET/POST /assets`, `POST /assets/{id}/approve`, `POST /assets/research` |

---

## Verification (this build)

- `cd backend && pytest -q` → **24 passed** (engine determinism, auth, RBAC, exception expiry, submissions +
  audit, simulation totals/impacts, conflicts, and frontend↔backend contract regression tests for
  exception-title derivation and auto-generated rule codes).
- `npm run build` → **passes** (134 kB gzip JS).
- `node e2e-check.mjs` (both servers running) → creator login → submit `100% safe / boosts immunity / 20% off` →
  feedback page shows findings with rule codes and "View source evidence" → manager sees the new submission in the
  queue → audit records it. **0 console errors.**

---

## Honesty notes

- **No fabricated data.** The workspace ships a fictional seed dataset, labelled "Fictional demo workspace".
- **No fabricated citations.** Every finding cites the stored `sourcePassage`; unevaluable checks become
  **Needs review**.
- **AI is optional.** With no `LLM_API_KEY`, AI helpers return nothing and the deterministic engine decides.
- **pgvector is optional.** Core features do not require it; enable it for Postgres semantic search.
- **Postgres switch.** SQLite is the default for local verification; set `DATABASE_URL` for PostgreSQL and run
  `alembic upgrade head`.

The sidebar footer reads **"Fictional demo workspace · no customer data"**.

---

## Design system

| Token | Value |
|---|---|
| Canvas | `#F5F8FD` |
| Ink / heading | `#0F2138` |
| Muted text | `#6B7C93` |
| Border | `#E7EEF8` |
| Primary | `#2F6FED` |
| Success / Warn / Danger / Grape | `#10B981` / `#F0A32A` / `#EF4444` / `#8B5CF6` |
| Radius | 10 / 14 / 18 / 22 px |
| Font | Inter (400–800), tabular numerals for metrics |
| Icons | Lucide, 15px in nav, 1.9–2.2 stroke |

Accessibility: labelled inputs, `aria-invalid` + `role="alert"` on validation, focus-visible rings, keyboard-dismissible
modals, `prefers-reduced-motion` respected, tables with `scope="col"` headers.

Responsive: 3-column desktop → 2-column tablet → single column mobile; sidebar collapses to a drawer; secondary table
columns drop out below `sm` / `md` / `lg` so no row is ever clipped.

---

## Remaining (production hardening)

1. **Deployment** — container images, health checks, secrets management, managed PostgreSQL.
2. **pgvector** — semantic search over guideline passages (optional, Postgres only).
3. **Real external image source** — wire `IMAGE_SOURCE_API_URL` to an official product-image API.
4. **Email** — password-reset delivery (the endpoint is present and never leaks account existence).
