# Agent Studio — Test Results

**Environment:** Windows, Python 3.12.10, FastAPI 0.111, SQLAlchemy 2.0.30, Pydantic 2.7.1, Node 22, TypeScript 5.9.3, Vite 5.4.21, `@xyflow/react` 12.12.0.
**Database:** seeded SQLite `backend/precedent.db` (workspace `PureGlow`, plus `WellnessLife` for isolation tests).
**Date:** 2 November 2026.

Status vocabulary: **PASS** (tested successfully), **FAIL** (tested and failed), **PARTIAL** (some functionality works), **BLOCKED** (missing configuration/dependency), **NOT_IMPLEMENTED** (no functional implementation).

---

## 1. Summary

| Test | Area | Status |
|---|---|---|
| A | Create agent from prompt | **PASS** (deterministic path); LLM path **BLOCKED** |
| B | Visual workflow builder + persistence | **PASS** |
| C | Execute agent against real data | **PASS** |
| D | Human approval (approve, reject, cancel) | **PASS** |
| E | Permissions and workspace isolation | **PASS** |
| F | Persistence across reload/login | **PASS** |
| G | Error handling | **PASS** for tested cases; **PARTIAL** per-tool timeout; **BLOCKED** LLM timeout |
| — | Browser UI (8 checks) | **PASS** 8/8 |
| — | Test playground + approval UI | **PASS** |
| — | TypeScript typecheck | **PASS** (0 errors) |
| — | Production bundle | **PASS** |

**Totals:** backend smoke PASS; HTTP API smoke PASS; error/permission suite 13/13 PASS; browser suite 8/8 PASS.

---

## 2. Test A — Create agent from prompt

### A1. Deterministic generation path — PASS

Command:

```bash
cd backend && .venv/Scripts/python.exe scripts/agent_studio_smoke.py
```

Observed:

```text
templates=6
name='Brand Compliance Reviewer' generatedBy=fallback
tools=['get_submission','extract_document_text','search_guidelines',
       'run_brand_rules','retrieve_evidence','generate_summary','create_review_draft']
nodes=10 edges=9
validation ok=true errors=[]
publish_ok=True
```

HTTP path (`agent_api_smoke.py`):

```text
POST /agents/draft-from-prompt -> 201
agent Brand Compliance Reviewer | status draft | validation True | generatedBy fallback
POST /agents/{id}/validate -> ok True
```

What this proves:

- The prompt is accepted and converted into a typed `AgentSpec`.
- Tools are selected from the allow-list only.
- The generated graph is acyclic, has one trigger, and validates.
- The agent is persisted as a draft before the preview is shown.

### A2. Configured-LLM path — BLOCKED

Probe:

```text
base_url=  (empty)
key_set= False
available= False
llm_complete() -> None
```

`backend/.env` contains `LLM_BASE_URL=` and `LLM_API_KEY=` with empty values. The generator therefore reports `generatedBy: "fallback"` and `llmConfigured: false`. The LLM code path exists in `generator.py` but could not be exercised without credentials. This is reported honestly rather than simulated.

### A3. Template library — PASS

`GET /agents/templates` returns 6 templates:

1. Brand Compliance Reviewer
2. Guideline Research Assistant
3. VisualGuard Assistant
4. Exception Triage Assistant
5. Sentinel Impact Assistant
6. Audit Report Assistant

Each template resolves to a real `AgentSpec` with registry tools and a deterministic graph.

---

## 3. Test B — Workflow builder and persistence

### B1. Canvas and inspector — PASS (browser)

`qa_agent_studio.mjs`:

```text
PASS  Workflow builder opens with canvas nodes — 10 nodes, 9 edges
PASS  Node inspector responds to selection — inspector visible
```

Screenshot: `.shots/agent-studio/04-builder.png`.

### B2. Add, connect, save, reopen, delete — PASS (API persistence)

Executed against the draft **Guideline Research Assistant**:

```text
draft agent: Guideline Research Assistant | nodes 5 edges 4
add save: 200 validation True
reopened contains node: True | contains edge: True
delete save: 200 | node gone: True
restore: 200 validation True
```

This verifies:

- a new logic node can be added and connected;
- `PUT /agents/{id}/workflow` persists the graph;
- a fresh `GET /agents/{id}` returns the added node and edge;
- deleting the node and its edges persists;
- the original graph can be restored and still validates.

