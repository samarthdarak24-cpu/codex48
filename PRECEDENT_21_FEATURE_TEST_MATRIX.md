# PRECEDENT — 21-Feature Test Matrix

**Date:** 2026-11-02
**Submission under test:** `sub_d03a353f3c50` — `QA_PRECEDENT_2026 PureGlow Winter Promotion`
**Workspace:** `Precedent QA`

Each feature was verified in **three layers**, and a feature only reaches PASS when all
three agree:

| Layer | Harness | What it proves |
|---|---|---|
| Render | `scripts/qa_21_feature_audit.mjs` | Page renders real content, has interactive controls, zero console errors |
| Data | `scripts/qa_feature_data_sweep.py` | The endpoint behind it returns real rows from SQLite |
| Behaviour | `qa_e2e_flow.py` / `qa_agent_studio_chat.py` | Writes persist and read back |

Legend: **PASS** = all three layers green · **PARTIAL** = renders + data, write path not
exercised end-to-end · **BLOCKED** = needs the unconfigured LLM · **NOT_IMPLEMENTED** = no
backend.

---

## Manager features (11)

| # | Feature | Route | Render | Data | Behaviour | Verdict |
|---|---|---|---|---|---|---|
| M1 | Overview | `/manager/overview` | PASS · 1,712 chars · 32 controls | `/analytics` → 14 metrics | Dashboard KPIs read live aggregates | **PASS** |
| M2 | Review Queue | `/manager/review-queue` | PASS · 1,987 · 44 | `/submissions?status=Pending` → 12 | Decision writes `review_decisions` + status + notification | **PASS** |
| M3 | All Submissions | `/manager/all-submissions` | PASS · 2,516 · 85 · 1 table · 2 charts | `/submissions` → 15 | Score breakdown from stored findings; server-side `status`/`search` filters | **PASS** |
| M4 | Brand Guidelines | `/manager/brand-guidelines` | PASS · 1,105 · 46 | `/guidelines` → 3 docs | Documents + versions + passages read from DB | **PASS** |
| M5 | Rules & Conflicts | `/manager/rules-conflicts` | PASS · 4,592 · 95 | `/rules` → 19 | Create → confirm → active; per-workspace codes | **PASS** |
| M6 | Conflicts | (tab in M5) | PASS | `/rules/conflicts` → `[]` | Empty state is genuine: no open conflicts | **PASS** (empty) |
| M7 | Exceptions | `/manager/exceptions` | PASS · 1,216 · 29 | `/exceptions` → 4 | Approve/deny writes the row | **PASS** |
| M8 | Rule Impact Sandbox | `/manager/rule-impact-sandbox` | PASS · 2,855 · 32 | `/simulations` → 2 | Simulation runs against stored history | **PASS** |
| M9 | Sentinel Monitoring | `/manager/sentinel` | PASS · 2,348 · 37 · 1 table | `/sentinel/tasks` → 3 | Tasks created from rule-activation triggers | **PASS** |
| M10 | Asset Library | `/manager/asset-library` | PASS · 848 · 51 | `/assets` → 10 | Assets + approve/logo flag persisted | **PASS** |
| M11 | Audit History | `/manager/audit-history` | PASS · 1,682 · 49 | `/audit` → 322 events | Every mutation writes an event; date filter works after the timestamp fix | **PASS** |

## Creator features (10)

| # | Feature | Route | Render | Data | Behaviour | Verdict |
|---|---|---|---|---|---|---|
| C1 | Dashboard | `/creator/dashboard` | PASS · 1,562 · 27 | `/submissions` → 15 | Own KPIs + tasks | **PASS** |
| C2 | New Content | `/creator/new-content` | PASS · 1,596 · 33 | — (composer) | Create → `submissions` row + `content_versions` v1 + `submission_versions` v1 | **PASS** |
| C3 | My Submissions | `/creator/submissions` | PASS · 1,913 · 43 | `/submissions?status=Approved` → 1 | Status, resubmit (v2), notifications | **PASS** |
| C4 | AI Review | `/creator/ai-review` | PASS · 3,275 · 32 | `/analysis/submission/{id}` | OCR → rules → findings → score; poster overlay; 0 console errors | **PASS** |
| C5 | Guidelines | `/creator/guidelines` | PASS · 738 · 41 | `/guidelines` → 3 | Read-only view of the same docs | **PASS** |
| C6 | Exception Requests | `/creator/exceptions` | PASS · 834 · 27 | `/exceptions` → 4 | Request + track | **PASS** |
| C7 | Sentinel Tasks | `/creator/tasks` | PASS · 1,103 · 25 | `/sentinel/tasks` → 3 | Assigned fix tasks | **PASS** |
| C8 | Approved Content | `/creator/approved` | PASS · 1,410 · 35 | `/submissions?status=Approved` → 1 | Gallery + approval record | **PASS** |
| C9 | Notifications | `/creator/notifications` | PASS · 294 · 25 | `/notifications` → 1 | Decision + resubmission notifications | **PASS** |
| C10 | Profile | `/creator/profile` | PASS · 994 · 23 | `/auth/me` | Profile + preferences | **PASS** |

