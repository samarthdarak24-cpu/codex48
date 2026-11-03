# GAP REPORT

**Project:** Precedent — AI-Assisted Brand Governance & Content Approval
**Spec:** `PRECEDENT_MASTER.md` (2 Nov 2026)
**Repo:** `C:\Users\darak\Downloads\last finale`
**Date:** 2 November 2026
**Commit:** working tree (uncommitted changes from the UI passes)

> Scope of this report: Phase 0 of Part 11 — the pre-flight audit required before feature code.
> Nothing below is inferred from screenshots alone; every row was checked against code, the live
> API, or `backend/precedent.db`.

---

## 1. Stack inventory

| Layer | Actual | Version |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | React 18.3 · Vite 5 · TS 5 |
| Styling | Tailwind CSS 3, custom warm token set (`brand/sage/olive/terracotta/warn/danger/cream/ink/line/canvas`) | 3.x |
| Table | TanStack Table wrapper (`src/v2/components/ui/DataTable.tsx`) | 8.x |
| Charts | Recharts (`src/v2/components/ui/charts.tsx`) | 2.x |
| Motion | `motion/react` with `useReducedMotion` | 11.x |
| Graph editor | `@xyflow/react` (Agent Studio builder, rule flow) | 12.x |
| Backend | FastAPI + SQLAlchemy 2.0 + Pydantic 2 + Alembic | FastAPI 0.115 |
| Database | **SQLite** (`backend/precedent.db`), 65 tables | dev-only |
| Auth | JWT access + refresh tokens, `require_manager` guard | — |
| Job queue | `jobs` table + in-process worker | — |
| LLM | Provider adapter exists; **`LLM_BASE_URL` / `LLM_API_KEY` empty → not configured** | — |
| OCR / embeddings | `asset_analysis` + `passage_embeddings` tables exist; no worker running | — |
| Tests | pytest (backend), `scripts/*.mjs` Playwright harnesses | — |

**Stack vs spec:** the spec assumes PostgreSQL + pgvector, Redis and a Celery/RQ worker. This repo is
SQLite + in-process jobs. Functionally fine for a single-node demo; **not** a drop-in for the
production topology in Part 3. Recorded as a documented deviation, not a defect.

---

## 2. Route inventory (frontend)

All routes are guarded by `RequireRole` in `src/App.tsx`; the guard is client-side and every API
call is additionally authorized server-side.

| Path | Component | Guard |
| --- | --- | --- |
| `/creator/dashboard` | `CreatorDashboardView` | creator |
| `/creator/new-content` | `NewContentView` | creator |
| `/creator/submissions` · `/my-submissions` | `MySubmissionsView` | creator |
| `/creator/ai-review` | `AIReviewView` | creator |
| `/creator/guidelines` | `CreatorGuidelinesView` | creator |
| `/creator/exceptions` · `/exception-requests` | `CreatorExceptionRequestsView` | creator |
| `/creator/tasks` · `/sentinel-tasks` | `CreatorSentinelTasksView` | creator |
| `/creator/notifications` | `NotificationsView` | creator |
| `/creator/approved` · `/approved-content` | `ApprovedContentView` | creator |
| `/creator/profile` | `MyProfileView` | creator |
| `/creator/ai-assistants` | `CreatorAssistantsPage` | creator |
| `/manager/overview` | `OverviewView` | manager |
| `/manager/review-queue` | `ReviewQueueView` | manager |
| `/manager/all-submissions` · `/submissions` | `AllSubmissionsView` | manager |
| `/manager/brand-guidelines` · `/guidelines` | `BrandGuidelinesView` | manager |
| `/manager/rules-conflicts` | `RulesConflictsView` | manager |
| `/manager/exceptions` | `ExceptionsView` | manager |
| `/manager/rule-impact-sandbox` | `RuleImpactSandboxView` | manager |
| `/manager/sentinel` | `SentinelMonitoringView` | manager |
| `/manager/asset-library` · `/assets` | `AssetLibraryView` | manager |
| `/manager/analytics` | `AnalyticsHealthView` | manager |
| `/manager/audit-history` · `/audit-events` | `AuditHistoryView` | manager |
| `/manager/notifications` | `NotificationsView` | manager |
| `/manager/agent-studio` · `/agents` | `AgentStudioPage` | manager |
| `/manager/agents/:agentId` | `AgentDetailPage` | manager |
| `/manager/agents/:agentId/builder` | `AgentBuilderPage` | manager |
| `/manager/agents/:agentId/runs` | `AgentRunsPage` | manager |

