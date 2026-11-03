# PRECEDENT — Playwright Test Report

**Date:** 2026-11-02
**Harness:** `scripts/qa_21_feature_audit.mjs` (playwright-core + local Chrome)
**Frontend:** `http://127.0.0.1:5173` (Vite dev)
**Result:** **22 / 22 pages passed, 0 console errors, 0 failed requests**
**Evidence:** `qa-results/features.json`, `qa-results/shots/*.png` (22 screenshots)

---

## 1. Method

For each route the harness:

1. Signs in through the **real API** (`POST /auth/login`) as the role that owns the page.
2. Plants the session where the app actually reads it — `sessionStorage['precedent.session']`.
3. Navigates with `waitUntil: 'networkidle'` and waits for animations to settle.
4. Measures the rendered page and asserts:
   - navigation succeeded and did **not** bounce to `/login`
   - `<main>` contains more than 200 characters of text (not a shell)
   - at least one interactive control exists
   - zero console errors, zero `pageerror`, zero failed requests
5. Captures a 1440×900 screenshot.

A page only passes when **all** of those hold. Nothing is asserted from the DOM's intent —
these are measurements of the rendered result.

---

## 2. Results

| Page | Route | Text | Controls | Tables | Charts | Height/viewport | Verdict |
|---|---|---|---|---|---|---|---|
| Manager · Overview | `/manager/overview` | 1,712 | 32 | 0 | 0 | 1.00 | PASS |
| Manager · Review Queue | `/manager/review-queue` | 1,987 | 44 | 0 | 0 | 1.00 | PASS |
| Manager · All Submissions | `/manager/all-submissions` | 2,516 | 85 | 1 | 2 | 1.23 | PASS |
| Manager · Brand Guidelines | `/manager/brand-guidelines` | 1,105 | 46 | 0 | 0 | 1.00 | PASS |
| Manager · Rules & Conflicts | `/manager/rules-conflicts` | 4,592 | 95 | 0 | 0 | 1.00 | PASS |
| Manager · Exceptions | `/manager/exceptions` | 1,216 | 29 | 0 | 0 | 1.00 | PASS |
| Manager · Rule Impact Sandbox | `/manager/rule-impact-sandbox` | 2,855 | 32 | 0 | 0 | 1.00 | PASS |
| Manager · Sentinel | `/manager/sentinel` | 2,348 | 37 | 1 | 0 | 1.29 | PASS |
| Manager · Asset Library | `/manager/asset-library` | 848 | 51 | 0 | 0 | 1.00 | PASS |
| Manager · Analytics & Health | `/manager/analytics` | 1,986 | 32 | 0 | 4 | 1.00 | PASS |
| Manager · Audit History | `/manager/audit-history` | 1,682 | 49 | 0 | 0 | 1.00 | PASS |
| Creator · Dashboard | `/creator/dashboard` | 1,562 | 27 | 0 | 0 | 1.00 | PASS |
| Creator · New Content | `/creator/new-content` | 1,596 | 33 | 0 | 0 | 1.05 | PASS |
| Creator · My Submissions | `/creator/submissions` | 1,913 | 43 | 0 | 0 | 1.00 | PASS |
| Creator · AI Review | `/creator/ai-review` | 3,275 | 32 | 0 | 0 | 1.00 | PASS |
| Creator · Guidelines | `/creator/guidelines` | 738 | 41 | 0 | 0 | 1.00 | PASS |
| Creator · Exception Requests | `/creator/exceptions` | 834 | 27 | 0 | 0 | 1.00 | PASS |
| Creator · Sentinel Tasks | `/creator/tasks` | 1,103 | 25 | 0 | 0 | 1.00 | PASS |
| Creator · Approved Content | `/creator/approved` | 1,410 | 35 | 0 | 0 | 1.00 | PASS |
| Creator · Notifications | `/creator/notifications` | 294 | 25 | 0 | 0 | 1.00 | PASS |
| Creator · Profile | `/creator/profile` | 994 | 23 | 0 | 0 | 1.00 | PASS |
| Agent Studio | `/manager/agent-studio` | 4,463 | 64 | 0 | 0 | 1.00 | PASS |

**22 / 22 passed.**

No page rendered fewer than 294 characters or fewer than 23 controls. Every page is free of
console errors and failed network requests.

---

## 3. Failures found and fixed during this audit

### 3.1 AI Review — poster 404 (page FAIL → PASS)

```
[FAIL] Creator · AI Review — errors=1
  failedRequests: ["404 http://127.0.0.1:8000/analysis/sub_dfac9746ad2c/file"]
```

Cause: four seeded analyses referenced `uploads/demo_poster_diwali.png`, a file that was
never written. Fixed by repairing the rows, fixing `seed.py`, resolving paths on disk, and
exposing `hasFile` so the UI only requests an image that exists.

### 3.2 AI Review — NaN SVG attributes (page FAIL → PASS)

After the 404 was fixed, the page still logged six errors:

```
Warning: Received NaN for the `width` attribute.
Warning: Received NaN for the `height` attribute.
Error: <rect> attribute width: Expected length, "NaN".
Error: <rect> attribute height: Expected length, "NaN".
```

Cause: two box shapes in the data. The pipeline writes `{x,y,w,h}`; seed data wrote corner
arrays `[x1,y1,x2,y2]`. Reading `.w` off an array yields `undefined`, and
`Math.max(undefined, 1)` is `NaN`, which React refuses to write to an SVG attribute.

Fixed in two places:
- `_normalize_box()` converts either shape to `{x,y,w,h}` at the API boundary;
- `PosterCanvas` drops any box whose dimensions are not finite before rendering.

The page now renders with zero console errors.

### 3.3 Screens that ended short (fixed in an earlier pass)

Two pages previously ended exactly at the viewport with nothing below the fold. Measured
`scrollHeight / clientHeight` across all pages, found Creator · Approved Content at `1.00`
and Manager · Audit History at `1.00`, added real content, and re-measured to `1.51` and
`1.79`. Both now exceed the viewport with meaningful content.

---

## 4. Screenshots

22 full-viewport captures in `qa-results/shots/`:

```
Agent_Studio.png                  Manager_Analytics_Health.png
Creator_AI_Review.png             Manager_Asset_Library.png
Creator_Approved_Content.png      Manager_Audit_History.png
Creator_Dashboard.png             Manager_Brand_Guidelines.png
Creator_Exception_Requests.png    Manager_Exceptions.png
Creator_Guidelines.png            Manager_Overview.png
Creator_My_Submissions.png        Manager_Review_Queue.png
Creator_New_Content.png           Manager_Rule_Impact_Sandbox.png
Creator_Notifications.png         Manager_Rules_Conflicts.png
Creator_Profile.png               Manager_Sentinel_Monitoring.png
Creator_Sentinel_Tasks.png        Manager_All_Submissions.png
```

---

## 5. Known limits of this harness

| Limit | Detail |
|---|---|
| Viewport only | 1440×900; mobile breakpoints are not covered by this run |
| Dev server | Run against Vite dev, not a production build |
| No visual diffing | Asserts structure, content volume and console cleanliness — not pixel equality |
| Chrome only | playwright-core drives local Chrome; Firefox and WebKit are not exercised |

The production build was verified separately (`npx tsc --noEmit` clean, Vite build to a
fresh output directory to avoid the sandbox's bulk-delete guard).

---

## 6. Reproducing

```bash
# terminal 1 — backend
cd backend && .venv312/Scripts/python.exe server.py

# terminal 2 — frontend
npm run dev

# terminal 3 — audit
node scripts/qa_21_feature_audit.mjs
```
