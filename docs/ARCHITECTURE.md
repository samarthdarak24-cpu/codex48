# Architecture

How Precedent is put together, why the boundaries sit where they do, and what
happens on a single request from click to database.

**Stack:** React 18 + TypeScript + Vite + Tailwind (frontend) · FastAPI +
SQLAlchemy 2 + Pydantic 2 + Alembic on Python 3.12 (backend) · SQLite by default,
PostgreSQL for production.

---

## 1. Component diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Browser (React SPA)                                                      │
│                                                                          │
│  pages/            one file per screen (creator · manager · shared)       │
│  context/          AuthContext (JWT session) · DataContext (working set)  │
│  lib/selectors.ts  every dashboard number is DERIVED, never hardcoded     │
│  lib/ruleEngine.ts client mirror, used for instant preview only           │
│  services/api.ts   the single HTTP seam — Bearer token, typed ApiError     │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │  fetch · JSON · Authorization: Bearer
                                    │  ← X-Request-ID, structured error body
┌───────────────────────────────────▼──────────────────────────────────────┐
│ FastAPI                                                                  │
│                                                                          │
│  RequestIDMiddleware  → assigns/propagates X-Request-ID, logs 5xx only    │
│  install_error_handlers → AppError · HTTPException · ValidationError ·    │
│                           catch-all (never leaks a stack trace)           │
│                                                                          │
│  deps.py       get_current_user (JWT) · require_manager (RBAC)            │
│                                                                          │
│  routers/      auth team submissions guidelines rules claims exceptions   │
│                simulations audit assets analysis evidence sentinel        │
│                          │                                               │
│  services/     ┌──────────┴───────────────────────────────────────────┐  │
│                │ submissions · documents · rules · exceptions ·       │  │
│                │ simulation · assets · audit                          │  │
│                │ visual/    A1: ocr · colors · logo_match · layout ·  │  │
│                │            contrast · pipeline                       │  │
│                │ evidence.py A2: chunking · BM25 · ONNX vectors ·    │  │
│                │            RRF · LLM reviewer · citation validator   │  │
│                │ semantic/  ONNX encoder + tokenizer (lazy, cached)   │  │
│                │ sentinel.py A3: publications · impact · tasks ·      │  │
│                │            notifications                            │  │
│                │ scheduler.py APScheduler daily sweep                │  │
│                └──────────┬───────────────────────────────────────────┘  │
│                           │                                              │
│  rule_engine.py  deterministic, pure, no I/O, no network                 │
└───────────────────────────┼──────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────────┐
│ SQLAlchemy 2 (typed Mapped[]) → SQLite (dev) / PostgreSQL (prod)          │
│ models: User · Submission · ContentVersion · Finding · Rule · Guideline   │
│         GuidelinePassage · ApprovedClaim · ExceptionRequest ·             │
│         Simulation · AuditEvent · BrandAsset · AssetAnalysis ·            │
│         AiCallLog · Publication · ReassessmentTask · Notification         │
└──────────────────────────────────────────────────────────────────────────┘
                            │
        uploads/ (posters, guideline docs, brand assets) on local disk
        backend/models/ multilingual-e5-small ONNX + tokenizer (113 MB)
```

---

## 2. Request lifecycle

Take the most important path in the product: **a creator submits content.**

```
1. POST /submissions                       (creator)
   │  Authorization: Bearer <jwt>
   ▼
2. RequestIDMiddleware            request.state.request_id = incoming or new
   ▼
3. get_current_user               verify JWT signature → load User → workspace
   ▼
4. submissions router             validate body (Pydantic) → 422 with field list
   ▼
5. submissions service
   ├─ create Submission + ContentVersion (version = previous + 1)
   ├─ load ACTIVE rules + unexpired exceptions for THIS workspace
   ├─ rule_engine.evaluate(...)   ← pure function, deterministic
   │     text rules   → regex / keyword predicates over normalised text
   │     asset rules  → facts from AssetAnalysis (OCR, palette, logo, contrast)
   │     each check yields violation | compliant | unknown
   ├─ persist Finding rows (outcome, rule_code, sourcePassage, suggestedFix)
   └─ AuditEvent("submission.created")
   ▼
6. Response 201 { submission, findings[], issueCount, aiTrust }
   ▼