**21 screens present** (10 creator + 11 manager) plus Agent Studio screens. ✅

---

## 3. Endpoint inventory (backend)

21 routers. All routes require `get_current_user`; workspace scoping is applied in the service layer
via `require_workspace`.

| Router | Coverage | Notes |
| --- | --- | --- |
| `auth.py` | login, refresh, logout, `/auth/me` | JWT; no `switch-workspace`, no `logout-all`, no `change-password` |
| `submissions.py` | list, detail, create, update, submit, decisions, comments, export CSV, report | **no** `POST /submissions/{id}/analyze`, **no** bulk recheck, **no** withdraw |
| `analysis.py` | `POST /analysis/upload`, `GET /analysis/submission/{id}`, `GET /analysis/{id}/file`, `POST /analysis/{id}/rerun` | the real "brand check" entry point |
| `guidelines.py` | list, versions, passages, upload | no `suggest-rules` |
| `rules.py` | list, CRUD, conflicts, resolve | activation exists; no `retire` |
| `exceptions.py` | request, list, decide, revoke | — |
| `simulations.py` | create, list, items | — |
| `sentinel.py` | scan, alerts, tasks, resolve | — |
| `assets.py` | list, upload, status, download | — |
| `analytics.py` | overview, trends, violations, campaigns, export | — |
| `audit.py` | list, export | append-only |
| `agents.py` | full Agent Studio surface (draft-from-prompt, validate, publish, execute, runs, approve, memory) | `studio_agent_*` tables |
| `crew.py` | Review Crew run + trace | 5 fixed agents |
| `evidence.py` | retrieval + citation verification | — |
| `claims.py`, `snippets.py`, `feedback.py`, `team.py`, `proofpass.py`, `canonical_v1.py` | supporting | — |
| **`assistant.py`** | **MISSING** | Part 9 has no backend at all |
| **`nav.py` (`/nav/counts`)** | **MISSING** | badges are computed client-side instead |

---

## 4. Database inventory vs Part 4 target model

**65 tables exist.** Present and matching: `users`, `workspaces`, `workspace_members`, `campaigns`,
`submissions`, `submission_versions`, `content_versions`, `brand_assets`, `asset_analysis`,
`guideline_docs` / `guideline_versions` / `guideline_passages` / `passage_embeddings`, `rules` /
`rule_versions` / `rule_test_cases`, `rule_conflicts` / `rule_conflict_reviews`, `findings`,
`ai_findings`, `review_decisions`, `comments`, `exceptions` / `exceptions_active` /
`exception_ruling_history`, `publications`, `reassessment_tasks`, `notifications`, `audit_events`,
`simulations` / `simulation_items`, `ai_call_log`, `agent_runs` / `agent_tool_calls` / `agent_traces`,
`studio_agents` + 6 supporting studio tables.

| Target | Status | Detail |
| --- | --- | --- |
| `agents`, `agent_versions`, `agent_run_steps`, `agent_approvals` | **DIFFERENT** | implemented as `studio_agents`, `studio_agent_versions`, `studio_agent_run_steps`, `studio_agent_approvals`. Same semantics, different names. |
| `assistant_conversations`, `assistant_messages`, `assistant_citations`, `assistant_feedback`, `assistant_action_drafts` | **MISSING** | Part 9 not started |
| `brands` | **MISSING** | brand is a denormalised string on `submissions.brand`; `brand_kits` covers part of it |
| `approval_decisions` | **DIFFERENT** | `review_decisions` (+ `approval_passports` for the snapshot) |
| `submissions.compliance_score` | **MISSING** | score is not stored anywhere |
| `submission_versions.compliance_score`, `formula_version`, `computed_at` | **MISSING** | — |
| `submissions.current_version_id` | **UNPOPULATED** | 0 of 15 rows set, while `content_versions` holds 15 rows → versions are not linked to submissions |

### Data reality check (live DB)

```
submissions            15 rows   status: Pending 12 · Changes Requested 2 · Approved 1
campaigns               0 rows   ← empty
submissions.campaign_id 0 of 15  ← null everywhere
content_versions       15 rows
submission_versions     0 rows   ← empty
submissions.current_version_id 0 of 15
findings              123 rows   outcome: needs_review 91 · violation 32
                               severity: High 25 · Medium 95 · Low 3
review_decisions        4 rows
audit_events          226 rows
studio_agents           2 rows
```

