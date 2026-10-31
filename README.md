# Precedent

**A Smarter Way to Manage Brand Rules and Approvals.**

AI-assisted brand governance and content approval platform. Marketing teams submit content, Precedent checks it
against structured brand rules and cites the exact guideline passage behind every finding, brand managers approve
specific content versions, scoped exceptions expire on their own schedule, and proposed rule changes can be simulated
against real stored content before anything is activated.

---

## Status — Round 3 complete (A1 + A2 + A3), frontend + backend + database + AI integration

The React frontend (Phase 2), the FastAPI backend (Phase 3), SQLAlchemy models + Alembic (Phase 4), document
extraction, configurable AI, and the brand/product image library are all built. The UI talks to the real API,
every mutation persists to the database, and the deterministic rule engine runs **server-side**.

Round 3 adds three improvements: **A1 VisualGuard** (poster OCR, colour, logo and contrast analysis),
**A2 Evidence Intelligence** (hybrid retrieval with citation-validated AI suggestions) and
**A3 Sentinel** (re-checks approved/published content when policy changes).

| Area | State |
|---|---|
| 12 Round 2 screens (login + 5 creator + 6 manager) | ✅ Responsive, shared design system |
| **A1 VisualGuard** — OCR, colours, logo match, layout, WCAG contrast, SVG overlay | ✅ Measured server-side, boxes in image pixels |
| **A2 Evidence Intelligence** — BM25 + optional vectors (RRF), citation validator | ✅ AI suggestions kept separate from verdicts |
| **A3 Sentinel** — reassessment tasks, notifications, expiry scan | ✅ Dedupe enforced by a DB unique constraint |
| New screens: `/notifications`, `/manager/sentinel` | ✅ |
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
| Single-image Docker deploy (API + SPA on one origin) | ✅ `Dockerfile` + `docker-compose.yml` |
| Backend tests | ✅ **108 pytest tests passing** |
| Browser e2e | ✅ Login (both roles) → submit → findings → evidence → queue → audit, 0 console errors |
| **Reliability** — structured errors + `X-Request-ID`, rich `/health` capability report | ✅ Every failure returns `{code, message, details, request_id}`; no stack traces leak |
| **A2 runtime** — real local ONNX encoder (`multilingual-e5-small`) | ✅ `onnxruntime` + `tokenizers`; BM25-only fallback when the model is absent, and `/health` says which |
| **A1 palette** — deterministic KMeans (`scikit-learn`), median-cut fallback | ✅ Flat posters yield one colour at ratio 1.0 instead of noise |
| **A3 scheduler** — APScheduler daily sweep at 02:00 UTC | ✅ Same idempotent service as the manual "Scan now" button |
| **AI Trust screen** (`/manager/trust`) | ✅ Counted from stored call logs, not estimated |

---

## Documentation

| Doc | What's in it |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Component diagram, request lifecycle, rule engine, A1/A2/A3 data flow, deployment topology |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model, upload validation, RBAC matrix, secrets, rate limits, what was actually verified |
| [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) | Every command, per-file test counts, results, failures found and fixed |
| [`docs/RELIABILITY_CHECKLIST.md`](docs/RELIABILITY_CHECKLIST.md) | Failure cases walked one by one with pass/fail and evidence |
| [`LIMITATIONS.md`](LIMITATIONS.md) | What this build does **not** do, stated plainly |
| [`ROADMAP.md`](ROADMAP.md) | Near / medium / long term, with unbuilt work marked as future |

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

### Docker (single image, one origin)

One image serves the API and the built frontend on the same origin, so there is no CORS surface at all.

```bash
docker compose build
docker compose run --rm app python backend/seed.py   # one-off: clears + reseeds demo data
docker compose up
# open http://localhost:8000
```

Seeding is deliberately **not** in the entrypoint — it resets the database, so it must never run on every
restart. Data and uploads live on named volumes (`precedent-data`, `precedent-uploads`).

