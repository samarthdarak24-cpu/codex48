# Agent Security Report

**Scope:** Agent Studio in Precedent — prompt-to-agent generation, visual workflow builder, tool execution, human approval, run history.
**Verification scripts:** `backend/scripts/agent_error_smoke.py`, `backend/scripts/agent_api_smoke.py`, `qa_agent_studio.mjs`, `qa_agent_test.mjs`.

---

## 1. Security model

Precedent handles brand approvals and company documents. Agent Studio therefore treats every agent as an **untrusted planner** and every tool as a **privileged capability**.

Core invariants:

1. The model produces **configuration**, never code.
2. Only registered tools execute; no `eval`, `exec`, subprocess, shell, SQL or arbitrary HTTP.
3. A tool node runs only if it is in the agent version's persisted permission list.
4. Protected write actions require a human Brand Manager.
5. Agents cannot make official governance decisions.
6. Every mutation writes an audit event.
7. Workspace isolation is enforced on every read and write.

---

## 2. Authentication and authorisation

| Control | Implementation | Status |
|---|---|---|
| Bearer JWT authentication | Existing `get_current_user` dependency | PASS |
| Manager-only creation/editing/publishing | `require_manager` + `assert_can_manage` | PASS |
| Creator read-only access to published agents | `assert_can_use`, list filter | PASS |
| Creator cannot publish | Server-side `require_manager`; verified 403 | PASS |
| Creator cannot approve | Server-side `require_manager`; verified 403 | PASS |
| Row-level workspace isolation | `assert_agent_visible` returns 404 for another workspace | PASS |
| Run access scoping | Manager sees workspace runs; Creator sees own runs | PASS |
| Creator cannot read draft agents | Detail endpoint returns 404 unless published | PASS |

Evidence from `agent_error_smoke.py`:

```text
PASS creator cannot approve — status 403
PASS cross-workspace agent hidden — status 404
PASS cross-workspace list empty — 0 rows
PASS agent persists across login
```

---

## 3. Tool allow-listing

The registry (`app/agents/registry.py`) is the only source of executable capabilities. Enforcement occurs at four points:

1. Generator filters unknown ids and reports `droppedTools`.
2. Validator rejects unknown tools.
3. Persistence writes `StudioAgentToolPermission` rows per version.
4. Runtime re-checks the permission row before invoking a tool.

Publishing an agent with `evil_tool` returns HTTP 422:

```text
PASS unknown-tool publish blocked — status 422
```

No tool exposes:

- arbitrary HTTP requests;
- filesystem access outside the validated uploads directory;
- shell/subprocess execution;
- dynamic SQL;
- model-generated source code.

---

## 4. Human approval boundary

### Forbidden autonomous actions

Agents cannot:

- approve or reject content;
- activate, deactivate or edit official rules;
- approve, grant or revoke exceptions;
- change official guideline documents;
- publish or unpublish content;
- alter audit records;
- override deterministic compliance outcomes.

### Enforcement

- `create_notification` is the only write tool and is `approval_required=True`.
- Approval nodes (`manager_approval`, `review_required`, `confirm_action`) always pause when the run is not already approved.
- The runtime pauses **before** a protected tool runs, creates a `StudioAgentApproval` row, and returns `waiting_approval`.
- Approval requires a Brand Manager (`require_manager`).
- Rejection cancels the run.

Verified in the UI and API:

```text
PASS run pauses for approval — waiting_approval
PASS waiting run can be cancelled
completed: true (after manager approval)
timeline steps: 10
```

---

## 5. Input validation and execution limits

| Control | Implementation | Status |
|---|---|---|
| Prompt length | Pydantic `min_length=8`, `max_length=4000` | PASS |
| Spec schema | Pydantic `AgentSpec`, typed fields, bounded limits | PASS |
| Graph size | 40 nodes / 80 edges | PASS |
| Acyclic graph | Kahn's algorithm; cycles rejected | PASS |
| Max steps | 1–30, checked at runtime | PASS |
| Run timeout | 5–600 s, checked between nodes | PASS |
| Tool input validation | Per-tool `input_schema` + runtime checks | PARTIAL — schemas are declarative and used for UI/catalogue; not every field is re-validated with a JSON-schema validator before execution |
| Per-tool pre-emptive timeout | Declared on `ToolSpec` | PARTIAL — whole-run timeout enforced; a single synchronous tool cannot be interrupted |
| Cancellation | Run/step/approval state transitions | PASS |