**Consequence:** rule 4 ("every approval is for one immutable version") cannot hold today — there is
no version row to point at. This is the single most important structural gap after O2/O4.

---

## 5. Mock inventory

The v2 UI is clean. Every `mock|dummy|fake|hardcode` hit in `src/v2/**` is a comment *asserting the
absence* of mock data, not an implementation:

| file:line | Text | Classification |
| --- | --- | --- |
| `src/v2/context/AppContext.tsx:4` | "The 21 reference views were authored against a mock context… this module fills it from the real FastAPI service" | REAL (doc comment) |
| `OverviewView.tsx:5` | "no hardcoded trends, no decorative sparklines" | REAL (doc comment) |
| `RulesConflictsView.tsx:766` | "the real stored file, not a mock preview" | REAL (doc comment) |
| `src/lib/selectors.ts:4` | "Nothing in the UI hardcodes a count" | REAL (doc comment) |

`setTimeout` / `Math.random` hits are UI-only (toast auto-dismiss, marketing orb animation, copy
confirmation). None of them fake a data load or an AI result.

| Area | Status |
| --- | --- |
| Dashboard numbers | computed from the `submissions` array in `selectors.ts` / view memos — no literals |
| Sidebar badges | computed in `Sidebar.tsx` from `submissions`/`exceptions`/`sentinelAlerts`/`notifications` |
| Charts | every series derived from stored rows or `/analytics/*`; empty series render empty states |
| Floating chatbot | calls `agentApi.execute()` — a **real** run, but the wrong subsystem (see §7) |
| Seed data | `backend/seed.py` writes to the real DB; **no `is_demo` flag** on rows (spec rule 2) |

---

## 6. Verification of observations O1–O14

| # | Observation | Verdict | Evidence |
| --- | --- | --- | --- |
| O1 | Counts 15 / 1 / 12 / 2 / 0 | **CONFIRMED (arithmetic correct)** | `AllSubmissionsView` derives all four from the same `submissions` array; DB matches (Pending 12 + Changes Requested 2 + Approved 1 = 15). Not from an aggregate endpoint — see gap G3. |
| O2 | Campaign column shows channels, not campaign names | **CONFIRMED → FIXED (§12)** | Was `AppContext.tsx:522` → `campaign: s.channel \|\| s.brand`, with an empty `campaigns` table. Now returns the joined campaign name; 5 campaigns seeded and 15 submissions linked. |
| O3 | All rows from one creator | **CONFIRMED** | all 15 submissions have `creator_id` = Emily Carter. Multi-creator path untested by data, not by code. |
| O4 | Score ring shows stored score; scores look seeded | **CONFIRMED → FIXED (§12)** | Was computed in the browser and never stored. Now `services/scoring.py` computes it, the row persists it with `formula_version`, and the ring opens the breakdown. |
| O5 | New Content has both "Campaign name" and "Campaign" | **CONFIRMED** | `NewContentView` has a free-text label plus a campaign select. Spec default (Part 15): keep the select as `campaign_id`, rename free text to "Content label". |
| O6 | Brand-check panel shows "Not run in this session" | **CONFIRMED** | The panel has no wired trigger to `POST /analysis/upload`; it reflects form state only. |
| O7 | Pipeline 0/5 | **PARTIAL** | Pipeline exists and each step is derived from real form state (brand, file, title, draft, submit-ready) — but "Save draft" step keys off a validity boolean, not a persisted `draft_id`. |
| O8 | Guideline match from active versions | **PASS** | populated from `guideline_docs` + `guideline_versions` via context. |
| O9 | Floating chatbot must be the real assistant | **FAIL (wrong subsystem)** | `FloatingAgentChat.tsx` runs Agent Studio agents (`/agents/{id}/execute`). It is real, but Part 9's Assistant (retrieval + citations + draft tools) has **no backend**. |
| O10 | Top bar controls wired | **PARTIAL** | Bell + profile + help exist; global search is a static input (no `/search`). |
| O11 | Workspace switch | **PARTIAL** | The pill is a route switch between role homes, not a membership-backed `switch-workspace`; there is no server re-issue of the token. |
| O12 | Promo cards navigate | **PASS** | Manager → `/manager/analytics`; Creator → `/creator/new-content`. |
| O13 | Bell badge = unread count | **PASS** | computed from `notifications.filter(n => n.isUnread)`; matches DB. |
| O14 | Bulk select / columns / sorting really work | **PARTIAL** | Select, sort and pagination work client-side over the fetched page; "Columns" visibility exists; bulk actions and server-side sorting do not. |