The image installs `tesseract-ocr`, `libgl1` and `libglib2.0-0`, which A1 needs for OCR and OpenCV.
It was written and reviewed but **not executed in this environment** (no Docker daemon available here).

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
| 12 | Sentinel (A3) | `/manager/sentinel` | `src/pages/manager/Sentinel.tsx` |
| 13 | AI Trust | `/manager/trust` | `src/pages/manager/Trust.tsx` |
| 14 | Notifications (A3) | `/notifications` | `src/pages/Notifications.tsx` |

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
    rule_engine.py          Deterministic engine (text + asset facts, three-way verdicts)
    ai.py                   Configurable LLM client; returns None when unconfigured
    services/               submissions, documents, rules, exceptions, simulation, assets, audit
      visual/               A1: ocr, colors, logo_match, layout, contrast, pipeline
      evidence.py           A2: BM25 + vectors (RRF), LLM reviewer, citation validator
      sentinel.py           A3: publications, impact finder, tasks, notifications
    routers/                auth, team, submissions, guidelines, rules, claims, exceptions,
                            simulations, audit, assets, analysis, evidence, sentinel
  alembic/                  migrations wired to app settings
  seed.py                   fictional demo dataset (+ runs the A1 analysis once)
  tests/                    pytest (engine, auth, RBAC, exceptions, submissions, simulation,
                            conflicts, A1 visualguard, A2 evidence, A3 sentinel)
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

## A1 VisualGuard — measured poster analysis

Upload returns immediately with `status: pending`; a background task runs the pipeline and the frontend polls
`GET /analysis/{id}` every two seconds until it leaves `pending`. Every value is measured by a classical
analyser — nothing is guessed by a model.

| Analyser | What it produces | Where |
|---|---|---|
| OCR | text + per-line boxes + confidence | `services/visual/ocr.py` |
| Colours | dominant palette + background (border ring) | `services/visual/colors.py` |
| Logo | approved-logo match, box, confidence | `services/visual/logo_match.py` |
| Layout | margins, clear space, aspect ratio, text density | `services/visual/layout.py` |
| Contrast | WCAG 2.2 ratio per text region | `services/visual/contrast.py` |

Boxes are stored in **original image pixel coordinates**. The frontend scales them with an SVG `viewBox`, so
they stay correct at any display size, on resize and on mobile. Clicking a finding highlights its box.

Rules that consume these facts: `LOGO-001` (logo present and correct), `COLOR-001` (background inside palette
tolerance), `CONTRAST-001` (WCAG AA), `FORMAT-001` (channel aspect ratio), plus the existing `BR-01`, `LO-02`,
`IM-03`, `SM-01`, `TY-01`.

**Honest limits**

- **Font family is never claimed.** A flat image does not reliably identify a typeface, so `TY-01` reports
  "no typeface recorded" and goes to human review rather than inventing a font name.
- **Logo matching is correlation, not recognition.** A heavily rotated or recoloured mark scores low. Below
  `LOGO_MATCH_THRESHOLD` the result is `needs_review`, never a violation — the rule is deliberately three-way
  (confident → pass, low confidence → review, very low → fail).
- **Contrast is an automated check, not an accessibility certification.** It measures the pixels it can see.
- **OCR only uses installed Tesseract language packs.** This machine has `eng` only, so a request for
  `hin`/`mar` is downgraded to `eng` and the actual pack used is reported in `engine.langs`.
- A blank or corrupt file yields `status: failed` / `unreadable: true` with an explicit message — not a set of
  fake passes.

---

## A2 Evidence Intelligence — AI that must prove its work

Deterministic findings and AI suggestions are returned as **separate lists**. The AI never changes a verdict.

1. Copy is split into sentences.
2. Each sentence retrieves the top-K guideline passages with hybrid search — BM25 (pure Python, k1=1.5, b=0.75)
   plus optional embedding cosine — combined by **reciprocal rank fusion** (k=60).
3. An optional OpenAI-compatible LLM proposes findings as strict JSON.
4. Every claim passes the **citation validator**:
   - `rule_code` must exist **and** be `active`;
   - `passage_id` must be one of the passages retrieved for that sentence;
   - `quote` must appear in the **stored** passage after whitespace normalisation and case-folding.
5. Valid results are stored as `ai_suggestion`, or `needs_human_review` below the confidence threshold.
   **Rejected citations are persisted and shown** with their rejection reason — they are never silently dropped.