7. DataContext refetches the working set; the queue and dashboard re-derive
```

**Where the AI is *not*:** step 5. The AI layer (A2) runs separately on request
(`POST /evidence/review/{id}`) and can only append `AiFinding` rows marked
advisory. It cannot add a violation, cannot change an outcome, cannot activate a
rule.

### Error shape (every failure, one format)

```json
{
  "code": "validation_error",
  "message": "Some fields need attention.",
  "details": { "fields": [{ "field": "title", "message": "field required" }] },
  "request_id": "9f2c1b…",
  "detail": "Some fields need attention."
}
```

`detail` mirrors `message` so the typed frontend client keeps working; `code` is
stable for programmatic handling; `request_id` matches the `X-Request-ID`
response header and the server log line.

---

## 3. The rule engine (deterministic core)

`backend/app/rule_engine.py` is the only thing that decides a verdict.

| Property | Why |
|---|---|
| **Pure** | No I/O, no network, no clock. Same input → same output, always. |
| **Three-way** | `violation` / `compliant` / `unknown`. `unknown` surfaces as **Needs review**, never as a pass. |
| **Code-implemented** | Each rule code has an implementation. The `condition` column is human-readable documentation of that code. |
| **Facts, not guesses** | Asset rules read measured facts (OCR lines, palette ratios, logo score, contrast ratio). Missing fact → `unknown`. |
| **Exception-aware** | An unexpired, approved exception for `(rule_code, submission)` suppresses that finding — and the suppression is recorded. |

The client (`src/lib/ruleEngine.ts`) mirrors this for instant preview while
typing. The server result always wins; the mirror exists so the UI is responsive,
not so it can be trusted.

---

## 4. A1 VisualGuard — data flow

```
upload (multipart) ──► POST /analysis/upload
   │  validate: MIME + extension + size ≤ MAX_UPLOAD_MB → 413 / 415
   │  store:    uploads/<id>.<ext>, never the client filename
   ▼
Pillow open → RGB, EXIF-rotated, downscaled for analysis (original kept)
   ▼
┌──────────────────┬──────────────────┬──────────────────┬─────────────────┐
│ OCR (Tesseract)  │ Palette (KMeans) │ Logo (ORB)       │ Layout/Contrast │
│ text + per-line  │ sklearn KMeans   │ match against    │ clear-space,    │
│ pixel bbox       │ k≈5, near-dup    │ approved brand   │ WCAG ratio per  │
│                  │ centroids merged │ assets           │ text/background │
└──────────────────┴──────────────────┴──────────────────┴─────────────────┘
   ▼                                    ▼
AssetAnalysis row                   Finding rows, each with region {x,y,w,h}
   │                                in ORIGINAL image pixels
   ▼
GET /analysis/{id} ──► PosterCanvas draws SVG boxes scaled by
                       renderedWidth / originalWidth
```

Two deliberate constraints:

1. **Coordinates are stored in original image pixels**, never in display
   pixels. The overlay scales at render time, so the boxes stay correct at any
   zoom or container width.
2. **A failed step does not fail the upload.** If Tesseract is missing, the
   analysis completes with `ocr.ok = false`, text rules become `unknown`, and
   `/health` says OCR is unavailable. Honest degradation over a blank screen.

---

## 5. A2 Evidence Intelligence — data flow

```
Guideline doc ──► PyMuPDF / python-docx ──► passages (page-anchored)
                                              │
                                    chunk + index
                                              ▼
                        ┌─────────────────────────────────┐
                        │ BM25 (Okapi, k1=1.5, b=0.75)    │  lexical
                        │ ONNX encoder → float vectors    │  semantic
                        └───────────────┬─────────────────┘
                                        │  query: "…"
                                        ▼
                             Reciprocal Rank Fusion (k=60)
                                        ▼
                                 top-k passages
                                        ▼
                          LLM reviewer (optional, 20 s, 1 retry,
                           daily call limit, prompt a2-evidence-v1)
                                        ▼
                     candidate suggestion + quote + rule_code + confidence
                                        ▼
                        ┌───────────────────────────────┐
                        │ CITATION VALIDATOR (mandatory)│
                        │ 1. rule_code exists and active│
                        │ 2. passage_id was retrieved   │
                        │ 3. quote is an exact substring│
                        │    after whitespace normalise │
                        └───────────────┬───────────────┘
                             pass ──────┴────── reject
                               ▼                 ▼
                        AiFinding saved    counted as citationsRejected,
                        (advisory only)    never shown as evidence