---

## 7. Chatbot status

| Question | Answer |
| --- | --- |
| Launcher present on all screens? | Yes — `FloatingAgentChat`, bottom-right, both workspaces |
| Wired to an API? | Yes — `agentApi.execute()` / `agentApi.allRuns()` / `approveRun` |
| Is it the Part 9 Assistant? | **No.** No retrieval, no citation chips, no conversation persistence, no draft tools, no `/assistant/*` endpoints |
| LLM configured? | **No** — `LLM_BASE_URL` and `LLM_API_KEY` are empty; agent runs use the deterministic fallback path |
| Status dot meaningful? | Not yet — it is decorative, not bound to `/assistant/status` |

**Verdict: PARTIAL** — a working agent launcher standing in for a feature that does not exist yet.

## 8. Agent Studio status

**PARTIAL → PASS on the core contract.** Present and verified in earlier passes: draft-from-prompt,
spec validation, React Flow builder, test playground, publish/versioning, run traces, human approval
gates, tool allow-list, memory. Missing vs Part 8.5: `archive`, `GET /agents/{id}/versions` listing,
`/agent-runs/{id}/trace` as a distinct endpoint (trace is embedded in the run payload).

## 9. Review Crew status

**PARTIAL.** `crew.py` + `agent_traces` implement the five fixed agents and expose a trace. They are
read-only and separate from Agent Studio, as required. Gaps: no hard token/step budget enforcement
per agent, and the trace is surfaced on AI Review but not in the Review Queue detail pane.

## 10. Test results (executed this pass)

| Check | Command | Result |
| --- | --- | --- |
| Typecheck | `npx tsc --noEmit` | **exit 0** |
| Production build | `npx vite build --outDir <fresh>` | **exit 0**, 2990 modules |
| UI QA — All Submissions | `node scripts/qa_all_submissions_insights.mjs` | **18/18 PASS**, 0 console errors |
| UI QA — Creator + Brand | `node scripts/qa_creator_brand_fill.mjs` | **16/16 PASS**, 0 console errors |
| 22-page sweep | `.tmp_fill_audit.mjs` | 22 routes load; 1 console error = known `ai-review` poster 404 |
| Backend smoke | `agent_api_smoke.py`, `agent_error_smoke.py` | PASS |
| pytest suite | not run in this pass | **UNKNOWN** — needs `pytest` run with the venv |

> `npm run build` still trips the sandbox bulk-delete guard on `dist/images` (72 files > 50). Building
> to a fresh `outDir` succeeds. Environment guard, not a code defect.

---

## 11. Prioritised fix list

### P0 — wrong or missing data in the core flow

| ID | Gap | Fix |
| --- | --- | --- |
| **G1** | **O2** Campaign column renders `channel` | return real `campaign` name from a joined `campaigns` row; seed campaigns and link `campaign_id`; add a separate Channel column |
| **G2** | **O4** Score computed in the browser, never stored | move the formula into a backend service, persist `compliance_score` + `formula_version` + `computed_at`, return it from the API, show the breakdown on ring click |
| **G3** | No `/submissions/summary`; counts recomputed client-side from the full list | aggregate endpoint so counts survive pagination |
| **G4** | `submission_versions` empty, `current_version_id` null → rule 4 unenforceable | populate versions on submit; make approve require `version_id` == current (409 otherwise) |

### P1 — mock / stub removal

| ID | Gap | Fix |
| --- | --- | --- |
| **G5** | **O6/O7** brand check not wired to `POST /analysis/upload`; draft step not tied to a persisted draft | wire the button, show stage + real findings, key the pipeline off `draft_id` |
| **G6** | Global search is static | `GET /search?q=&scope=` + dropdown |
| **G7** | Bulk select has no actions | `POST /submissions/bulk/recheck`, export selected |
| **G8** | No `is_demo` flag on seeded rows | add column + set in `seed.py` |

### P2 — AI features