With no `LLM_API_KEY`, `semantic_review` returns an empty list and writes one `ai_call_log` row with
`status: skipped`. Retrieval still works (BM25-only), and `GET /evidence/capabilities` reports which mode is
active instead of pretending to be hybrid. Timeouts are one retry, then degrade — the request never 500s
because the model is down. Uploaded text and guideline text are treated as untrusted data and delimited in the
prompt, with the system prompt told to ignore instructions inside them.

`GET /evidence/trust` is the AI Trust Panel: calls by purpose, success/timeout/error rates, citations verified
vs rejected, average latency, prompt version and model name — all computed from `ai_call_log`.

---

## A3 Sentinel — change has consequences

Approved or published content can silently become non-compliant. Sentinel finds that content and creates human
work.

**Triggers:** rule activated, rule edited, rule deactivated, exception expired, exception revoked, claim
withdrawn. Each is recorded and forwarded to the impact finder.

**Impact finder:** selects versions that are approved or published (never drafts), replays the current active
rule set with the deterministic engine, and reports only findings that are **new** relative to what the
submission already carries open — so pre-existing problems are never re-reported.

**Dedupe:** `reassessment_tasks` has a unique constraint on `(submission_version_id, trigger_type, trigger_ref)`.
The service checks first and also catches `IntegrityError` on a savepoint, so two identical triggers produce
exactly one task and the batch still completes.

**Notifications:** the content owner and workspace managers get a `Notification`; the bell polls the unread
count every 30 seconds. `due_at` = now + `SENTINEL_SLA_DAYS`, and overdue tasks are flagged.

**Resolution:** `re_approve` / `request_changes` / `withdraw`, each written to the audit log.

With no approved or published content in scope the result is an explicit `{"affected": 0, "tasksCreated": 0}` —
never a fabricated number.

---

## Features → endpoints

| Feature | Endpoint(s) |
|---|---|
| Brand Guideline Library | `GET/POST /guidelines`, `GET /guidelines/{id}/file` (PyMuPDF / python-docx) |
| Evidence-Linked Review | findings embedded in `GET /submissions/{id}` (cite `sourcePassage`) |
| Minimal-Edit Suggestions | `suggestedFix` on each finding (deterministic) |
| Version-Based Approvals | `POST /submissions/{id}/versions`, `POST /submissions/{id}/decide` |
| Exception Rulings | `GET/POST /exceptions`, `POST /exceptions/{id}/decide` (expiry enforced) |
| Rule Conflict Detection | `GET /rules/conflicts` |
| Rule Impact Sandbox | `GET/POST /simulations`, `POST /simulations/{id}/activate` |
| Audit Log + Guideline Health | `GET /audit`, `GET /audit/health`, `GET /audit/export` |
| Brand / Product Image Management | `GET/POST /assets`, `POST /assets/{id}/approve`, `POST /assets/research` |
| Guideline Passages & Search | `GET /guidelines/search`, `POST /rules/{id}/reject`, `POST /rules/{id}/confirm` |
| Exception Lifecycle & Revocation | `POST /exceptions/{id}/revoke`, `GET /exceptions/{id}/history` |
| **A1** Poster upload + analysis | `POST /analysis/upload`, `GET /analysis/{id}`, `GET /analysis/submission/{id}`, `POST /analysis/{id}/rerun` |
| **A1** Poster file (token-protected) | `GET /analysis/{submission_id}/file` |
| **A2** Semantic review | `POST /evidence/review/{submission_id}`, `GET /evidence/findings/{submission_id}` |
| **A2** Retrieval + trust | `GET /evidence/search?q=`, `GET /evidence/capabilities`, `GET /evidence/trust`, `POST /evidence/sync-embeddings` |
| **A3** Publications | `GET /sentinel/publications`, `POST /sentinel/publications`, `DELETE /sentinel/publications/{id}` |
| **A3** Reassessment tasks | `GET /sentinel/tasks`, `POST /sentinel/tasks/{id}/resolve` |
| **A3** Notifications + expiry scan | `GET /sentinel/notifications`, `GET /sentinel/notifications/unread-count`, `POST /sentinel/notifications/{id}/read`, `POST /sentinel/notifications/read-all`, `POST /sentinel/scan` |
| **A3** Sentinel triggers | `PATCH /rules/{id}`, `POST /rules/{id}/deactivate`, `POST /rules/{id}/confirm`, `POST /exceptions/{id}/revoke`, `POST /claims/{id}/withdraw` |
| **Reliability** | `GET /health` (database, storage, OCR, embeddings, LLM, scheduler, retrieval mode) |