---

## 6. Prompt injection and untrusted data

The product must treat retrieved documents, uploaded content and tool outputs as **data**, not instructions.

Current posture:

- Agent Studio's runtime does **not** give the model a tool-selection loop. The graph decides which tools run. The model is used only for the optional summary, with a system prompt that says: summarise only supplied findings/evidence, never invent citations or numbers.
- The agent's system instructions explicitly forbid following instructions embedded in retrieved content.
- The summary tool receives structured findings/evidence, not raw retrieved text with instruction-like content.
- The generator prompt is separate from retrieved data.

Residual risk:

- There is no delimiter-wrapping of every retrieved passage in the Agent Studio summary path (the existing Review Crew has this). A malicious guideline passage could still influence a summary's wording.
- Status: **PARTIAL**. The deterministic rule engine remains the authority on compliance outcomes, so a manipulated summary cannot change a violation to a pass.

---

## 7. Secret handling and redaction

| Control | Implementation | Status |
|---|---|---|
| No secrets in agent JSON | Spec schema has no credential fields; generator forbids secrets | PASS |
| Step input redaction | `_redact()` masks keys containing password/secret/token/api_key/authorization/credential | PASS |
| Memory isolation | `StudioAgentMemory` keyed by workspace + agent + user + session | PASS |
| Memory clear | `DELETE /agents/{id}/memory` scoped to caller | PASS |
| LLM keys server-side only | Existing `settings.llm_api_key`; never sent to the browser | PASS |

The redaction is key-name based. A secret placed inside a free-text value would not be detected. Status: **PARTIAL** for content-level DLP.

---

## 8. Audit logging

The following actions call `services.audit.record()`:

- Agent created
- Agent updated (new version)
- Agent published
- Agent paused
- Agent execution completed
- Agent execution failed
- Agent approval granted
- Agent approval rejected
- Agent archived

Audit rows include workspace, actor, entity id, status and a short detail. Status: **PASS** for lifecycle events. Tool-level audit rows are represented by `StudioAgentRunStep`, not separate `AuditEvent` rows.

---

## 9. Rate limiting and cost control

| Control | Status | Detail |
|---|---|---|
| Per-user execution rate limit | NOT_IMPLEMENTED | No token bucket or quota on `/agents/{id}/test` or `/execute` |
| LLM daily call limit | PARTIAL | Existing `settings.llm_daily_call_limit` is enforced by the legacy AI paths, not by Agent Studio's summary call |
| Token budget per run | NOT_IMPLEMENTED | `token_usage` field exists but the LLM client does not return usage |
| Cost ceiling | NOT_IMPLEMENTED | No per-workspace spend cap |
| Max steps / timeout | PASS | Bounded execution |

This is the largest residual security/abuse gap. A manager can repeatedly test an agent; each test executes real reads. Reads are cheap, but a configured LLM summary could incur cost. Recommended next step: add a per-user execution quota and pass the existing daily LLM counter into `generate_summary`.

---

## 10. Findings summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Creator cannot create, publish or approve agents | High | PASS |
| 2 | Cross-workspace agent access is denied with 404 | High | PASS |
| 3 | Unknown tools cannot be published or executed | High | PASS |
| 4 | Protected write actions pause for human approval | High | PASS |
| 5 | Cycles and oversized graphs are rejected | Medium | PASS |
| 6 | Run cancellation and rejection terminate correctly | Medium | PASS |
| 7 | Audit events cover the agent lifecycle | Medium | PASS |
| 8 | Step inputs redact obvious secret keys | Medium | PASS |
| 9 | Prompt-injection delimiting in the summary path | Medium | PARTIAL |
| 10 | Per-tool pre-emptive timeout | Medium | PARTIAL |
| 11 | Execution rate limiting and cost ceilings | High | NOT_IMPLEMENTED |
| 12 | Token/cost accounting | Low | NOT_IMPLEMENTED |
| 13 | Content-level secret/DLP scanning | Low | PARTIAL |

---

## 11. Recommended next steps

1. Add a per-user/per-workspace execution quota and wire `llm_daily_call_limit` into `generate_summary`.
2. Wrap retrieved passages in explicit untrusted delimiters before any model call.
3. Add a per-tool timeout using a worker/thread boundary, and mark the step failed if it exceeds `ToolSpec.timeout_seconds`.
4. Persist token usage from the provider response and enforce a per-run token budget.
5. Add a dedicated `AuditEvent` row for each protected tool invocation.
