# Agent Tool Registry

**Source of truth:** `backend/app/agents/registry.py`
**Executable implementations:** `backend/app/agents/tools.py`
**Contract:** `ToolSpec` in `backend/app/agents/base.py`

Every tool an agent can run is declared here. The LLM and the visual builder may only reference these ids. Anything else is rejected by the generator, the validator and the publish gate.

---

## 1. Registry contract

```python
@dataclass(frozen=True)
class ToolSpec:
    id: str
    name: str
    description: str
    category: str
    permission: str          # read | draft | write
    approval_required: bool
    timeout_seconds: int
    input_schema: dict
    output_schema: dict
    executor: Callable[[ToolContext], dict]
    idempotent: bool = True
```

`ToolContext` carries the database session, the authenticated user, the workspace, the merged input, the agent id and the run id. There is no ambient authority and no global state.

A tool failure raises `ToolError`. The runtime converts it into a failed step with a readable message; it never leaks a stack trace into the run output.

---

## 2. The 17 registered tools

| # | Tool ID | Name | Category | Permission | Approval | Backing data |
|---|---|---|---|---|---|---|
| 1 | `get_submission` | Retrieve submission | content | read | No | `Submission`, `SubmissionVersion`, `Finding` |
| 2 | `extract_document_text` | Extract poster / document text | content | read | No | `AssetAnalysis.ocr_text`, latest version copy |
| 3 | `search_guidelines` | Search brand guidelines | retrieval | read | No | `search_passages_hybrid`, `GuidelinePassage`, `GuidelineDoc` |
| 4 | `run_brand_rules` | Run deterministic brand rules | rules | read | No | Stored `Finding` outcomes |
| 5 | `retrieve_evidence` | Verify evidence passages | evidence | read | No | `GuidelinePassage` exact-substring verification |
| 6 | `get_exception` | Retrieve exception details | exceptions | read | No | `ExceptionRequest` |
| 7 | `search_rules` | Search brand rules | rules | read | No | `Rule` |
| 8 | `get_owner` | Get content owner | content | read | No | `Submission.creator_id`, `ExceptionRequest.requested_by_id` |
| 9 | `check_effective_dates` | Check effective dates | exceptions | read | No | `ExceptionRequest`, `Rule` |
| 10 | `get_affected_submissions` | Find affected submissions | sentinel | read | No | `Finding` → `Submission` |
| 11 | `get_audit_events` | Get audit history | audit | read | No | `AuditEvent` |
| 12 | `get_review_statistics` | Get review statistics | audit | read | No | `Submission`, `ReviewDecision`, `Finding` |
| 13 | `get_exception_statistics` | Get exception statistics | exceptions | read | No | `ExceptionRequest` |
| 14 | `get_visual_analysis` | Get visual analysis | analysis | read | No | `AssetAnalysis` |
| 15 | `generate_summary` | Generate review summary | ai | read | No | `llm_complete` + deterministic fallback |
| 16 | `create_review_draft` | Create review draft | output | draft | No | Returns a draft object; does not write official records |
| 17 | `create_notification` | Create notification | output | write | **Yes** | `Notification` |

### Permission semantics

- **read** — reads existing rows. Safe to repeat.
- **draft** — assembles a recommendation in the run output. Does not mutate governance records.
- **write** — creates a real row. `create_notification` is the only write tool and it is `approval_required=True` and `idempotent=False`.

---

## 3. Input and output schemas

The full JSON schemas are exposed at `GET /agent-tools`. Summary:

| Tool | Required input | Main output |
|---|---|---|
| `get_submission` | `submission_id` | title, status, copy, version, findings |
| `extract_document_text` | `submission_id` or `text` | text, source (`ocr` / `submission_copy` / `provided_text`), confidence |
| `search_guidelines` | `query` (optional `top_k` ≤ 10) | passages with `passageId`, `docName`, `page`, `section`, `score`, `text` |
| `run_brand_rules` | `submission_id` | counts + findings with deterministic `outcome` |
| `retrieve_evidence` | `passage_ids`, optional `quotes` | evidence with `verified` boolean |
| `get_exception` | `exception_id` | rule, scope, status, effective/expiry dates |
| `search_rules` | optional `query`, `include_inactive` | rule list |
| `get_owner` | `submission_id` or `exception_id` | owner identity |
| `check_effective_dates` | `exception_id` or `rule_id` | `effectiveState` (`active` / `expired` / `not_yet_effective` / `inactive`) |
| `get_affected_submissions` | optional `rule_code` | affected submissions |
| `get_audit_events` | optional `limit` ≤ 100 | audit events |
| `get_review_statistics` | none | status, decision and finding aggregates |
| `get_exception_statistics` | none | status counts, expiring within 30 days |
| `get_visual_analysis` | `submission_id` | OCR, colours, logos, layout, contrast |
| `generate_summary` | optional `text`, `findings`, `evidence` | summary, `aiUsed`, model |
| `create_review_draft` | optional `submission_id`, `summary`, `findings`, `evidence` | draft object, `persisted: false` |
| `create_notification` | `title` (optional `body`, `user_id`) | notification id, recipient |

---

## 4. Enforcement points

1. **Generator** — `_normalise_tools()` drops any id not in `TOOL_IDS` and reports it in `generation.droppedTools`.
2. **Validator** — `validate_spec()` rejects unknown tools and any graph tool node not in the agent's declared tool list.
3. **Persistence** — `StudioAgentToolPermission` rows are written from the validated list; the runtime loads them per version.
4. **Runtime** — before executing a tool node, the runtime checks:
   - the tool exists in the registry;
   - the tool is permitted for this agent version;
   - if `approval_required`, the run has human approval.
5. **Publish gate** — an agent with an unknown tool cannot be published (HTTP 422 with the exact tool id).

Verified evidence: `agent_error_smoke.py` creates an agent with `evil_tool`, saves the draft, and receives 422 on publish with `"Unknown or unavailable tool(s): evil_tool"`.

---

## 5. What is deliberately not exposed

The registry contains **no** tool that can:

- execute Python, JavaScript, shell commands or SQL;
- make an arbitrary HTTP request;
- read or write arbitrary filesystem paths;
- approve or reject content;
- activate, deactivate or edit a rule;
- grant, revoke or modify an exception;
- publish or unpublish content;
- edit or delete audit records;
- change an official guideline document.

There is no dynamic tool loading. `TOOLS` is a Python dict built at import time; the executor is a direct function reference.

---

## 6. Trigger vocabulary

| Subtype | Label | Available | Notes |
|---|---|---|---|
| `manual_trigger` | Manual Trigger | Yes | Run on demand from the builder or detail page |
| `submission_created` | Submission Created | Yes | Dispatched by executing the agent with `trigger_type=submission_created` |
| `scheduled_trigger` | Scheduled Trigger | Yes (config only) | Configuration is persisted; scheduler dispatch is not wired in this build |
| `guideline_updated` | Guideline Updated | No | Requires a guideline event bus |
| `rule_changed` | Rule Changed | No | Requires a rule event bus |
| `exception_expired` | Exception Expired | No | Requires the exception sweep hook |

The builder filters out unavailable triggers, so a user cannot drag a trigger that has no backend support.

---

## 7. Adding a tool safely

1. Implement a function in `app/agents/tools.py` with signature `(ctx: ToolContext) -> dict`.
2. Use only models and services already in the application. Do not add network or filesystem access.
3. Raise `ToolError` for expected failures.
4. Add a `ToolSpec` entry in `registry.py` with a precise `input_schema`, `permission` and `approval_required`.
5. If the tool writes, set `approval_required=True` and `idempotent=False` unless the write is provably idempotent.
6. Run `scripts/agent_studio_smoke.py` and `scripts/agent_error_smoke.py`.
7. Update this document.

No migration is needed: tool permissions are rows keyed by `tool_id`, and the registry is code.
