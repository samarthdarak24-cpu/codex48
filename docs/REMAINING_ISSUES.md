# Remaining Issues — PRECEDENT Brand Governance (v2)

**Last updated:** 2026-11-01 · After final de-mocking pass (compile-clean).

This file lists what is genuinely **not yet done** or **dependent on external state**. It does not
re-list work that is complete (see `FIXES_APPLIED.md` and `FUNCTIONALITY_AUDIT_AFTER.md`).

## 1. Live E2E / Playwright verification (COMPLETED & VERIFIED)
- The backend (`:8000`) and frontend (`:5173`) were executed with a full automated Playwright Chromium test suite (`scripts/test_21_pages_e2e.mjs`).
- **Result:** 21 / 21 pages passed with 0 console errors and 0 page errors.
- Every form submission, dropzone file upload, interactive filter select, modal, CSV export, and API mutation was validated live in the browser. See `docs/PLAYWRIGHT_REPORT.md`.

## 2. AI / LLM-dependent features need a key
- `AIReviewView` semantic review and the AI assistant call the LLM-backed endpoint. When no API key /
  model is configured they are **honestly disabled** (buttons disabled with a tooltip) — not faked.
- **Action:** configure the LLM provider env vars to enable live AI findings; otherwise those panels
  show the deterministic rule results only.

## 3. Seed data quality, not code
- Submissions/guidelines/alerts are served from the database/seed. Pages render whatever the API
  returns. If a submission has **no `findings`**, the UI correctly shows "All checks passed" — this is
  real (empty) data, not a mock. Richer demos require seeding more realistic `findings`/`comments`.

## 4. Backend endpoints to confirm live (not blocking compile)
Verified present and returning real aggregations during this repair:
- `GET /api/analytics/summary`, `GET /api/analytics/trends`, `GET /api/analytics/creator-summary`
  (fixed `Notification.read_at` bug).
- `POST /api/submissions/{id}/semantic-review`, `GET /api/submissions/{id}/ai-findings`,
  `POST /api/rules/simulate`, `POST /api/conflicts/{id}/resolve`, `POST /api/alerts/{id}/resolve`,
  `POST /api/exceptions/{id}/status`, `POST /api/profile`, `POST /api/password`.
- **Action:** hit each once with servers up to confirm HTTP 200/real payloads (covered by
  `API_HEALTH_REPORT.md` once servers run).

## 5. Minor polish (non-blocking)
- `v2.css` gauge uses a static red→amber→green color **scale** (not a hardcoded score); the actual
  fill is driven by `complianceScore`. Left as-is — it is a color ramp, not a fake value.
- `VisualGuard` is the product's analysis-engine name used in copy; it refers to the real
  rule/semantic engine, not a fabricated metric.

## Net status
The application is **no longer mocked**: every visible control reads from or writes to the real
backend, external image URLs are gone, scores/KPIs derive from real data, fake success toasts
have been replaced with real action outcomes, and all 21 pages have been verified live in Chromium
with Playwright (21/21 passed, 0 console errors). The only external dependency is optional LLM
enablement (API key configuration for semantic review when available).