| ID | Gap | Fix |
| --- | --- | --- |
| **G9** | **Part 9 Assistant absent** (no tables, no endpoints, launcher runs agents) | conversation tables, retrieval + citation validator, SSE, drawer with citation chips; degrade to retrieval-only when LLM is unconfigured |
| **G10** | VisualGuard worker not running | OCR + palette + logo jobs writing `asset_analysis` |
| **G11** | Evidence Intelligence partially present (`evidence.py`) | wire citation validation into AI Review end-to-end |
| **G12** | LLM unconfigured | keep `provider=none` fallback explicit in the UI ("AI not configured") |

### P3 — polish / hardening

| ID | Gap |
| --- | --- |
| G13 | `switch-workspace` / `logout-all` / `change-password` endpoints |
| G14 | Review Crew budgets + trace in Review Queue |
| G15 | Agent Studio `archive`, versions listing |
| G16 | Rate limits on login / upload / AI endpoints |

---

## 12. What this pass implements

**G1 (O2) and G2 (O4) are now fixed end to end** — migration → service → API → UI → tests —
because they are the two observations the spec names explicitly and both were visible on the
flagship screen.

### G1 — Campaign column

| Change | File |
| --- | --- |
| `campaigns` seeded with 5 real initiatives (`is_demo = true`) and every submission linked | `backend/scripts/seed_campaigns.py` |
| Serializer returns `campaignId` + joined `campaign` name, never the channel | `backend/app/services/submissions.py` |
| `campaign: s.channel \|\| s.brand` replaced with the joined name; channel kept as its own field | `src/v2/context/AppContext.tsx` |
| Campaign cell shows the campaign with the channel as secondary text | `AllSubmissionsView.tsx` |

Verified live: `Summer Sale Campaign → "Summer 2026" · Social Media`, `New Product Launch →
"Product Launch — Glow Serum" · Website`, `Influencer Collaboration → "Influencer Programme" ·
Influencer`. No cell renders a bare channel any more.

### G2 — Compliance score

| Change | File |
| --- | --- |
| Single server formula, `FORMULA_VERSION = severity_weighted_v1`, returns a full breakdown | `backend/app/services/scoring.py` |
| `compliance_score`, `score_formula_version`, `score_computed_at`, `is_demo` columns | migration `f2a3b4c5d6e7` |
| Score persisted and recomputed only when missing or produced by an older formula | `submissions._score_for()` |
| API returns `complianceScore` + `scoreBreakdown` | `submission_to_dict` |
| Client formula **deleted** — the UI displays the stored number only | `AppContext.tsx` |
| Score ring is a keyboard-reachable control that opens the breakdown | `AllSubmissionsView.tsx` |

The formula (spec Part 4): `penalty = 5·high + 3·medium + 1·low + 0.5·unknown`,
`score = round(100 × (1 − penalty / (applicable × 5)))`, where `applicable` is the number of rules
in scope (18 active here), not the number of findings. That distinction matters: findings only
record problems, so a findings-only denominator scored **every** submission 0 on the first attempt.

Stored scores now: 57, 80, 73, 64, 78, 72 … (was a flat 0 with the naive denominator, and
client-computed before that).

### Also fixed while in there

| Finding | Fix |
| --- | --- |
| **Alembic upgrades never persisted.** `alembic upgrade head` printed "Running upgrade …", exited 0, and rolled every `ALTER` back, because pysqlite runs in legacy isolation mode where DDL is not auto-committed. `alembic_version` still read the old revision afterwards. | added `connection.commit()` after `run_migrations()` in `alembic/env.py` |
| Seeded rows carried no `is_demo` marker (spec rule 2) | `is_demo` on `submissions` + `campaigns`, set by the seed script |

### Verification (executed)

| Check | Result |
| --- | --- |
| `pytest tests/test_scoring.py` | **11/11 pass** |
| Full backend suite `pytest -q` | **158 passed**, 0 failed |
| `node scripts/qa_o2_o4.mjs` | **11/11 pass** |
| `node scripts/qa_all_submissions_insights.mjs` | **18/18 pass** |
| `node scripts/qa_creator_brand_fill.mjs` | **16/16 pass** |
| 22-page sweep | all load; 1 console error = known `ai-review` poster 404 |
| `npx tsc --noEmit` | exit 0 |
| `npx vite build` | exit 0 |

### Still open

G3–G16 above. The largest is **G9 (Part 9 Assistant)**: there is no assistant backend, no
conversation tables, and the floating launcher runs Agent Studio agents instead. That is a Phase 10
build, not a patch, and it is the next thing worth doing.