---

## Verification (this build)

- `cd backend && .venv312/Scripts/python.exe -m pytest -q` → **108 passed** (Round 2 suite plus 66 new tests for
  A1/A2/A3: contrast thresholds, colour extraction, layout geometry, logo three-way verdicts, pipeline failure
  handling, BM25 retrieval and workspace scoping, every citation rejection reason including fabricated quotes,
  no-LLM degradation, Sentinel task creation, dedupe on repeat triggers, draft exclusion, notification counts,
  expiry-scan idempotency, and the monitored-publication list).
- `npm run build` → **passes** (1625 modules transformed, 0 TypeScript errors, 610 kB JS / 161 kB gzipped).
- `node e2e-check.mjs` (both servers running) → creator login → submit `100% safe / boosts immunity / 20% off` →
  feedback page shows findings with rule codes and "View source evidence" → manager sees the new submission in the
  queue → audit records it. **0 console errors.**
- `node qa_ui.mjs all` → 17 screens captured at 1440×900 and 390×844; **horizontal overflow 0 on every screen**.
- A1 on the seeded demo poster → OCR reads 5 lines, logo matched at 0.96 confidence, background `#7BB93C`
  accepted inside palette tolerance, one real contrast failure at 2.63:1, and every finding carries a region box.
- A3 end-to-end → forcing a real violation on approved content produced **1 task, 2 notifications, a 3-day due
  date**, and an identical repeat trigger produced **0 tasks with `skipped: 1`**.
- `GET /health` on this machine →
  `{"status":"ok","ocr":{"ok":true},"embeddings":{"ok":true,"model":"multilingual-e5-small"},"llm":{"configured":false},"scheduler":{"running":true,"cron":"02:00 UTC"},"retrieval":"hybrid_bm25_vector"}`.

Full command log, per-file counts and known failures: [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

---

## Honesty notes

- **No fabricated data.** The workspace ships a fictional seed dataset, labelled "Fictional demo workspace".
  The demo wordmark and poster are generated fictional assets, not a real brand.
- **No fabricated citations.** Every deterministic finding cites the stored `sourcePassage`; unevaluable checks
  become **Needs review** via an explicit `outcome` field, not by guessing from wording.
- **AI is optional and never authoritative.** With no `LLM_API_KEY`, AI helpers return nothing and the
  deterministic engine decides. Rejected AI citations are stored and displayed, not hidden.
- **A1 limits are stated in the UI, not buried.** No font-family claims, low-confidence logo matches become
  review items, contrast is a check rather than a certification, and only installed OCR language packs are used.
- **The rule engine is code-based.** Each rule code is implemented in `rule_engine.py`; the `condition` column
  is human-readable documentation of that logic. Editing only the condition text does not change engine
  behaviour — activation and deactivation do. This is why a rule *edit* can legitimately report `affected: 0`.
- **Docker was not executed here.** No Docker daemon in this environment; the image definition is reviewed but
  unverified at runtime.
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

1. **Deployment** — the image and compose file exist, but they have not been run here. Still to do: secrets
   management, managed PostgreSQL, and a scheduled `POST /sentinel/scan` (the cron time is configured but the
   scheduler is external by design).
2. **pgvector** — semantic search over guideline passages (optional, Postgres only). `passage_embeddings` stores
   vectors as JSON so SQLite works today; the same column migrates to pgvector without touching the service layer.
3. **Real embeddings** — set `EMBEDDING_MODEL` / `EMBEDDING_MODEL_PATH` to enable the vector half of hybrid
   retrieval. Until then retrieval is BM25-only and the API says so.
4. **Real external image source** — wire `IMAGE_SOURCE_API_URL` to an official product-image API.
5. **Email** — password-reset delivery (the endpoint is present and never leaks account existence).
6. **Hindi/Marathi OCR** — install the Tesseract `hin` and `mar` language packs, then set
   `OCR_LANGS=eng+hin+mar`. The pipeline already downgrades gracefully and reports which packs it used.