```

**Why RRF and not a weighted score sum:** BM25 and cosine similarity live on
incomparable scales. RRF only uses ranks, so no normalisation constant has to be
tuned — and a model swap (MiniLM → e5) does not silently change the blend.

**Model:** `multilingual-e5-small`, quantised ONNX, 113 MB, run locally through
`onnxruntime` with `tokenizers`. E5 models expect asymmetric prefixes, so queries
are encoded as `query: …` and passages as `passage: …`. Without the model,
retrieval degrades to BM25-only and the API *says so*
(`/health.retrieval = "bm25"`, `/evidence/capabilities`, AI Trust screen).

**Trust accounting:** every call writes an `AiCallLog` row (purpose, status,
latency, tokens, redactions, prompt version). `/evidence/trust` aggregates those
rows — nothing on the AI Trust screen is estimated.

---

## 6. A3 Sentinel — data flow

```
                    ┌─────────────────────────────────────────┐
  rule edited ─────►│                                         │
  rule activated ──►│  trigger service (6 trigger types)      │
  rule deactivated►│  run_trigger(type, ref, rule_codes)     │
  exception expired►│                                        │
  exception revoked►│                                        │
  claim withdrawn ─►│                                         │
                    └───────────────────┬─────────────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │ impact finder                 │
                        │ scope: published + approved   │
                        │        (never drafts)         │
                        │ replay current active rules   │
                        │ keep only NEW findings        │
                        └───────────────┬───────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │ ReassessmentTask              │
                        │ UNIQUE(version, trigger, ref) │
                        │ → dedupe at the DB, not in    │
                        │   application memory          │
                        │ due_at = now + SLA_DAYS       │
                        └───────────────┬───────────────┘
                        ┌───────────────┴───────────────┐
                        ▼                               ▼
                  Notification                     AuditEvent
                (owner + managers)            (who, what, why)
                        ▼
             resolve: re_approve | request_changes | withdraw
```

**Two entry points, one service:**

| Entry | When | Idempotent? |
|---|---|---|
| Event triggers | immediately on a rule/exception/claim change | yes — unique constraint |
| `POST /sentinel/scan` | manual "Scan now" button | yes — same service |
| APScheduler daily sweep (`02:00` UTC) | unattended | yes — same service |

Because all three call the same function, running the sweep twice on the same day
creates nothing new. The scheduler is in-process; in a multi-worker deployment
set `SENTINEL_SCHEDULER_ENABLED=false` on all but one worker.

---

## 7. Frontend structure

```
src/
  components/
    layout/Shell.tsx      sidebar · topbar · PageHeader · RailCard · QuickAction
    ui/                   Button Badge Card Field Table Misc Toast  (design system)
    visual/PosterCanvas   SVG overlay; scales stored pixel boxes to render width
    content/              ContentThumb · AttachedAsset
  context/
    AuthContext           session in sessionStorage, JWT, role guard
    DataContext           one fetch of the working set; mutations then refetch
  lib/
    types.ts              the backend contract (camelCase, mirrors Pydantic)
    selectors.ts          every metric: countBy, complianceRate, priorityOf …
    ruleEngine.ts         client mirror for preview
  services/api.ts         one function per endpoint; throws typed ApiError
  pages/                  creator (5) · manager (7) · shared (notifications)
```

**Five states per screen, always:** loading (skeleton) · empty (explains what
would appear) · error (retry + `request_id`) · success · permission denied
(403 handled explicitly, with copy that does not pretend the data is hidden).

**No hardcoded metrics.** Every number on every dashboard is computed by
`lib/selectors.ts` from the loaded data. If the API returns nothing, the number
is `0` and the empty state explains why — it is never a placeholder.

---

## 8. Deployment topology

### Local (two processes)

```
Vite dev server :5173  ──proxy/fetch──►  uvicorn :8000  ──►  precedent.db
                                                          └► uploads/
```

### Single image (one origin, no CORS)

```
┌──────────────────────────── Docker container ────────────────────────────┐
│  uvicorn :8000                                                           │
│    ├─ /api-ish routes → FastAPI routers                                  │
│    ├─ /assets/*       → StaticFiles(dist/assets)                         │
│    └─ /{path}         → SPA fallback (path-traversal guarded)            │
│  volumes: precedent-data (/data) · precedent-uploads (/app/uploads)      │
│  system deps: tesseract-ocr · libgl1 · libglib2.0-0                      │
└──────────────────────────────────────────────────────────────────────────┘
```

The SPA mount is registered **after** every router, so it can never shadow an API
route. Any path that is not a real file returns `index.html` and client-side
routing takes over.

### Production target

```
client ──TLS──► reverse proxy (nginx/Caddy)
                  ├─ /      → static SPA build
                  └─ /api   → uvicorn (N workers)
                                ├─ PostgreSQL + pgvector
                                ├─ object storage (uploads)
                                └─ one worker with SENTINEL_SCHEDULER_ENABLED=true
```

---

## 9. Why these boundaries

| Boundary | Reason |
|---|---|
| Rule engine separate from services | It is the product's credibility. Pure functions are testable without a DB, a model, or a network. |
| AI in its own module, behind a validator | The AI can be swapped, disabled, or replaced by a local model without touching a verdict path. |
| One HTTP seam (`services/api.ts`) | Every endpoint, error shape and auth header is defined once. No component calls `fetch` directly. |
| Metrics derived in `selectors.ts` | Impossible to ship a dashboard that disagrees with the table below it. |
| Structured errors at the middleware layer | New routers inherit the format for free; a stack trace can never reach a user. |
| Sentinel dedupe in the database | Application-level dedupe loses races. A unique constraint does not. |
