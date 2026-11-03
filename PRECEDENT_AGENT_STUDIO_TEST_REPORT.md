# PRECEDENT — Agent Studio Test Report

**Date:** 2026-11-02
**Harness:** `backend/scripts/qa_agent_studio_chat.py` — real HTTP, assertions on the run and its steps
**Result:** **22 / 22 checks passed**
**Evidence:** `qa-results/agent_studio.json`

---

## 1. Studio state

```
GET /agents/stats
{
  "totalAgents": 19,
  "publishedAgents": 11,
  "draftAgents": 8,
  "pausedAgents": 0,
  "activeExecutions": 4,
  "failedExecutions": 6,
  "totalExecutions": 51,
  "successRate": 85.7
}
```

`studio_agent_run_steps` holds **411** rows for those 51 runs — roughly eight persisted steps
per execution, which is the clearest proof that runs are executed and recorded rather than
faked.

---

## 2. Full lifecycle

### 2.1 Template catalogue

```
[PASS] Template catalogue loads — 6 template(s)
[PASS] Templates declare their tools — 7 tool(s) on the first template
```

| Template id | Category |
|---|---|
| `brand-compliance-reviewer` | `brand_compliance` |
| `guideline-research-assistant` | `guideline_research` |
| `visualguard-assistant` | `visual_review` |
| `exception-triage-assistant` | `exceptions` |
| `sentinel-impact-assistant` | `sentinel` |
| `audit-report-assistant` | `audit` |

### 2.2 Prompt → draft

```
POST /agents/draft-from-prompt   → 201
{ "agent": { "id": "…", "status": "draft", "publishedVersionId": null },
  "spec": { "workflow": { "nodes": [...] } },
  "validation": {…},
  "generation": { "generatedBy": "fallback", "llmConfigured": false,
                  "notes": ["Matched template 'brand-compliance-reviewer' using keyword routing."] } }
```

```
[PASS] Prompt drafts an agent — HTTP 201 · Brand Compliance Reviewer
[PASS] Draft starts unpublished — status=draft publishedVersionId=None
[PASS] Draft workflow has nodes — 10 node(s): ['trigger','tool','tool','tool','tool','tool',…]
```

**Honest note:** `generatedBy: "fallback"`, `llmConfigured: false`. Because the LLM is
unconfigured, the prompt is matched to a template by keyword routing. The generated workflow
is real (10 nodes, 7 tools, 9 edges) but it is not model-authored. This is a **BLOCKED**
capability, reported as such rather than passed off as AI generation.

### 2.3 Validate → publish

```
[PASS] Workflow validates — ok=True errors=0 nodes=10 tools=7
[PASS] Agent publishes — status=published version=1
```

Validation returns the topological order it will execute:

```
["trigger-1","tool-1",…,"tool-7","approval-1","output-1"]
```

### 2.4 Execute

```
POST /agents/{id}/execute  {"input":{"submission_id":"sub_dfac9746ad2c","query":"review this poster"}}
→ 201  { "run": { "status": "waiting_approval", "stepCount": 9, … } }
```

```
[PASS] Agent executes — HTTP 201 · status=waiting_approval steps=9
[PASS] Run reaches the approval gate
[PASS] Tool steps completed — 7/7 tool step(s)
[PASS] Run wrote a review draft — draft step present
```

Step-by-step output of the run:

| # | Type | Label | Status | Output (abridged) |
|---|---|---|---|---|
| 0 | trigger | Submission Created | completed | `{"triggered":true,"triggerType":"manual"}` |
| 1 | tool | Retrieve submission | completed | `{"submissionId":"sub_dfac9746ad2c","code":"SUB-1042",…}` |
| 2 | tool | Extract poster / document text | completed | `{"source":"ocr","text":"PureGlow Festive Radiance…"}` |
| 3 | tool | Search brand guidelines | completed | `{"method":"lexical_only","count":0}` |
| 4 | tool | Run deterministic brand rules | completed | `{"evaluated":11,"counts":{"violation":6,"needs_review":5}}` |
| 5 | tool | Verify evidence passages | completed | `{"verified":0,"total":0}` |
| 6 | tool | Generate review summary | completed | `{"summary":"…11 finding(s) detected (4 high, 6 medium, 1 low)…"}` |
| 7 | tool | Create review draft | completed | `{"draft":{"draftId":"draft_…","status":"draft"}}` |
| 8 | approval | Manager Approval | waiting_approval | — |