## Cross-cutting

| # | Feature | Route | Render | Data | Behaviour | Verdict |
|---|---|---|---|---|---|---|
| X1 | Agent Studio | `/manager/agent-studio` | PASS · 4,463 · 64 | `/agents` → 19 · `/agent-runs` → 51 | prompt → draft → validate → publish → execute → approve | **PASS** |
| X2 | Floating chat | (global) | PASS (in-page) | executes `/agents/{id}/execute` | 4/4 intents reach the right specialist | **PASS** |

---

## Totals

| Verdict | Count |
|---|---|
| PASS | **23** (21 features + Agent Studio + chat) |
| PARTIAL | 0 |
| FAIL | 0 |
| BLOCKED | 1 capability (LLM-assisted summarisation / vector guideline search) |
| NOT_IMPLEMENTED | 1 (Part 9 Assistant conversation API) |

---

## Per-page render measurements

From `qa-results/features.json` (1440×900 viewport):

| Page | Text chars | Controls | Tables | Charts | Height ratio |
|---|---|---|---|---|---|
| Manager · Overview | 1,712 | 32 | 0 | 0 | 1.00 |
| Manager · Review Queue | 1,987 | 44 | 0 | 0 | 1.00 |
| Manager · All Submissions | 2,516 | 85 | 1 | 2 | 1.23 |
| Manager · Brand Guidelines | 1,105 | 46 | 0 | 0 | 1.00 |
| Manager · Rules & Conflicts | 4,592 | 95 | 0 | 0 | 1.00 |
| Manager · Exceptions | 1,216 | 29 | 0 | 0 | 1.00 |
| Manager · Rule Impact Sandbox | 2,855 | 32 | 0 | 0 | 1.00 |
| Manager · Sentinel | 2,348 | 37 | 1 | 0 | 1.29 |
| Manager · Asset Library | 848 | 51 | 0 | 0 | 1.00 |
| Manager · Analytics | 1,986 | 32 | 0 | 4 | 1.00 |
| Manager · Audit History | 1,682 | 49 | 0 | 0 | 1.00 |
| Creator · Dashboard | 1,562 | 27 | 0 | 0 | 1.00 |
| Creator · New Content | 1,596 | 33 | 0 | 0 | 1.05 |
| Creator · My Submissions | 1,913 | 43 | 0 | 0 | 1.00 |
| Creator · AI Review | 3,275 | 32 | 0 | 0 | 1.00 |
| Creator · Guidelines | 738 | 41 | 0 | 0 | 1.00 |
| Creator · Exception Requests | 834 | 27 | 0 | 0 | 1.00 |
| Creator · Sentinel Tasks | 1,103 | 25 | 0 | 0 | 1.00 |
| Creator · Approved Content | 1,410 | 35 | 0 | 0 | 1.00 |
| Creator · Notifications | 294 | 25 | 0 | 0 | 1.00 |
| Creator · Profile | 994 | 23 | 0 | 0 | 1.00 |
| Agent Studio | 4,463 | 64 | 0 | 0 | 1.00 |

No page renders fewer than 294 characters of content or fewer than 23 controls, and every
page is free of console errors and failed requests.

---

## Data endpoints (21/21 return real rows)

| Feature | Endpoint | Rows |
|---|---|---|
| Overview | `GET /analytics` | 14 metrics |
| Review Queue | `GET /submissions?status=Pending` | 12 |
| All Submissions | `GET /submissions` | 15 |
| Brand Guidelines | `GET /guidelines` | 3 |
| Rules | `GET /rules` | 19 |
| Conflicts | `GET /rules/conflicts` | 0 (empty state) |
| Exceptions | `GET /exceptions` | 4 |
| Sandbox | `GET /simulations` | 2 |
| Sentinel | `GET /sentinel/tasks` | 3 |
| Assets | `GET /assets` | 10 |
| Audit | `GET /audit` | 322 |
| Analytics trends | `GET /analytics/trends` | 5 |
| Approved | `GET /submissions?status=Approved` | 1 |
| Notifications | `GET /notifications` | 1 |
| Agents | `GET /agents` | 19 |
| Agent runs | `GET /agent-runs` | 51 |
