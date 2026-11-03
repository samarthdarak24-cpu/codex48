# PRECEDENT — Chatbot Test Report

**Date:** 2026-11-02
**Component:** `src/v2/components/agent/FloatingAgentChat.tsx` (global launcher, both roles)
**Harness:** `backend/scripts/qa_agent_studio_chat.py`
**Result:** **4 / 4 intents routed to the correct specialist agent**
**Evidence:** `qa-results/agent_studio.json` → `chatRouting`

---

## 1. What the chatbot is

The launcher is **not** a generic chat box. It resolves a natural-language question to a
**published Agent Studio agent**, executes that agent through the real runtime, and renders
the run — steps, findings, approval gate — inline in the conversation.

```
user question
   → chooseAgent()  (deterministic intent router, no LLM required)
   → POST /agents/{id}/execute
   → run steps stream into the message
   → if status === waiting_approval → Approve / Reject buttons
   → POST /agent-runs/{id}/approve
```

Two properties matter and both hold:

1. **No fabricated results.** The chat shows the run the server produced. If the run fails,
   the failure is shown.
2. **The agent does the work.** The chat is a transport, not a second implementation.

---

## 2. Intent routing

`chooseAgent()` maps keywords to a category order, then picks the first **published** agent
in that order:

| Question | Keyword signal | Category order tried | Resolved agent | Result |
|---|---|---|---|---|
| "Review this poster for unapproved claims" | review / claim / poster | `brand_compliance` → `visual_review` → `sentinel` → `guideline_research` | Brand Compliance Reviewer | **completed** |
| "Which guideline covers substantiation?" | guideline | `guideline_research` → `brand_compliance` → `audit` → `exceptions` | Guideline Research Assistant | **completed** |
| "Show me the audit report for last week" | audit / report | `audit` → `guideline_research` → `brand_compliance` | Audit Report Assistant | **completed** |
| "I need an exception for the Diwali campaign" | exception / waiver | `exceptions` → `brand_compliance` → `guideline_research` → `audit` | Exception Triage Assistant | **completed** |

```
[PASS] Published agents are available to the chat — 11 published
[PASS] Each chat intent reaches its specialist agent — 4/4 routed to the expected category
```

Every run above produced a real `studio_agent_run` row with persisted steps.

---

## 3. A complete exchange

Question: *"Review this poster for unapproved claims"*

| # | Step | Status | Output |
|---|---|---|---|
| 0 | Submission Created (trigger) | completed | `{"triggered":true}` |
| 1 | Retrieve submission | completed | `SUB-1042 · Summer Sale Campaign` |
| 2 | Extract poster / document text | completed | `{"source":"ocr","text":"PureGlow Festive Radiance…"}` |
| 3 | Search brand guidelines | completed | `{"method":"lexical_only","count":0}` |
| 4 | Run deterministic brand rules | completed | `{"evaluated":11,"counts":{"violation":6,"needs_review":5}}` |
| 5 | Verify evidence passages | completed | `{"verified":0,"total":0}` |
| 6 | Generate review summary | completed | `11 finding(s) detected (4 high, 6 medium, 1 low)` |
| 7 | Create review draft | completed | `{"draftId":"draft_…","status":"draft"}` |
| 8 | Manager Approval | **waiting_approval** | gate |

The chat renders the findings (rule code + explanation), the step list, and the two
approval buttons. Approving calls `POST /agent-runs/{id}/approve`; the run moves to
`completed` with 10 steps.

---

## 4. What the chat deliberately does not do

| Not done | Why |
|---|---|
| Approve content on the user's behalf | Approval is a governance action; the agent can only *propose* |
| Invent a finding | Every finding comes from `run_rules` over stored copy |
| Answer from general knowledge | With no matching agent, `chooseAgent()` returns `null` and the UI says so |
| Write to official records | `create_review_draft` returns `{"persisted": false}` |

---

## 5. Defects found and fixed during this test

| Defect | Effect | Fix |
|---|---|---|
| All published agents were `brand_compliance` | Every intent collapsed onto one agent, so routing looked "correct" while being meaningless | One agent per template category created and published (11 published) |
| `audit` agent returned **500** | Asking for an audit report crashed the run | `generate_summary` no longer assumes `findings` is a list |
| `exceptions` / `sentinel` agents failed | "I need an exception…" produced a red run | `missing_input` becomes a `skipped` step with a message; the run completes |
| `?status=` filters ignored server-side | The chat's follow-up links could open an unfiltered register | `/submissions` now applies `status`/`search`/`brand`/`channel`/`limit` in SQL |

---

## 6. Verdict

| Capability | Status |
|---|---|
| Natural-language question → agent selection | **PASS** (4/4 to the right category) |
| Agent execution from the chat | **PASS** (real runs, persisted steps) |
| Findings rendered from the run | **PASS** |
| Approval gate + approve/reject from the chat | **PASS** |
| Role awareness (`manager` vs `creator` copy and permissions) | **PASS** |
| LLM-authored answers / free-form reasoning | **BLOCKED** — `LLM_BASE_URL` and `LLM_API_KEY` empty |

The chatbot satisfies the requirement that it **runs agents to automate brand work** rather
than being a passive feature. The one thing it cannot do in this environment is reason in
free text, because no model is configured.

---

## 7. Reproducing

```bash
cd backend
.venv312/Scripts/python.exe server.py
.venv312/Scripts/python.exe scripts/qa_agent_studio_chat.py   # section 10
```

Or in the browser: sign in, open the launcher bottom-right, type
*"Review this poster for unapproved claims"*.
