# Precedent — Functionality Audit (Before / During Repair)

**Date:** 2026-11-01
**Scope:** Frontend–backend wiring, authentication, and the 21 role pages.
**Method:** Every claim below was reproduced — no issue is recorded from guesswork.

## 1. Reproduction environment

| Component | Address | Status at inspection |
|---|---|---|
| FastAPI backend | `http://127.0.0.1:8000` | `GET /health` → **200** |
| Vite frontend | `http://127.0.0.1:5173` | **200** |
| Browser harness | Playwright (headless Chromium 1248) | used for all UI reproduction |
| API probing | HTTP (`fetch` / `curl`) with a real JWT | used for persistence checks |

Techniques used:
1. Browser automation driving the real login, navigation and button clicks.
2. HTTP calls against the backend before/after each UI action to confirm persistence.
3. Static inspection of `src/App.tsx`, `src/services/api.ts`, `src/context/AuthContext.tsx`,
   `src/v2/context/AppContext.tsx` and each view component.

---

## 2. Confirmed defects (reproduced, root-caused, fixed, retested)

### D1 — Two separate UIs were reachable (the reported "2 UI" problem)

| Field | Detail |
|---|---|
| UI element | Route table (`src/App.tsx`) |
| Expected behaviour | One coherent application; a Creator always lands in the same workspace. |
| Existing behaviour | Three coexisting surfaces: marketing `/`, a **legacy** `/app/*` + `/notifications` workspace, and the **v2** `/creator/*`, `/manager/*` workspace. A Creator on `/creator/dashboard` could still open `/app/overview`. |
| Frontend handler | `RequireRole` / `RequireSession` guards |
| API endpoint | n/a (routing-level) |
| Backend service | n/a |
| Database operation | n/a |
| Error / root cause | Historical: the v2 21-page workspace was added alongside the original workspace without retiring the original routes. The legacy surface has **no sign-out control**, so a user landing there appeared unable to sign out. The legacy page also rendered effectively empty (`/app/overview` body had no content). |
| Required fix | Make the v2 21-page workspace the single application; redirect legacy paths into it. |
| Fix applied | Removed the legacy `/`, `/app/*` and `/notifications` route renderings and replaced them with redirects (`/`→`/login`, `/app/*`→`/creator/dashboard`, `/notifications`→role-aware v2 notifications). Legacy components were **not deleted**, so nothing is lost irrecoverably. |
| Verification test | Browser: logged in as Creator, requested `/app/overview`, `/app/new`, `/app/submissions`, `/app/guidelines`, `/app/feedback` and `/notifications`. |
| Result | **PASS** — all resolve into the v2 workspace (`/creator/dashboard`, `/creator/notifications`); no legacy layout rendered. |

### D2 — New Content: brand check was fabricated

| Field | Detail |
|---|---|
| UI element | “Run Brand Check” button (`src/v2/components/views/creator/NewContentView.tsx`) |
| Expected behaviour | Run the real review pipeline and report actual findings. |
| Existing behaviour | `setTimeout(…, 1000)` then `addToast('Brand Check complete: 100% compliant with Summer 2026 guidelines!')`. **No API call, no record created, result invented.** |
| Frontend handler | `handleRunBrandCheck` |
| API endpoint | none (before) → `POST /submissions`, `POST /evidence/review/{id}` (after) |
| Backend service | none (before) → submission service + Evidence Intelligence (after) |
| Database operation | none (before) → `INSERT` submission + analysis findings (after) |
| Error / root cause | The handler was a UI placeholder that never called the backend, and it asserted a compliance percentage that was never computed — a direct violation of “never show a percentage without its sample count”. |
| Required fix | Create the real submission, run the real review, report the real finding count. |
| Fix applied | `handleRunBrandCheck` now calls `api.createSubmission(...)` (via `ensureDraft`) then `api.runSemanticReview(id)`, and reports the **actual** count (`Brand check found N finding(s)` / `no findings raised`). Failures surface the real error message. |
| Verification test | Browser click + HTTP count of `/submissions` before/after. |
| Result | **PASS** — submissions went **15 → 16**, newest record `Glow Naturally`; the fabricated “100% compliant” string no longer appears; toast reflects the real pipeline. |

### D3 — New Content: “Save Draft” did not persist

| Field | Detail |
|---|---|
| UI element | “Save Draft” button |
| Existing behaviour | `addToast('Draft saved successfully to My Submissions', 'info')` — **toast only, nothing written**. |
| Root cause | Handler never reached the API; success was reported without backend confirmation. |
| Fix applied | Calls the real create endpoint, awaits `refresh()`, and toasts success **only** after the backend confirms. Added a duplicate-click guard (`disabled` while saving). |
| Verification test | Same run as D2. |
| Result | **PASS** — a real record was created (15 → 16). |

### D4 — Dead “Add another asset” button

| Field | Detail |
|---|---|
| UI element | “Add another asset” |
| Existing behaviour | `onClick={() => addToast('Add another asset flow', 'info')}` — no functionality. |
| Root cause | Placeholder never wired; the v2 page also lacked the Brand & Product Assets picker that the legacy UI had. |
| Fix applied | Replaced with the real `BrandAssetsPicker` (search, upload, attach, remove) wired to the asset API. |
| Verification test | Render check on `/creator/new-content`. |
| Result | **PASS** — picker rendered with “8 in library” (live count from the API). |

### D5 — Hardcoded external stock image presented as the brand creative

