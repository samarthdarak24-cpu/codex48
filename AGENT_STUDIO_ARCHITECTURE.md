# Agent Studio — Architecture

**Product:** Precedent — AI-Assisted Brand Governance & Content Approval Platform
**Feature:** Agent Studio — build, configure, test and publish bounded AI agents from natural language
**Status of this document:** describes the code as built and verified in this repository.

---

## 1. Design thesis

Precedent's existing contract is *deterministic rules decide, AI suggests, humans approve*.
Agent Studio extends that contract rather than bypassing it:

- An agent is **configuration**, never generated source code.
- The LLM (when configured) may only choose from a **fixed tool allow-list**.
- The runtime is a **bounded, acyclic executor** owned by Precedent.
- Any protected write action **pauses for a human Brand Manager**.
- Agents cannot approve, reject, publish content, activate rules, grant exceptions or edit audit rows.

A user writes a sentence such as:

> "Create an agent that reviews marketing submissions against our brand guidelines and identifies unsupported claims with exact evidence."

and receives a validated agent specification, a workflow graph, a visual builder, a real test playground, execution history and a publish gate.

---

## 2. Stack and deliberate framework choice

| Layer | Technology | Notes |
|---|---|---|
| API | FastAPI 0.111, Python 3.12 | Existing application, extended with `app/routers/agents.py` |
| Validation | Pydantic 2.7 | `app/agents/schemas.py` is the only agent contract |
| Persistence | SQLAlchemy 2.0 + Alembic | Nine new `studio_*` tables |
| LLM client | Existing OpenAI-compatible `app/ai.py` | `llm_complete()`; no new provider SDK |
| Frontend | React 18, TypeScript, Vite, Tailwind | Existing app |
| Workflow canvas | `@xyflow/react` 12.12.0 | Added dependency; the canvas is an editor, not an executor |

### Why not PydanticAI or LangGraph?

The prompt allowed either, but required choosing based on the existing implementation and not installing both for appearance. The existing backend already has:

- Pydantic v2 schemas for every domain object.
- A DB-backed job/scheduler subsystem.
- A bounded multi-agent Review Crew with its own `agent_runs` tables.
- A deterministic rule engine that must remain the sole authority on compliance outcomes.

Adding LangGraph would duplicate the durable-workflow role already played by the `jobs` table and would introduce a second execution model next to the Review Crew. PydanticAI would add an agent loop whose tool selection is model-driven — the opposite of the allow-listed, deterministic graph this feature needs.

**Decision:** a purpose-built bounded executor (`app/agents/runtime.py`) over a validated graph, using the existing Pydantic schemas and SQLAlchemy session. This is smaller, auditable, and keeps the human-approval boundary explicit. No PydanticAI or LangGraph dependency was added.

---

## 3. Directory map (actual files)

```text
backend/app/
  agents/
    __init__.py          # package exports
    base.py              # ToolContext, ToolSpec, ToolError
    models.py            # 9 SQLAlchemy models (studio_* namespace)
    schemas.py           # AgentSpec, WorkflowGraph, API request shapes
    registry.py          # the 17-tool allow-list
    tools.py             # the only executable tool implementations
    generator.py         # prompt -> validated AgentSpec (LLM + deterministic fallback)
    graph.py             # node vocabulary, topological order, graph validation, graph builder
    validator.py         # spec + publish-gate validation
    runtime.py           # bounded executor, approvals, cancellation, memory
    templates.py         # six backend-backed templates
    permissions.py       # role/workspace authorisation
  routers/
    agents.py            # HTTP API; mounted twice (root aliases + /api/v1)
  alembic/versions/
    20261102_1400_e1f2a3b4c5d6_agent_studio.py

src/
  lib/agentTypes.ts                 # frontend contract
  services/api.ts                   # `agentApi` client added
  pages/agents/
    shared.tsx                      # icons, status pills, panels, formatting
    AgentStudioPage.tsx             # dashboard, gallery, prompt generator, templates
    AgentDetailPage.tsx             # overview, test playground, runs, versions, memory
    AgentBuilderPage.tsx            # full-screen React Flow builder
    AgentRunsPage.tsx               # execution history + detail modal
    CreatorAssistantsPage.tsx       # creator-facing published assistants
    RunTimeline.tsx                 # shared execution timeline + JSON inspector
```

