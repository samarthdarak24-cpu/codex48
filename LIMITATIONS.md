# Limitations

What this build does **not** do, written plainly. Anything listed here is either
by design, an accepted trade-off, or genuinely unfinished. Nothing in this file
is hidden inside the product: the UI states the same limits where they matter.

---

## 1. OCR (A1 VisualGuard)

- **OCR is only as good as the image.** Tesseract runs on the uploaded raster. A
  low-resolution, heavily stylised or low-contrast poster can return partial text.
  When text is missing, the text rules cannot fire — the finding becomes
  **Needs review**, never a silent pass and never an invented violation.
- **Language packs must be installed.** `OCR_LANGS` lists what Tesseract should
  use. Only packs present on the machine are actually loaded; the capability is
  reported in `GET /health` and on the AI Trust screen.
- **No OCR confidence is claimed as a compliance signal.** Per-word confidence is
  kept for diagnostics, but a high confidence score is not evidence that a poster
  is compliant.
- **Handwriting, embossed text and text baked into a photo** are out of scope.

## 2. Logo matching (A1)

- **A reference logo must exist first.** ORB matching needs an approved brand
  asset to compare against. With no reference asset, the logo rule reports
  **Needs review** — it does not guess.
- **Below `LOGO_MATCH_THRESHOLD` (default 0.62) the result is "unknown",** not
  "missing". A crop, a rotation beyond ~30°, or a heavy colour inversion can push
  a genuine logo below the threshold.
- **Scale and perspective tolerance are limited.** ORB is scale-tolerant to a
  degree but not a full homography solver; a logo printed on a curved bottle is
  not reliably matched.

## 3. Typography and layout (A1)

- **`font-family` is not detected and is not claimed.** Identifying the exact
  typeface from a raster image is not reliable, so the product does not pretend
  to check it. Font *size* and *weight* rules are evaluated only where geometry
  can actually be measured.
- **Contrast is a measurement, not a certification.** WCAG ratios are computed
  from sampled text and background colours. Anti-aliasing, gradients behind text
  and photographic backgrounds make the sampled value an approximation; the UI
  labels it as an automated check.
- **Clear-space and safe-area checks need a reference asset.** Without one they
  become review items.

## 4. AI layer (A2 Evidence Intelligence)

- **The AI is optional and never authoritative.** With no `LLM_BASE_URL` /
  `LLM_API_KEY`, every AI helper returns nothing, the AI Trust screen shows
  `0` calls and "Not configured", and the deterministic engine alone decides.
  The demo in this repository runs in exactly that state.
- **Provider dependency.** When a provider *is* configured, latency and
  availability are outside our control: 20 s timeout, one retry, and a daily call
  limit (`LLM_DAILY_CALL_LIMIT`). A timeout is recorded as a `timeout` call
  outcome, not hidden.
- **Every AI claim must cite.** A suggestion whose quote is not an exact
  substring of a retrieved passage is rejected and counted as
  `citationsRejected`. The AI cannot add a rule code, activate a rule, or change
  a verdict.
- **Confidence below `AI_CONFIDENCE_THRESHOLD` becomes "needs review".**
- **Retrieval quality is model-bound.** The bundled `multilingual-e5-small`
  encoder is small (113 MB quantised) and tuned for retrieval, not for reasoning.
  Cross-lingual paraphrases where the key noun never appears in the passage can
  still rank poorly. BM25-only mode (no model present) is weaker on paraphrase
  and stronger on exact terminology — the active mode is reported, not implied.

## 5. Rule engine

- **Rules are code, not data.** Each rule code (`BR-01`, `CL-04`, `MK-02`, …) is
  implemented in `backend/app/rule_engine.py`. The `condition` column is
  human-readable documentation of that logic. Editing only the condition text
  does not change behaviour; activating or deactivating a rule does. This is why
  a rule *edit* can legitimately report `affected: 0`.
- **Only implemented rule codes are evaluated.** A rule created in the UI whose
  code has no engine implementation will never produce a violation — it is
  surfaced as unconfirmed/draft rather than silently "passing".
- **No legal or regulatory interpretation.** Findings reference the team's own
  stored guideline passages. This is not legal advice and does not certify
  compliance with any advertising standard or jurisdiction.
- **Sinhala / Devanagari policy text is not audited.** The seeded workspace is
  English-only. Where a policy exists in another script and its rule codes
  diverge from the `BR-01`-style set, those divergences have not been reviewed.

## 6. Sentinel (A3)

- **Only published or approved versions are re-checked.** Drafts nobody released
  are never queued — by design.
- **The daily sweep is in-process.** APScheduler runs inside the API process at
  `SENTINEL_CRON`. In a multi-worker deployment, set
  `SENTINEL_SCHEDULER_ENABLED=false` on every worker but one. A missed sweep is
  recoverable: the manual "Scan now" button runs the identical idempotent
  service.
- **Trigger coverage is the six listed types** (rule activated / edited /
  deactivated, exception expired / revoked, claim withdrawn). A change made
  directly in the database bypasses the service layer and therefore raises no
  task.

## 7. Data and persistence

- **SQLite is the default** for zero-setup local verification. It is fine for a
  demo, not for concurrent production writes. Set `DATABASE_URL` for PostgreSQL
  and run `alembic upgrade head`.
- **`pgvector` is optional and off by default.** Core features never require it.
- **Uploaded files live on local disk** (`UPLOADS_DIR`). No object storage, no
  CDN, no virus scanning beyond type/size validation.
- **No data retention or deletion policy** is implemented — this is a demo
  workspace with fictional data.

## 8. Deployment

- **Docker was written and reviewed but not executed in this environment**
  (no Docker daemon available). The image definition is included; treat it as
  unverified at runtime.
- **No TLS termination, reverse proxy, or WAF** is configured here. Put it behind
  one before exposing it.
- **No horizontal scaling story.** The scheduler flag above is the only
  multi-worker consideration that has been addressed.

## 9. Accessibility and UI

- **WCAG 2.1 AA was pursued, not certified.** Labelled inputs, focus-visible
  rings, keyboard-dismissible modals, `scope="col"` table headers and
  `prefers-reduced-motion` are implemented; no formal audit (e.g. screen-reader
  walkthrough with NVDA/JAWS) has been performed.
- **English-only UI copy.** The retrieval model is multilingual; the interface is
  not.
- **Charts are simple SVG/CSS**, not a charting library, so there are no
  tooltips-on-hover or zoom interactions.

## 10. What is deliberately *not* built

Listed in `ROADMAP.md` as future work rather than half-implemented here:
ProofPass, Red-Team Lab, agent/MCP integrations, multilingual policy authoring,
advanced analytics, and real-time collaboration.
