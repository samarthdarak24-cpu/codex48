# Agent Workflow Engine

**Graph schema and vocabulary:** `backend/app/agents/graph.py`
**Executor:** `backend/app/agents/runtime.py`
**Validation:** `backend/app/agents/graph.py`, `backend/app/agents/validator.py`

The workflow canvas is an editor. The **backend** owns validation, ordering, limits, approvals and execution. A graph that the frontend renders but the backend rejects can never run.

---

## 1. Graph contract

```json
{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "position": { "x": 0, "y": 0 },
      "data": { "label": "Submission Created", "subtype": "submission_created" }
    },
    {
      "id": "tool-1",
      "type": "tool",
      "position": { "x": 0, "y": 120 },
      "data": { "label": "Retrieve submission", "subtype": "tool", "toolId": "get_submission" }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "trigger-1", "target": "tool-1" }
  ]
}
```

- `type` is one of `trigger`, `ai`, `tool`, `logic`, `approval`, `output`.
- `data.subtype` identifies the specific node.
- Tool nodes must carry `data.toolId` from the registry.
- `data.config` holds static parameters merged into the tool input at runtime.

### Node vocabulary

**Triggers:** `manual_trigger`, `submission_created`, `scheduled_trigger` (available); `guideline_updated`, `rule_changed`, `exception_expired` (declared but unavailable).

**AI:** `ai_agent`, `text_analysis`, `document_analysis`, `evidence_verification`, `summarisation`, `classification`.

**Tool:** `tool` (with `toolId`).

**Logic:** `if_else`, `condition`, `filter`, `compare_values`, `merge_results`.

**Approval:** `manager_approval`, `review_required`, `confirm_action`.

**Output:** `return_result`, `create_report`, `save_review_draft`, `create_notification`, `create_sentinel_task`.

---

## 2. Validation rules

`validate_graph()` returns `{errors, warnings, order}` and never raises for user input.

### Errors (block publish and execution)

- Empty graph.
- More than 40 nodes or 80 edges.
- Duplicate node ids.
- Missing trigger, or more than one trigger.
- Edge references a missing node.
- Self-loop.
- Tool node without `toolId`, or a tool id not enabled for the agent.
- Workflow uses a tool not declared in the agent's tool list.
- Cycle detected by Kahn's algorithm.
- Executable steps exceed `execution_limits.max_steps`.

### Warnings (allowed on a draft)

- No tool nodes.
- No output node.
- Unreachable nodes.
- Duplicate edges.
- Protected write tool without an explicit approval node (the runtime still pauses).

### Publish gate

`publish_gate()` requires zero errors, at least one tool and at least one trigger. A warning-only graph may be saved as a draft but is surfaced in the builder.

---

## 3. Execution model

```text
load workflow + tool permissions
        |
        v
topological_order(graph)  ── cycle? -> RunError
        |
        v
for each node in order:
    trigger  -> mark completed
    tool     -> permission check -> approval check -> execute -> persist step
    ai       -> deterministic analysis / summary
    logic    -> deterministic condition / filter / merge
    approval -> pause for human, or mark approved on resume
    output   -> assemble final result
        |
        v
completed / failed / waiting_approval / cancelled
```

### Statuses

**Run:** `queued`, `running`, `waiting_approval`, `completed`, `failed`, `cancelled`.

**Step:** `pending`, `running`, `completed`, `failed`, `skipped`, `waiting_approval`.

Every node writes a `StudioAgentRunStep` with its input, output, error, start/finish time and duration. The execution timeline in the UI is this data, not an animation.

### Hard limits

- `execution_limits.max_steps` (1–30): checked before each executable node.
- `execution_limits.timeout_seconds` (5–600): checked before each node; exceeding it fails the run.
- Graph size: 40 nodes / 80 edges.
- Tool list: only allow-listed ids.

### Cancellation

`POST /agent-runs/{id}/cancel` sets the run to `cancelled`, marks pending/running/waiting steps as `skipped`, and expires pending approvals. The executor also checks `run.status == "cancelled"` between nodes.

---

## 4. Data flow between nodes

The runtime merges:

1. the run input (`submission_id`, `query`, `text`, …);
2. the node's static `data.config`;
3. values inferred from earlier node outputs.

Inference rules:

- `search_guidelines` without a query uses the text extracted by an earlier `extract_document_text` or `get_visual_analysis` node.
- `retrieve_evidence` without `passage_ids` collects them from an earlier `search_guidelines` output.
- `generate_summary` and `create_review_draft` collect `findings`, `evidence` and `summary` from prior outputs.
- Output nodes collect findings/evidence/summary from the whole prior context.

This makes the default linear workflow useful without hand-mapping every field, while advanced users can override any value in the node's JSON config.