| Field | Detail |
|---|---|
| UI element | Upload-creative preview `<img src="https://images.unsplash.com/...">` |
| Existing behaviour | A third-party Unsplash photo shown as “the creative”, misrepresenting the fictional PureGlow brand. |
| Fix applied | Replaced with real selection state — shows “Approved asset attached” (with remove) or “No creative attached yet”. |
| Result | **PASS** — no external stock image; state reflects the actually attached asset. |

### D6 — Checklist claimed “Passed” without running a check

| Field | Detail |
|---|---|
| UI element | Pre-flight checklist row `Visual assets` |
| Existing behaviour | `status: hasRunCheck ? 'Passed' : 'Pending'` — asserted a pass with no evidence. |
| Fix applied | Now `Pending` / `Issues` / `Clear`, derived from the real findings count. |
| Result | **PASS** — no unearned “Passed”. |

---

## 3. Verified working (reproduced this session)

| Check | Evidence |
|---|---|
| Sign in — Brand Manager | `david.kim@pureglow.co` → `/manager/overview` |
| Sign in — Content Creator | `emily.carter@pureglow.co` → `/creator/dashboard` |
| Sign out | Avatar → account menu → **Sign out** → `/login`; revisiting `/manager/overview` re-redirects to `/login` |
| Role redirect | Guards send each role to its own workspace |
| Single UI | All legacy paths redirect into v2 (see D1) |
| New Content create + check | 15 → 16 submissions; real finding count; **0 console/page errors** |
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **succeeds** (bundle-size warning only) |
| Backend core governance tests | **26 passed** in 41.1s (auth, RBAC, rule engine, submissions, exceptions, workspace isolation) |
| Backend suite size | **138 tests collected** |

---

## 4. Status of the 21 pages

Honest status as of this session. **PASS** means reproduced working with evidence.
Only the pages I actually drove in a browser this session are marked PASS.
The remaining pages were confirmed to render without console errors in earlier
sweeps, but their individual controls were **not** exhaustively re-audited here,
so they are recorded as `NOT RE-AUDITED` rather than claimed as complete.

### Content Creator (10)

| # | Page | Route | Status | Note |
|---|---|---|---|---|
| C01 | Creator Dashboard | `/creator/dashboard` | NOT RE-AUDITED | Renders, 0 console errors; metrics derive from live records |
| C02 | New Content | `/creator/new-content` | **PASS** | Fixed + verified (D2–D6) |
| C03 | My Submissions | `/creator/submissions` | NOT RE-AUDITED | Renders; versioning not re-tested here |
| C04 | AI Review | `/creator/ai-review` | NOT RE-AUDITED | Renders |
| C05 | Guidelines (read-only) | `/creator/guidelines` | NOT RE-AUDITED | Renders |
| C06 | Exception Requests | `/creator/exceptions` | NOT RE-AUDITED | Renders |
| C07 | Sentinel Tasks | `/creator/sentinel-tasks` | NOT RE-AUDITED | Wired to real tasks in a prior pass |
| C08 | Notifications | `/creator/notifications` | NOT RE-AUDITED | Route also reached via `/notifications` redirect |
| C09 | Approved Content | `/creator/approved-content` | NOT RE-AUDITED | Renders |
| C10 | Creator Profile | `/creator/profile` | NOT RE-AUDITED | Renders |

### Brand Manager (11)

| # | Page | Route | Status | Note |
|---|---|---|---|---|
| M01 | Manager Overview | `/manager/overview` | NOT RE-AUDITED | Renders; metrics derive from live records |
| M02 | Review Queue | `/manager/review-queue` | NOT RE-AUDITED | Renders |
| M03 | All Submissions | `/manager/submissions` | NOT RE-AUDITED | Renders |
| M04 | Brand Guidelines | `/manager/guidelines` | NOT RE-AUDITED | Renders |
| M05 | Rules & Conflicts | `/manager/rules-conflicts` | NOT RE-AUDITED | Renders |
| M06 | Exceptions | `/manager/exceptions` | NOT RE-AUDITED | Renders |
| M07 | Rule Impact Sandbox | `/manager/rule-impact-sandbox` | **PARTIAL** | Known gap: still uses local rule list/result; `/simulations` endpoints exist but are **not** wired to this view |
| M08 | Sentinel Monitoring | `/manager/sentinel` | NOT RE-AUDITED | Renders |
| M09 | Asset Library | `/manager/assets` | NOT RE-AUDITED | Renders; KPIs derive from live records |
| M10 | Analytics & Health | `/manager/analytics` | **PARTIAL** | KPIs, top-rules and campaign tables + CSV export are live; the donut, compliance-trend line and Guideline Health card still use static figures |
| M11 | Audit History | `/manager/audit-history` | NOT RE-AUDITED | Renders |

---

## 5. Known remaining gaps (documented, not claimed as done)

1. **Rule Impact Sandbox (M07)** — not yet wired to `POST /simulations` / `/simulations/{id}/affected-content`.
2. **Analytics (M10)** — donut, trend line and Guideline Health card still static.
3. **Remaining 19 pages** — controls (filters, forms, drawers, pagination, exports) not individually re-audited this session.
4. **Full backend suite** — 138 tests collected; the complete run exceeded the 600s budget in this session (heavy OCR/embedding fixtures), so only the 26-test core subset was executed. This is a **time budget** limitation, not a known failure.
5. **Aggregation endpoints** — `GET /creator/dashboard` and `GET /manager/dashboard` are not separate endpoints; the client derives metrics from real list endpoints.
6. **API prefix** — the app uses its existing `/…` routes rather than the spec’s `/api/v1/…`, per DESIGN.md “reconcile with existing APIs before adding duplicates”.