### B3. Connection validation — PASS (backend)

The validator rejects:

- self-loops;
- edges into a trigger;
- edges out of an output;
- duplicate edges;
- cycles (Kahn's algorithm);
- tool nodes with unknown or unenabled tools.

The frontend mirrors these checks in `isValidConnection`.

### B4. Stale-tree bug found and fixed — PASS after fix

During browser testing, navigating from the gallery to the detail page left the tab state inert. Diagnosis: `V2Layout` wrapped `<Outlet />` in `AnimatePresence mode="wait"`, producing a detached tree whose handlers were stale. Removing the `AnimatePresence` wrapper (keeping the keyed enter animation) fixed it.

Before:

```text
tab before= overview after= overview
test input: 0
```

After:

```text
tab before= overview after= test
test input: 1
```

Re-verified by 8/8 browser checks and the full test-playground flow.

---

## 4. Test C — Execute agent against real data

`agent_api_smoke.py`, creator executing the published agent with `submission_id=sub_e90498782d31`:

```text
execute as creator -> 201
run waiting_approval | steps 9
approve -> 200 | completed
run detail -> steps 10 | approvals 1
```

`agent_studio_smoke.py` against `sub_dfac9746ad2c`:

```text
[completed] Submission Created (trigger/submission_created)
[completed] Retrieve submission (tool/get_submission)
[completed] Extract poster / document text (tool/extract_document_text)
[completed] Search brand guidelines (tool/search_guidelines)
[completed] Run deterministic brand rules (tool/run_brand_rules)
[completed] Verify evidence passages (tool/retrieve_evidence)
[completed] Generate review summary (tool/generate_summary)
[completed] Create review draft (tool/create_review_draft)
[waiting_approval] Manager Approval
[completed] Save Review Draft
```

The final output contains real rule codes, source document names, page numbers and stored findings. For example, the test playground screenshot shows `ruleCode: "WC-02"`, `sourceDocName: "Claims & Compliance Playbook v1.3"`, `sourcePage: 22`.

Reporting fix verified after approval resume:

```text
completed | tools 7 | steps 10 | duration_ms 1304 | trigger test
```

Before the fix, a resumed run reported `tools 0` because only the resume pass was counted. The runtime now derives the count from completed tool steps and the duration from the original `started_at`.

---

## 5. Test D — Human approval

### D1. Pause — PASS

```text
run pauses for approval — waiting_approval
```

The run pauses before the `manager_approval` node and before any protected write tool. A `StudioAgentApproval` row is created with `status="pending"`.

### D2. Approve and resume — PASS

```text
approve -> 200
after approval completed
```

Completed steps are skipped; the waiting step executes; the run finishes with 10 steps.

### D3. Reject — PASS

```text
reject response: 200 | run: cancelled | approved: False
```

The approval becomes `rejected`, the run becomes `cancelled`, and the waiting step is skipped.

### D4. Cancel — PASS

```text
waiting run can be cancelled
```

Cancellation marks pending/running/waiting steps as `skipped` and expires pending approvals.

### D5. UI approval — PASS

`qa_agent_test.mjs`:

```text
completed: true
timeline steps: 10
page errors: 0
```

Screenshots: `.shots/agent-studio/09-test-playground.png` (waiting for approval), `10-approval.png`, `11-test-complete.png` (completed with final JSON).

---

## 6. Test E — Permissions

`agent_error_smoke.py`:

```text
PASS invalid prompt rejected — status 422
PASS creator cannot approve — status 403
PASS cross-workspace agent hidden — status 404
PASS cross-workspace list empty — 0 rows
```

`agent_api_smoke.py`:

```text
creator sees 1 ['Brand Compliance Reviewer']
creator cannot create — 403
creator cannot publish — 403
```

Verified controls:

- Creator cannot create, update, publish, pause, delete or approve.
- Creator can see and execute only published agents.
- A user in `WellnessLife` receives 404 for a `PureGlow` agent and an empty list.
- Server-side checks are independent of the UI; the UI also hides the controls.

---

## 7. Test F — Persistence

```text
PASS agent persists across login
PASS run history persists — 8 runs
```

Additional checks:

- Workflow graph persists across save/reopen (Test B2).
- Agent versions persist; editing a published agent creates a new draft version.
- Run steps, approvals and outputs persist in `studio_agent_run_steps` and `studio_agent_approvals`.
- Browser reload and a new login session both return the same agent definition and history.

Database counts at the end of testing:

```text
studio_agents 2
studio_agent_versions 2
studio_agent_workflows 2
studio_agent_tool_permissions 10
studio_agent_runs 9
studio_agent_run_steps 70
studio_agent_approvals 7
studio_agent_memory 0
studio_agent_triggers 13
```

---

## 8. Test G — Errors

| Case | Status | Evidence |
|---|---|---|
| Invalid prompt (< 8 chars) | PASS | `POST /agents/draft-from-prompt` → 422 |
| Invalid generated configuration | PASS | Pydantic `AgentSpec` rejects; generator falls back |
| Missing API keys | PASS (degraded) | `ai_available() == False`; deterministic router used; response says `generatedBy: fallback` |
| Unknown tool | PASS | draft saved; publish → 422 `"Unknown or unavailable tool(s): evil_tool"` |
| Invalid workflow connections (cycle) | PASS | draft saved; publish → 422 `"Workflow contains a cycle"` |
| Tool failure (missing submission) | PASS | run `failed`, error `"Submission not found"`, no crash |
| Failed execution | PASS | status `failed`, audit event `Agent Execution Failed` |
| Cancelled execution | PASS | status `cancelled`, steps `skipped` |
| Creator attempts approval | PASS | 403 |
| Cross-workspace access | PASS | 404 |
| LLM timeout | BLOCKED | no LLM configured |
| Per-tool pre-emptive timeout | PARTIAL | `ToolSpec.timeout_seconds` declared; whole-run timeout and `max_steps` enforced; a single synchronous tool cannot be interrupted |
| Database error mid-run | NOT TESTED | would require injecting a DB failure; the runtime's `RunError` path is present |

---

## 9. Browser UI suite

`node qa_agent_studio.mjs`:

```text
PASS  Agent Studio dashboard renders — 2 agent card(s)
PASS  Prompt generator opens and generates — preview shown with tools
PASS  Workflow builder opens with canvas nodes — 10 nodes, 9 edges
PASS  Node inspector responds to selection — inspector visible
PASS  Agent detail page renders — detail loaded
PASS  Executions page renders — 4 run row(s)
PASS  Creator sees My AI Assistants — published assistant visible
PASS  No console errors during manager flow — clean console

8/8 checks passed
```

`node qa_agent_test.mjs sub_dfac9746ad2c`:

```text
completed: true
timeline steps: 10
page errors: 0
```

Screenshots:

| File | Contents |
|---|---|
| `.shots/agent-studio/01-dashboard.png` | Dashboard, five metric cards, gallery, filters |
| `.shots/agent-studio/02-prompt.png` | Prompt editor with examples |
| `.shots/agent-studio/03-generated.png` | Generated agent preview with tools, schemas, workflow |
| `.shots/agent-studio/04-builder.png` | React Flow builder with library, canvas, inspector |
| `.shots/agent-studio/05-inspector.png` | Node configuration panel |
| `.shots/agent-studio/06-detail.png` | Agent detail overview |
| `.shots/agent-studio/07-executions.png` | Execution history table |
| `.shots/agent-studio/08-creator-assistants.png` | Creator published assistants |
| `.shots/agent-studio/09-test-playground.png` | Test run waiting for approval |
| `.shots/agent-studio/10-approval.png` | Approval action |
| `.shots/agent-studio/11-test-complete.png` | Completed run with final JSON |

---

## 10. Build and typecheck

### TypeScript

```text
npx tsc --noEmit
EXIT=0
```

Zero errors. The earlier failures were caused by an incomplete dependency manifest; `npm install` reconciled the packages the existing code already imported (`@radix-ui/*`, `recharts`, `class-variance-authority`) and added `@xyflow/react`.

### Production bundle

```text
vite v5.4.21 building for production...
✓ 2226 modules transformed.
dist/index.html                     1.45 kB │ gzip:   0.72 kB
dist/assets/index-BUepUhyA.css    179.98 kB │ gzip:  28.94 kB
dist/assets/index-Bp_FlFKw.js   1,235.67 kB │ gzip: 326.14 kB
✓ built in 20.52s
```

The only warning is the standard chunk-size advisory (> 500 kB). It does not affect correctness. Code-splitting the builder route would be a sensible follow-up.

---

## 11. Honest limitations

1. **LLM prompt generation is BLOCKED** in this environment because the LLM key/base URL are empty. The deterministic router is the active path and is clearly labelled in the UI.
2. **Event triggers** (`guideline_updated`, `rule_changed`, `exception_expired`) are declared but marked unavailable; they are not dispatched by the backend.
3. **Scheduled triggers** persist configuration but are not yet invoked by the platform scheduler.
4. **Per-tool timeout** is declared but not pre-emptive; only the whole-run timeout and max steps are enforced.
5. **Token usage and cost ceilings** are not implemented; the fields remain empty rather than fabricated.
6. **Memory** is stored, inspected and cleared, but is not injected into future model prompts.
7. **Execution rate limiting** is not implemented.
8. **Automatic retry** is limited to a safe "re-run test" action; failed governance runs are not retried automatically.
9. **Branching** in `if_else` computes a condition but the executor follows one topological order rather than pruning branches.
10. **Database-failure injection** was not tested.

---

## 12. Re-verification — 2 November 2026, 18:26 IST

The full suite was re-run against the current source tree (backend restarted on `127.0.0.1:8000`, Vite on `127.0.0.1:5173`).

| Suite | Command | Result |
|---|---|---|
| Runtime smoke | `backend/.venv/Scripts/python.exe scripts/agent_studio_smoke.py` | **PASS** — 10 steps, pause at Manager Approval, resume → completed |
| HTTP API | `scripts/agent_api_smoke.py` | **PASS** — draft 201, creator execute 201, approve 200, run detail 10 steps / 1 approval |
| Errors & permissions | `scripts/agent_error_smoke.py` | **PASS** — 13/13 (422 invalid prompt, 403 creator, 404 cross-workspace, cycle/unknown-tool gates, persistence) |
| Browser UI | `node qa_agent_studio.mjs` | **PASS** — 8/8, clean console |
| Test playground E2E | `node qa_agent_test.mjs sub_dfac9746ad2c` | **PASS** — completed, 10 timeline steps, 0 page errors |
| TypeScript | `npx tsc --noEmit` | **PASS** — 0 errors |
| Production bundle | `npx vite build` (fresh outDir) | **PASS** — 2990 modules |

Screenshots were regenerated at `.shots/agent-studio/01-dashboard.png` … `11-test-complete.png`. No regressions were introduced by the visual detail-panel work on the 21 core screens; the Agent Studio routes are independent of `src/v2/`.

---

## 13. Chat integration — real execution from the copilot (2 Nov 2026, 18:36 IST)

`node .tmp_verify_chat.mjs` drives the floating copilot as a signed-in manager:

```text
open copilot → click "Review latest submission"
after run:   { hasSteps: true, awaiting: true, completed: false }
after approve: { completed: true, awaiting: false }
history:     { hasAgentRuns: true }
console errors: 0
```

What this proves:

- The chat called `POST /agents/{id}/execute` and received a real `AgentRun` (9 steps, paused at `manager_approval`).
- The inline **Approve & resume** action called `POST /agent-runs/{id}/approve`; the run resumed and completed (10 steps).
- The completed bubble rendered **real findings** — e.g. `Claims & Compliance Playbook v1.3 · Page 22 · verified`, `TV-02`, `BR-01`, `LO-02` — read from `run.output.draft.findings`.
- **Run history** listed stored runs (Completed / Cancelled / Failed) with step counts and durations from `GET /agent-runs`.
- TypeScript `tsc --noEmit` → 0 errors; `vite build` → exit 0.

Screenshots: `.tmp_shots2/chat-run.png`, `chat-approved.png`, `chat-history.png`.

**Known data artifact (not a chat defect):** the 21-page sweep flagged `/creator/ai-review` for a single console 404 at `GET /analysis/sub_e90498782d31/file`. That submission has a stored analysis row but no poster file on disk (created by earlier smoke runs). The page handles it gracefully (empty poster state); the network 404 is logged by the browser regardless. All other 22 checks pass.