---

## 5. Human approval

Two pause points:

1. **Approval node** (`manager_approval`, `review_required`, `confirm_action`) — always pauses when `approved=False`.
2. **Protected write tool** — pauses before the tool runs, regardless of whether an approval node exists.

On pause:

- the step becomes `waiting_approval`;
- a `StudioAgentApproval` row is created with `status="pending"`;
- the run becomes `waiting_approval`;
- the API returns the run with its timeline.

On approval:

- `POST /agent-runs/{id}/approve` with `decision="approve"` marks the approval `approved` and resumes the run with `approved=True`;
- completed steps are skipped, so read tools do not re-run;
- the previously waiting step executes;
- the run continues to completion.

On rejection:

- the approval becomes `rejected`;
- the run becomes `cancelled` with `error="Rejected by Brand Manager."`;
- the waiting step becomes `skipped`.

Evidence: `agent_api_smoke.py` and `qa_agent_test.mjs` both exercise pause → approve → completed.

---

## 6. Deterministic AI and logic nodes

Agent Studio does not hide a model call inside every AI node.

| Node | Behaviour |
|---|---|
| `summarisation` / `ai_agent` | Calls `generate_summary`. Uses the configured LLM when available; otherwise a deterministic summary derived from findings and evidence. |
| `classification` | Counts findings by severity. |
| `evidence_verification` | Counts verified vs total evidence. |
| `text_analysis` / `document_analysis` | Pass-through analysis node with a clear note; no hidden model call. |
| `if_else` | Evaluates `{field, operator, value}` against run input or prior outputs. |
| `filter` | Filters a list by a field value. |
| `merge_results` | Merges prior dictionaries. |
| `compare_values` | Compares two values. |

Output nodes:

- `save_review_draft` → calls `create_review_draft` (draft only, no official write).
- `create_report` → assembles a report object from prior statistics and summaries.
- `create_notification` → prepares a notification draft; the protected `create_notification` **tool** must run with approval to persist it.
- `create_sentinel_task` → returns a proposal; a human must create the task.
- `return_result` → returns the accumulated result.

---

## 7. Error handling

| Failure | Behaviour |
|---|---|
| Tool raises `ToolError` | Step `failed`, run `failed`, readable message in `run.error` |
| Invalid graph | `RunError` before execution; API 422 |
| Missing tool permission | `RunError`; API 422 |
| Timeout | `RunError("Execution exceeded the Ns timeout")`; run failed |
| Max steps | `RunError("Execution exceeded the max_steps limit")`; run failed |
| Cancelled | Run `cancelled`; remaining steps `skipped` |
| Approval rejected | Run `cancelled`; approval `rejected` |
| Unexpected exception | Caught by the runtime's `RunError` path only for handled errors; unexpected exceptions are not swallowed silently in development. |

Every failure writes an audit event (`Agent Execution Failed`).

---

## 8. Frontend builder

`src/pages/agents/AgentBuilderPage.tsx` uses `@xyflow/react`:

- Left panel: node library grouped by trigger, AI, tools, logic, approval, output.
- Centre: canvas with grid background, minimap, zoom controls, drag-and-drop, connect, delete, select.
- Right panel: node inspector (label, subtype/tool, description, JSON config) and a **Run** tab showing the execution timeline.
- Top toolbar: back, agent name/status, validation indicator, undo/redo, save, test, publish.

Connection validation mirrors the backend:

- no self-loops;
- no edges into a trigger;
- no edges out of an output;
- no duplicate edges;
- a DFS cycle guard.

Save sends the graph to `PUT /agents/{id}/workflow`; the response's validation is rendered immediately. The canvas is never the source of truth for execution.

---

## 9. Known engine limitations

| Item | Status | Detail |
|---|---|---|
| Per-tool pre-emptive timeout | PARTIAL | `ToolSpec.timeout_seconds` is declared and exposed; the runtime enforces a whole-run timeout and `max_steps`, but cannot interrupt a single synchronous tool mid-call |
| Durable queue / worker execution | NOT_IMPLEMENTED | Runs execute synchronously in the request; the existing `jobs` table is not used for agent runs |
| Scheduled dispatch | PARTIAL | `scheduled_trigger` configuration is persisted; the platform scheduler does not yet invoke agents |
| Event triggers | NOT_IMPLEMENTED | Guideline/rule/exception events are not wired to agent dispatch |
| Automatic retry | PARTIAL | Only the test playground offers a safe "re-run test"; failed runs are not retried automatically |
| Branching semantics | PARTIAL | `if_else` computes a boolean and records it, but the executor follows a single topological order rather than taking only one branch |
| Token/cost accounting | NOT_IMPLEMENTED | `token_usage` exists but remains empty because the LLM client does not return usage |