---

## 4. Data model

Nine tables, all workspace-scoped. They are deliberately **separate** from the Review Crew's `agent_runs` / `agent_tool_calls`, which are tied to a submission version and have different semantics.

| Table | Purpose | Key columns |
|---|---|---|
| `studio_agents` | Agent identity and lifecycle | `workspace`, `owner_id`, `status`, `current_version_number`, `published_version_id` |
| `studio_agent_versions` | Immutable specification snapshots | `agent_id`, `version_number`, `spec` (JSON), `validation` (JSON), `status` |
| `studio_agent_workflows` | Saved graph for a version | `agent_version_id` (unique), `graph` (JSON) |
| `studio_agent_tool_permissions` | Resolved allow-list | `agent_version_id`, `tool_id`, `permission_class`, `approval_required` |
| `studio_agent_runs` | One bounded execution | `status`, `input`, `output`, `duration_ms`, `tool_call_count` |
| `studio_agent_run_steps` | Per-node timeline | `node_id`, `node_type`, `status`, `tool_id`, `input`, `output`, `error` |
| `studio_agent_approvals` | Human checkpoints | `run_id`, `step_id`, `action`, `status`, `decided_by` |
| `studio_agent_memory` | Opt-in memory | `agent_id`, `user_id`, `session_id`, `key`, `value` |
| `studio_agent_triggers` | Persisted trigger config | `agent_id`, `trigger_type`, `config`, `enabled` |

### Versioning semantics

- A new agent starts at version 1.
- Editing a **draft** mutates that draft version in place.
- Editing a **published** agent creates a **new draft version** and leaves `published_version_id` pointing at the immutable published version. The UI shows "Unpublished changes".
- Publishing switches `published_version_id` only after the publish gate passes.

This satisfies "changing a published agent must create a new draft, not silently change an active version".

---

## 5. End-to-end request lifecycle

```mermaid
flowchart TD
    A[Manager types a prompt] --> B[POST /agents/draft-from-prompt]
    B --> C{LLM configured?}
    C -- yes --> D[llm_complete with allow-list + JSON schema]
    C -- no --> E[Deterministic keyword router]
    D --> F[Parse + normalise JSON]
    E --> G[Template spec]
    F --> H[Pydantic AgentSpec validation]
    G --> H
    H --> I[Filter tools against registry]
    I --> J[Validate workflow graph]
    J --> K[Save draft agent + version + workflow + tool permissions]
    K --> L[Visual builder / test playground]
    L --> M[POST /agents/{id}/test]
    M --> N[Bounded runtime]
    N --> O{Protected write or approval node?}
    O -- yes --> P[Run pauses, approval row created]
    P --> Q[Manager approves/rejects]
    Q --> N
    O -- no --> R[Run completes, steps persisted]
    R --> S[POST /agents/{id}/publish]
    S --> T{Publish gate passes?}
    T -- yes --> U[Version published; creators can execute]
    T -- no --> V[422 with exact errors]
```

### Generator behaviour

1. If `LLM_API_KEY` and `LLM_BASE_URL` are set, `llm_complete()` is called with the tool catalogue and the exact JSON contract.
2. The response is stripped of code fences, parsed, normalised from camelCase, filtered against `TOOL_IDS`, and validated with `AgentSpec`.
3. Any unknown tool is dropped and reported in `generation.droppedTools`.
4. If the LLM is unavailable, returns invalid JSON, or fails validation, a deterministic keyword router selects one of the six templates. The response says `generatedBy: "fallback"` — it never claims an LLM ran.

### Validation layers

- **Schema:** Pydantic field types, lengths, memory scope, execution limits.
- **Tool allow-list:** every tool id must exist in `app/agents/registry.py`.
- **Graph:** exactly one trigger, acyclic, edges reference existing nodes, tool nodes reference enabled tools, max 40 nodes / 80 edges, reachability warnings.
- **Publish gate:** stricter than draft save; no errors and at least one tool and trigger.

---

## 6. API surface

Mounted at both root aliases and `/api/v1`:

| Method | Path | Role |
|---|---|---|
| GET | `/agent-tools` | Any authenticated user |
| GET | `/agents/templates` | Any authenticated user |
| GET | `/agents/stats` | Any authenticated user (workspace-scoped) |
| POST | `/agents/draft-from-prompt` | Manager |
| POST | `/agents/from-template/{id}` | Manager |
| GET | `/agents` | Manager sees all; Creator sees published only |
| POST | `/agents` | Manager |
| GET | `/agents/{id}` | Manager; Creator only if published |
| PATCH | `/agents/{id}` | Manager |
| DELETE | `/agents/{id}` | Manager (delete draft without runs; otherwise archive) |
| PUT | `/agents/{id}/workflow` | Manager |
| POST | `/agents/{id}/validate` | Manager |
| POST | `/agents/{id}/publish` | Manager |
| POST | `/agents/{id}/pause` | Manager |
| POST | `/agents/{id}/resume` | Manager |
| POST | `/agents/{id}/test` | Manager |
| POST | `/agents/{id}/execute` | Manager or Creator (published only) |
| GET | `/agents/{id}/runs` | Manager; Creator sees own runs |
| GET | `/agents/{id}/memory` | Authenticated, scoped to caller |
| DELETE | `/agents/{id}/memory` | Authenticated, scoped to caller |
| GET | `/agent-runs` | Manager; Creator sees own |
| GET | `/agent-runs/{id}` | Owner or Manager |
| POST | `/agent-runs/{id}/cancel` | Owner or Manager |
| POST | `/agent-runs/{id}/approve` | Manager |

---

## 7. Frontend routes and navigation

### Manager

- `/manager/agent-studio` — dashboard, gallery, prompt generator, templates
- `/manager/agents` — same gallery view
- `/manager/agents/:agentId` — overview, test playground, executions, versions, memory
- `/manager/agents/:agentId/builder` — full-screen React Flow builder
- `/manager/agents/:agentId/runs` — filtered executions
- `/manager/agent-executions` — all executions

Sidebar adds **Agent Studio**, **My Agents**, **Agent Executions**.

### Creator

- `/creator/ai-assistants` — published assistants only
- `/creator/ai-assistants/:agentId` — run a published assistant

Sidebar adds **My AI Assistants**. Creators have no publish, edit or approval controls.

---

## 8. Reuse of existing Precedent services

The tool layer reads the same models and services the rest of the product uses:

| Tool | Backing implementation |
|---|---|
| `get_submission` | `Submission`, `SubmissionVersion`, `Finding` |
| `extract_document_text` | `AssetAnalysis.ocr_text` or latest `SubmissionVersion.copy` |
| `search_guidelines` | `app.services.semantic.search_passages_hybrid` + `GuidelinePassage` / `GuidelineDoc` |
| `run_brand_rules` | Stored `Finding` rows (deterministic outcomes) |
| `retrieve_evidence` | `GuidelinePassage` + exact substring verification |
| `get_exception` / `check_effective_dates` | `ExceptionRequest`, `Rule` |
| `get_affected_submissions` | `Finding` joined to `Submission` |
| `get_audit_events` | `AuditEvent` |
| `get_review_statistics` | `Submission`, `ReviewDecision`, `Finding` |
| `get_exception_statistics` | `ExceptionRequest` |
| `get_visual_analysis` | `AssetAnalysis` |
| `generate_summary` | `app.ai.llm_complete` with deterministic fallback |
| `create_notification` | `Notification` (protected write) |

No governance logic was duplicated. The agent reads the outputs of the existing deterministic engine; it does not re-implement rule evaluation.

---

## 9. Known architectural limitations

These are documented truthfully in `AGENT_STUDIO_TEST_RESULTS.md`:

- **LLM generation path is BLOCKED in this environment** because `LLM_API_KEY` and `LLM_BASE_URL` in `backend/.env` are empty. The deterministic router is the active path.
- **Event triggers** (`guideline_updated`, `rule_changed`, `exception_expired`) are shown as unavailable in the palette. `manual_trigger`, `submission_created` and `scheduled_trigger` are selectable, but scheduled dispatch is not yet wired to the platform scheduler.
- **Per-tool pre-emptive timeout** is declared on each tool spec and the runtime enforces a whole-run timeout and `max_steps`; a single tool cannot be pre-empted mid-call.
- **Token/cost accounting** fields exist but remain empty because the existing LLM client does not return usage.
- **Memory** is stored, inspectable and clearable, but is not yet injected into future model prompts.
- **Rate limiting** for agent execution is not implemented beyond authentication and role checks.
