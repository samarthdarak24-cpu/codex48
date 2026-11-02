# Agent Studio — Implementation Report

**Feature:** prompt-to-agent generation, visual workflow builder, test playground, publishing, execution history and creator-facing assistants inside the existing Precedent application.
**Build status:** implemented and verified end-to-end against the seeded database.

---

## 1. What was added

### Backend — new package `backend/app/agents/`

| File | Responsibility |
|---|---|
| `__init__.py` | Exports the nine models |
| `base.py` | `ToolContext`, `ToolSpec`, `ToolError` |
| `models.py` | Nine SQLAlchemy models in the `studio_*` namespace |
| `schemas.py` | `AgentSpec`, `WorkflowGraph`, node/edge schemas, API request models |
| `registry.py` | The 17-tool allow-list |
| `tools.py` | The only executable tool implementations |
| `graph.py` | Node vocabulary, topological sort, graph validation, deterministic graph builder |
| `generator.py` | Prompt → validated spec, LLM path + deterministic fallback |
| `validator.py` | Spec validation and publish gate |
| `runtime.py` | Bounded executor, approval pause/resume, cancellation, memory |
| `templates.py` | Six backend-backed templates |
| `permissions.py` | Role and workspace authorisation |

### Backend — router

| File | Responsibility |
|---|---|
| `app/routers/agents.py` | 24 endpoints mounted at root aliases and `/api/v1` |

### Database

| File | Responsibility |
|---|---|
| `alembic/versions/20261102_1400_e1f2a3b4c5d6_agent_studio.py` | Creates the nine `studio_*` tables, indexes and unique constraints; idempotent upgrade/downgrade |

`app/db.py::init_db()` also creates the tables automatically in development because `app.agents.models` is imported when the router is loaded.

### Frontend — new files

| File | Responsibility |
|---|---|
| `src/lib/agentTypes.ts` | Agent, version, graph, run, step, tool, template and stats types |
| `src/pages/agents/shared.tsx` | Agent glyph, status pills, panels, empty/error/loading states, formatting |
| `src/pages/agents/AgentStudioPage.tsx` | Dashboard, stats, gallery, filters, prompt generator, template library |
| `src/pages/agents/AgentDetailPage.tsx` | Overview, test playground, executions, versions, memory |
| `src/pages/agents/AgentBuilderPage.tsx` | Full-screen React Flow builder with node library, canvas, inspector, save/test/publish |
| `src/pages/agents/AgentRunsPage.tsx` | All executions, filters, run detail modal, safe test re-run |
| `src/pages/agents/CreatorAssistantsPage.tsx` | Creator-facing published assistants and run form |
| `src/pages/agents/RunTimeline.tsx` | Shared execution timeline, approvals, JSON inspector |

### Frontend — modified files

| File | Change |
|---|---|
| `src/services/api.ts` | Added `agentApi` with 20 methods; imports the new types |
| `src/App.tsx` | Added manager and creator Agent Studio routes; builder is a top-level full-screen route |
| `src/v2/types/index.ts` | Added `agent-studio`, `my-agents`, `agent-executions`, `my-assistants` page ids |
| `src/v2/context/AppContext.tsx` | Added page↔path mappings and prefix matching for detail/builder routes |
| `src/v2/components/layout/Sidebar.tsx` | Added Agent Studio, My Agents, Agent Executions (manager) and My AI Assistants (creator) |
| `src/v2/V2Layout.tsx` | Removed the `AnimatePresence` wrapper around `<Outlet />` (see §5) |
| `src/index.css` | Added the warm-ivory React Flow theme |
| `package.json` / `package-lock.json` | Added `@xyflow/react@^12.12.0`. Running `npm install` also reconciled dependencies that the existing code already imported but the manifest omitted (`@radix-ui/*`, `recharts`, `class-variance-authority`), which is why `tsc --noEmit` now exits 0. |

### Verification scripts

| File | Purpose |
|---|---|
| `backend/scripts/agent_studio_smoke.py` | Generator → validator → persistence → execute → approve |
| `backend/scripts/agent_api_smoke.py` | HTTP flow including creator permissions and approval |
| `backend/scripts/agent_error_smoke.py` | 13 error and permission checks |
| `qa_agent_studio.mjs` | 8 browser checks across manager and creator |
| `qa_agent_test.mjs` | Browser test playground + approval flow |

---

## 2. How to run

### Backend

```bash
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The API is at `http://127.0.0.1:8000`. When `dist/` exists, the same process serves the built SPA at `/`.

### Frontend (development)

```bash
npm run dev
```

The Vite dev server runs on `http://127.0.0.1:5173`; `src/services/api.ts` defaults to `http://127.0.0.1:8000` (`VITE_API_BASE` overrides it).

### Build

```bash
npx vite build
```

The production bundle is written to `dist/` and served by FastAPI.

### Migrations

```bash
cd backend
.venv/Scripts/alembic upgrade head
```

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Brand Manager | `david.kim@pureglow.co` | `precedent` |
| Creator | `emily.carter@pureglow.co` | `precedent` |
| Other workspace (isolation test) | `sarah.chen@wellnesslife.co` | `precedent` |

### Demo state

After verification and cleanup:

- 2 agents: **Brand Compliance Reviewer** (published) and **Guideline Research Assistant** (draft).
- 9 execution records, 70 run steps, 7 approvals.
- 13 trigger rows (from the generated and template agents).

---

## 3. User journeys that now work

### Manager — create from prompt

1. Open **Agent Studio**.
2. Click **Create agent**.
3. Type a sentence or choose an example.
4. Click **Generate agent**.
5. Review the generated name, instructions, tools, input/output, memory, workflow and permissions.
6. Choose **Edit workflow**, **Save draft**, or **Publish agent**.

The draft is persisted before the preview is shown. Discarding deletes a never-run draft.

### Manager — edit the workflow

1. Click **Edit workflow** on an agent card.
2. Drag nodes from the library onto the canvas.
3. Connect nodes (cycles, self-loops, trigger targets and output sources are rejected).
4. Select a node and edit its label, subtype/tool, description and JSON config.
5. **Save** persists the graph and returns validation errors/warnings.
6. **Test** runs the saved graph against real data and colours each node with its step status.
7. **Publish** runs the publish gate and switches the published version.

### Manager — test and approve

1. Open an agent → **Test playground**.
2. Enter a real submission id (or a query, depending on the agent's input schema).
3. **Run test**.
4. Inspect the timeline: each node's status, tool id, input and output.
5. When the run pauses at **Manager Approval**, enter a note and **Approve & resume** or **Reject**.

### Manager — inspect executions

1. Open **Agent Executions**.
2. Filter by status or agent.
3. Open a run to see the full timeline, approvals and final output.
4. A test run can be safely re-run; governance runs are immutable.

### Creator — use a published assistant

1. Open **My AI Assistants**.
2. Choose a published assistant.
3. Enter a submission id or query and run it.
4. Inspect the result and timeline.

Creators see no publish, edit or approval controls, and the server enforces that independently.

---

## 4. Preservation of the existing product

- All 21 existing pages and their routes remain in place.
- No existing model, service or router was modified except:
  - `app/main.py` — imports and mounts the new router;
  - `app/permissions.py` — adds agent operation names to the RBAC map (no existing entry changed);
  - `app/db.py` — unchanged; new models register through the router import.
- `src/services/api.ts` — only additive changes.
- `src/App.tsx` — only additive routes.
- `src/v2/context/AppContext.tsx` — only additive mappings and a prefix match for the new detail routes.
- `src/v2/components/layout/Sidebar.tsx` — only additive navigation items.

The one behavioural change outside Agent Studio is in `src/v2/V2Layout.tsx`: the `AnimatePresence` wrapper around `<Outlet />` was removed. This was required because it left a stale React tree after client-side navigation, which made tabs and form state inert on the new Agent Detail page. The enter animation is preserved; only the exit animation was dropped. This change affects all pages positively (no stale handlers) and removes no feature.

---

## 5. The stale-tree bug and its fix

**Symptom:** after navigating from the Agent Studio gallery to `/manager/agents/:id` via a client-side link, the detail page rendered correctly but its tab buttons did nothing. Direct page loads worked.

**Diagnosis:** the tab button's `onClick` fired, but `setTab` did not update the visible tree. `data-agent-tab` stayed `overview`. The page was inside `V2Layout`'s `AnimatePresence mode="wait"` wrapper keyed by `location.pathname`; the exiting route's outlet produced a detached tree whose handlers were stale.

**Fix:** removed the `AnimatePresence` wrapper and kept a keyed `motion.div` enter animation. After the fix, `data-agent-tab` changes from `overview` to `test` and the test form renders. Re-verified with 8/8 browser checks and the full test-playground flow.

---

## 6. Deliberate deviations from the prompt

| Prompt suggestion | What was built | Reason |
|---|---|---|
| Use PydanticAI or LangGraph | Custom bounded executor using Pydantic + SQLAlchemy | The existing app already has Pydantic schemas, a jobs table and a Review Crew execution model. Adding either framework would duplicate the workflow/agent role and make the human-approval boundary less explicit. No framework was installed for appearance. |
| `backend/app/agent_tools/` and `agent_workflows/` packages | Consolidated into `app/agents/tools.py`, `graph.py`, `runtime.py` | Keeps one cohesive package and avoids circular imports; the responsibilities match the suggested split. |
| Six trigger types | Three available; three declared unavailable | Only triggers with real backend support are exposed in the builder. Scheduled dispatch is persisted but not wired to the scheduler. |
| Retry failed executions | Safe test re-run only | Automatic retry is only safe for idempotent read graphs; governance writes require a new approval. |
| Token usage | Field present, empty | The existing LLM client does not return usage. Reporting a fabricated number would violate the product's honesty rules. |

---

## 7. Verification commands

```bash
# Backend domain + runtime
cd backend && .venv/Scripts/python.exe scripts/agent_studio_smoke.py

# HTTP API + permissions
cd backend && .venv/Scripts/python.exe scripts/agent_api_smoke.py

# Errors and isolation
cd backend && .venv/Scripts/python.exe scripts/agent_error_smoke.py

# Browser flows
node qa_agent_studio.mjs
node qa_agent_test.mjs sub_dfac9746ad2c

# Frontend bundle
npx vite build
```

Results are recorded in `AGENT_STUDIO_TEST_RESULTS.md`.