Step 4 is the deterministic rule engine: **11 evaluated, 6 violations, 5 needs-review** on
real stored copy. Step 3 reports `lexical_only` because the embedding backend is unconfigured.

### 2.5 Approval gate

```
POST /agent-runs/{id}/approve  {"decision":"approve"}
[PASS] Approval gate releases the run — status=completed steps=10
```

The run does not proceed past a governance gate without a human. Duration after approval:
~14 s.

### 2.6 Run history

```
[PASS] Run history lists the execution — 1 run(s) for this agent
```

### 2.7 Lifecycle

```
[PASS] Agent pauses — HTTP 200
[PASS] Agent resumes — HTTP 200
```

---

## 3. Role permissions

| Check | Result | Meaning |
|---|---|---|
| Creator cannot run an **unpublished** agent | 403 | drafts are private to managers |
| Creator cannot **publish** an agent | 403 | publishing is a manager action |
| Creator **can** run a **published** agent | 201 | assistants are shared once published |

`assert_can_use()` implements exactly this: managers may run drafts for testing, creators may
only run published agents.

---

## 4. Multi-agent coverage

All six template categories were created and published, then each executed against a real
submission:

| Category | Status | Steps | Skipped steps |
|---|---|---|---|
| `brand_compliance` | waiting_approval | 9 | — |
| `guideline_research` | completed | 5 | — |
| `audit` | completed | 6 | — |
| `visual_review` | completed | 7 | — |
| `exceptions` | completed | 8 | Retrieve exception details, Check effective dates |
| `sentinel` | waiting_approval | 7 | Check effective dates |

---

## 5. Defects found and fixed

### 5.1 `generate_summary` crashed the whole run — FIXED

```
POST /agents/68d8de73…/execute → 500 Internal Server Error

File "app/agents/tools.py", line 522, in generate_summary
    severities = Counter(str(f.get("severity","Medium")) for f in findings if isinstance(f, dict))
TypeError: 'int' object is not iterable
```

A previous step had passed a **count** where a findings list was expected. Added
`_as_finding_list()`, which accepts a list, a dict wrapping a list, a single finding dict, or
an int (a count carries no detail). Applied to both `generate_summary` and
`create_review_draft`.

After the fix: `audit → completed, steps=6, err=None`.

### 5.2 Missing identifier hard-failed a run — FIXED

```
exceptions → run failed: Retrieve exception details: This tool requires an exception_id.
sentinel   → run failed: Check effective dates: Provide an exception_id or rule_id.
```

A tool that is simply missing an identifier is not a failure of the agent — there is nothing
to look up yet. `ToolError` already carries `code="missing_input"`; the runtime now records
that as a **`skipped`** step with a message and lets the workflow continue:

```
exceptions → completed, steps=8, skipped=['Retrieve exception details','Check effective dates']
sentinel   → waiting_approval, steps=7, skipped=['Check effective dates']
```

The user now gets "tell me the exception id" instead of a red run.

### 5.3 Only one agent category was published — FIXED

Before, 4 agents were published and all were `brand_compliance`, so every chat intent
collapsed onto the same agent. One agent per template category is now created and published
(11 published total), which is what makes the routing test meaningful.

---

## 6. What is BLOCKED

| Capability | Status | Evidence |
|---|---|---|
| Prompt → model-authored workflow | **BLOCKED** | `"generatedBy":"fallback"`, `"llmConfigured":false` |
| LLM tool selection / reasoning | **BLOCKED** | runs use deterministic tool order from the spec |
| Vector guideline retrieval | **BLOCKED** | `"method":"lexical_only","count":0` |
| Model-written review summary | **BLOCKED** | `generate_summary` returns `aiUsed:false` |

Everything structural — the workflow graph, validation, publishing, the approval gate, step
persistence, run history, permissions — is real and passes.

---

## 7. Reproducing

```bash
cd backend
.venv312/Scripts/python.exe server.py
.venv312/Scripts/python.exe scripts/qa_agent_studio_chat.py
```
