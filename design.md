# PRECEDENT — Complete Project Design (design.md)

**A Smarter Way to Manage Brand Rules and Approvals**  
**Product:** Precedent - AI-Assisted Brand Governance & Content Approval Platform  
**Team:** We Code Coders  
**Institution named in project reports:** Vishwakarma Institute of Pune  
**Document purpose:** Complete project explanation, product design, architecture, 21-page specification, AI/ML plan, repository structure, testing and implementation guide  
**Version:** 1.0  
**Prepared:** 1 November 2026

---

## Contents at a glance

1. Executive summary, problem, proposed solution and differentiators.
2. Document status: Round 2 reported baseline, declared limitations and Round 3 target scope.
3. Product definition, user journey, Creator and Brand Manager roles and permission matrix.
4. Post-login home pages for both dashboards.
5. System architecture and technology stack.
6. Shared database/domain model and deterministic rule engine.
7. All 21 feature tasks: 10 Creator features and 11 Brand Manager features.
8. VisualGuard, Evidence Intelligence, Sentinel and the five-agent Review Crew.
9. Backend-first implementation order, frontend wiring and API contracts.
10. Cryptographic provenance and the optional blockchain decision.
11. Security, privacy, testing, deployment, environment variables and folder structure.
12. Definition of Done, coding-agent execution prompt and final deliverables.
13. Official GitHub repositories, model references and licensing notes.

---

## Document status and how to read it

This handbook consolidates the Round 1 proposal, the Round 2 updated project report, and the detailed target `DESIGN.md` specification. It deliberately distinguishes **what the Round 2 report said was implemented** from **what the 21-page target product and Round 3 roadmap require**.

- **Round 2 reported baseline:** the updated report states that the core Creator-to-Manager workflow, deterministic rule engine, evidence-linked findings, version-specific approvals, scoped exceptions and expiry enforcement, conflict detection, Rule Impact Sandbox, audit history/export, asset library, RBAC, and responsive UI were implemented and tested. It reports 41 passing backend tests and a successful frontend production build. These are reported results from the submitted document; this handbook does not independently inspect or certify the current GitHub repository.
- **Round 2 declared limitations:** live LLM assistance was optional and not configured in the demo; pgvector/embedding retrieval was not implemented; full OCR and automatic visual understanding were not implemented; notifications and post-publication monitoring were not implemented. Those were not to be represented as completed at that time.
- **Round 3 committed improvements:** A1 VisualGuard (full visual/OCR compliance analysis), A2 Evidence Intelligence (evidence-grounded semantic AI review), and A3 Sentinel (post-publication monitoring and change-impact notifications).
- **21-page target UI:** 10 Creator pages and 11 Brand Manager pages are the product interface specification. A generated screen is not proof that its API, database operation, AI service or workflow is functional.
- **Optional stretch:** ProofPass, Red-Team Lab, extended agents, MCP and blockchain-related provenance are optional additions. They must not delay A1-A3, reliability, usability, testing, deployment and documentation.

Use the status labels in the implementation matrix: `PASS`, `FAIL`, `PARTIAL`, `BLOCKED`, and `NOT_IMPLEMENTED`. Only `PASS` requires executed test evidence. Do not assume a proposed architecture is already present in the repository.

# Executive summary

Precedent is a brand-governance platform for marketing teams, creative agencies and brand owners. It connects marketing content to structured brand rules, approved product claims, source evidence, human review decisions, time-bounded exceptions and a simulation of proposed policy changes. It is designed to help teams identify brand and claim issues **before publication**, preserve why a decision was made, and identify previously approved content that may be affected when policy or evidence changes.

The product is built around a human-controlled workflow. A Creator writes copy or uploads a poster. The server checks known facts against active, scoped, effective-dated rules. VisualGuard adds image-derived facts such as OCR text, logo match candidates, dominant colours and layout measurements. Evidence Intelligence retrieves relevant guideline passages and may ask a configured LLM to explain a possible semantic conflict or suggest a minimal edit. Every AI citation is validated against stored source text. The deterministic rule engine remains the official compliance decision source for explicit rules; missing or low-confidence facts produce `unknown` or `needs_human_review` rather than a false pass or false violation. A Brand Manager reviews a specific immutable version and chooses to approve, request changes or reject. A scoped exception can be granted only by an authorized human and only for its defined conditions, channels, campaigns and effective dates. Rule Impact Sandbox replays a proposed change without mutating live policy. After activation, Sentinel identifies affected approved/published versions and creates unique reassessment tasks. Audit history records important decisions and changes.

## 1. Problem being solved

Marketing content is produced by many people: internal content teams, designers, freelancers, agencies, product teams and reviewers. The same brand can have multiple guidelines, product facts, assets and approval paths. This creates practical problems:

1. **Inconsistent brand use:** an old logo, wrong colour, incorrect layout, missing disclaimer or outdated product image may be used.
2. **Unsupported claims:** advertising copy may promise outcomes or make health/product statements that are not supported by approved evidence.
3. **Fragmented guidance:** guideline PDFs, documents, email decisions, messages and folders make it difficult to know which rule or version is authoritative.
4. **Repeated review effort:** creators ask the same questions and managers repeatedly explain the same requirements.
5. **Unclear exceptions:** a manager may approve a one-time deviation in a meeting or chat, but the scope, reason, owner, conditions and expiry are not preserved in a reusable record.
6. **Version ambiguity:** reviewers may approve one version while a different version is later edited or published.
7. **Policy-change uncertainty:** when a rule or product claim changes, teams may not know which previously approved campaigns are now affected.
8. **Weak accountability:** without an audit trail, it is hard to establish who changed a rule, approved an asset, granted an exception or reviewed a version.

The problem is therefore broader than spell-checking or detecting a wrong colour. Teams need a dependable system that connects creative work to approved rules and evidence, explains findings, preserves human decisions and tracks downstream impact.

## 2. Proposed solution

Precedent provides two connected workspaces backed by one shared application, database and service layer:

- **Content Creator / Content Team workspace:** create content, upload creative assets, run checks, inspect evidence, revise versions, submit for approval, request exceptions and respond to Sentinel reassessment tasks.
- **Brand Manager workspace:** manage guidelines and structured rules, review submissions, approve exact versions, resolve conflicts, decide exception requests, simulate policy changes, monitor affected content, manage assets and inspect analytics/audit history.

The platform does not replace a brand manager with an autonomous model. It separates the responsibilities:

- Deterministic code decides explicit rule outcomes.
- OCR/computer vision extracts evidence and candidate facts from assets.
- Retrieval and LLMs provide advisory semantic findings and explanations.
- Citation validation rejects unsupported AI references.
- Human reviewers retain authority over content approvals, exceptions and policy activation.
- Sentinel creates reassessment work; it does not silently reject content.

## 3. Core example - why scoped exceptions matter

Assume a fictional brand normally permits only a green background. A Creator submits an orange festival poster. The rule engine identifies that the colour is outside the approved palette. The Creator requests a narrowly scoped exception. The Brand Manager may approve orange only for Campaign A, Instagram posters, from 1 to 10 November, with the official green logo retained. That decision is stored with its owner, reason, conditions, effective dates and expiry. A similar orange poster for Campaign B does not automatically inherit the exception. If a new rule later bans orange in all campaigns, the Rule Impact Sandbox shows which stored items and exceptions would be affected before the Manager activates the new rule. Sentinel then creates reassessment tasks for the affected published/approved versions.

## 4. What makes Precedent distinctive

The product's differentiation is the combination of:

- Evidence-linked findings rather than an unexplained score.
- Structured rules with scope, priority, source passage and effective dates.
- Exact-version human approvals.
- Explicit, reusable, scoped and expiring exception rulings.
- A pre-activation simulator that shows the effect of a proposed rule change.
- Post-publication reassessment through Sentinel.
- AI that must cite stored evidence and cannot grant policy authority.

These capabilities should be described as a coherent governance workflow, not as a claim that no other brand platform has similar individual capabilities.

## 5. Product principles

1. **Deterministic rules decide; AI suggests; humans approve.**
2. The manager's final decisions are explicit and auditable.
3. A finding links to a rule and, where applicable, an exact source passage and image region.
4. Unknown information stays unknown; it is not silently converted to pass/fail.
5. Approval is tied to an immutable content version and its rule/guideline snapshot.
6. A simulation never mutates live policy or submissions.
7. Exceptions are scoped, conditional, dated and revocable.
8. Sentinel creates tasks for reassessment; it does not rewrite past approvals.
9. Frontend metrics and charts are derived from stored backend data.
10. A visual page is not complete until its backend, persistence, permissions and tests work.

## 6. User roles at a glance

| Role | Primary goal | Allowed work | Restricted work |
|---|---|---|---|
| Content Creator | Produce compliant marketing content | Create/edit own drafts, upload assets, run checks, view findings, submit versions, request exceptions, view decisions, resolve assigned tasks | Cannot activate rules, approve content, approve own exception or alter role/permissions |
| Brand Manager | Govern the brand and make review decisions | Review authorized workspace content, manage guidelines/rules/assets, approve/reject/request changes, decide/revoke exceptions, simulate changes, monitor Sentinel, export authorized audit/analytics | Must follow workspace authorization and cannot silently edit historical audit/approval evidence |
| Optional Rule Owner | Maintain specialist policy/claims | Draft or review rules and evidence, validate test cases | Activation remains separately authorized |
| Optional Workspace Admin | Manage the workspace | Users, roles, settings, keys and policies | No automatic content approval unless explicitly granted |
| Optional Agency Viewer | See shared approved material | Read-only shared approved content/certificates | No edit, policy or approval rights |

## 7. High-level system flow

```text
Brand Manager uploads guideline and assets
        |
        v
Document extraction -> stored passages -> structured draft rules
        |                                  |
        |                                  v
        |                          Manager confirms/activates rules
        |
Creator creates copy + uploads poster
        |
        +--> VisualGuard: OCR + image facts + region boxes
        |
        +--> Deterministic rule engine: violation / compliant / unknown
        |
        +--> Evidence Intelligence: hybrid retrieval -> optional LLM -> citation validator
        |
        v
Creator reviews findings, edits and submits exact version
        |
        v
Manager Review Queue -> human approve / request changes / reject
        |
        +--> Persist exact decision + audit + notification
        |
        v
Approved / published content
        |
Rule / guideline / exception / claim changes
        |
        v
Rule Impact Sandbox (preview) -> Manager activates change
        |
        v
Sentinel impact finder -> idempotent reassessment tasks -> notifications
        |
        v
Creator resolves -> re-evaluation -> Manager verifies -> audit history
```

## 8. What the platform is not

- It is not a legal-compliance guarantee or legal advice service.
- It is not an autonomous AI approver.
- It does not guarantee perfect OCR, logo recognition, semantic retrieval or font identification.
- It does not require blockchain for its core workflow.
- It does not claim a publishing/CMS/social-platform integration unless that specific external integration is implemented and tested.
- It does not treat an LLM-generated confidence score as a deterministic compliance score.

## 9. Technology selection philosophy

Choose one compatible tool for each job, validate it on Precedent's real examples, check its licence and operational requirements, and avoid dependency duplication. The recommended architecture prefers React/TypeScript, FastAPI/Pydantic/SQLAlchemy/Alembic, PostgreSQL with optional pgvector, one primary OCR engine, OpenCV/Pillow, one embedding model, optional reranker, a configurable LLM, a bounded agent layer and Playwright E2E tests. Detailed choices, repository links, folder structure, 21 tasks and acceptance tests follow in the complete design specification below.

---

# Complete technical design specification

The following sections contain the complete 21-feature technical design: two post-login dashboards, frontend routes, backend/API contracts, database models, all Creator and Manager page tasks, VisualGuard, Evidence Intelligence, Sentinel, five controlled agents, security, testing, repository structure, official GitHub references and implementation prompts.

\newpage



## 0. How to use this document

1. Put this file at the root of the existing repository as `DESIGN.md`.
2. Supply the existing project ZIP/repository and all 21 reference PNG screenshots to the coding agent.
3. Tell the agent to read this entire document before editing code.
4. Require a baseline report before changes: current features, routes, APIs, tables, tests, deployment and gaps.
5. Implement in the order in [Section 7](#7-backend-first-implementation-order). Backend and service contracts come before final frontend wiring.
6. For each of the 21 feature tasks, require the acceptance criteria and tests in this document to pass before calling the task complete.

### Non-negotiable principles

- **Deterministic rules decide. AI suggests. Humans approve.**
- The Brand Manager is the final authority for policy activation, content approval and exception decisions.
- AI agents are advisory and restricted to read-only or draft-only tools.
- Every finding must be traceable to a rule and, where applicable, an exact stored guideline passage.
- Missing facts produce `unknown` / `needs_human_review`; missing information must not be silently interpreted as a violation or a pass.
- Every approval applies to one immutable content version.
- Simulations do not change live rules or submissions.
- Sentinel creates reassessment tasks; it does not silently reject previously approved content.
- Dashboard values, charts, notifications and status badges come from persisted backend data, not hardcoded UI constants.
- Do not install every listed repository. Select the smallest compatible stack, check model requirements and licences, and keep one implementation for each responsibility.

---

# 1. Product definition and target user journey

Precedent manages the complete brand-governance lifecycle:

1. Brand Managers upload and maintain official guidelines, approved assets, claims and structured rules.
2. Content Creators create marketing copy and upload creative assets.
3. VisualGuard extracts actual poster/image facts and flags visual inconsistencies.
4. Evidence Intelligence retrieves relevant guideline passages and suggests possible semantic issues with validated citations.
5. The deterministic rule engine calculates official outcomes: `violation`, `compliant` or `unknown`.
6. A Creator corrects the content and submits a specific version.
7. A Brand Manager reviews evidence and makes a human decision: approve, request changes or reject.
8. After approval/publication, Sentinel monitors policy and evidence changes and opens reassessment tasks when required.
9. All material actions are recorded in the audit history.

## 1.1 Roles

### Content Creator / Content Team

Can create and update their own drafts, upload assets, run checks, view findings and guideline sources, submit versions, request exceptions, view decisions, receive notifications and resolve assigned reassessment tasks. Creator permissions are limited to the relevant user/workspace and campaign scope.

### Brand Manager

Can review authorized workspace submissions, approve/reject/request changes, upload and version guidelines, create and activate structured rules, resolve conflicts, approve/reject/revoke exceptions, run impact simulations, monitor Sentinel, manage approved assets and inspect analytics/audit history.

### Optional future roles

- **Rule Owner:** drafts/maintains rules and validates test labels, but activation remains separately authorized.
- **Workspace Admin:** manages users, roles, integration keys and settings.
- **Agency Viewer:** read-only access to explicitly shared approved content and certificates.

Do not add these optional roles unless the existing requirements demand them. The two required user workspaces remain Creator and Brand Manager.

## 1.2 Permission matrix

| Operation | Creator | Brand Manager |
|---|---:|---:|
| Create own content/drafts | Yes | Yes, if allowed by workspace policy |
| Upload creative asset | Yes, for own submission | Yes |
| Run deterministic/AI review | Yes, on permitted submission | Yes |
| View active guidelines | Read-only | Read/write/manage |
| Edit/activate rules | No | Yes, with permission |
| Approve/reject content | No | Yes |
| Request exception | Yes | Yes, if policy allows |
| Approve/reject/revoke exception | No | Yes |
| Run non-mutating Sandbox simulation | No | Yes |
| Activate proposed rule after simulation | No | Yes |
| View own Sentinel tasks | Yes | Yes, workspace-wide |
| Resolve assigned Sentinel task | Yes, submit resolution | Yes, verify/close according to workflow |
| View workspace audit history | No | Yes |
| Change own role | No | No; Admin-only if Admin role exists |

**Security requirement:** This matrix must be enforced in FastAPI dependencies/service authorization. Hiding a button in React is not authorization.

---

# 2. What each post-login home page must look like

The two attached dashboard overview images are the post-login home-page references. Treat the actual supplied PNGs as the visual source of truth. Preserve their layout, palette, card positions, typography, spacing, menu order and information hierarchy as closely as possible.

## 2.1 Creator home page - `/creator/dashboard`

After successful Creator login:

- Verify the authenticated user's role from the server-issued session/token.
- Redirect the user to `/creator/dashboard`.
- Render the Creator-specific sidebar with exactly these entries, in this order:
  1. Dashboard
  2. New Content
  3. My Submissions
  4. AI Review
  5. Guidelines
  6. Exception Requests
  7. Sentinel Tasks
  8. Notifications
  9. Approved Content
  10. Profile
- Keep the Precedent logo, Content Team/Creator identity, top search, notification control and profile area consistent across all Creator pages.
- The dashboard overview contains live metric cards for submissions, approved, pending review and needs attention; active content/brief cards; recent submissions; quick actions; and the Creator's own Sentinel tasks.
- Cards and tables must be derived from the logged-in Creator's authorized records. A zero state must show `0`, not a made-up sample count.
- Example: when a Creator saves a draft, the draft appears in My Submissions. When they submit a version, the pending metric and submission list refresh from the API. When a Manager requests changes, the dashboard shows the change status and an action link.

### Creator home-page API contract

`GET /api/v1/creator/dashboard`

Suggested response shape:

```json
{
  "metrics": {
    "total_submissions": 0,
    "approved": 0,
    "pending_review": 0,
    "needs_attention": 0
  },
  "active_briefs": [],
  "recent_submissions": [],
  "quick_actions": ["new_content", "upload_poster", "check_copy", "request_exception"],
  "my_open_tasks": [],
  "unread_notifications": 0,
  "generated_at": "ISO-8601 timestamp"
}
```

Do not return records owned by another Creator unless the workspace explicitly grants access.

## 2.2 Brand Manager home page - `/manager/overview`

After successful Brand Manager login:

- Verify the role from the server session/token.
- Redirect to `/manager/overview`.
- Render the Brand Manager-specific sidebar with exactly these entries, in this order:
  1. Overview
  2. Review Queue
  3. All Submissions
  4. Brand Guidelines
  5. Rules & Conflicts
  6. Exceptions
  7. Rule Impact Sandbox
  8. Sentinel Monitoring
  9. Asset Library
  10. Analytics & Health
  11. Audit History
- Keep the Brand Manager identity and navigation separate from the Creator workspace.
- The overview contains pending reviews, approved today, active/expiring exceptions and rules to confirm; Review Queue preview; compliance health; recent rule changes/decisions; Sentinel impact and task summary; and AI/agent status only when backed by real health checks.
- Example: when new content is submitted by a Creator, it appears in the Manager Review Queue and the pending review metric updates. When the Manager activates a rule, the rule count and Sentinel impact data update after persisted actions.

### Brand Manager home-page API contract

`GET /api/v1/manager/dashboard`

Suggested response shape:

```json
{
  "metrics": {
    "pending_reviews": 0,
    "approved_today": 0,
    "active_exceptions": 0,
    "rules_pending_confirmation": 0,
    "open_sentinel_tasks": 0
  },
  "review_queue_preview": [],
  "compliance_health": {
    "compliant_count": 0,
    "needs_review_count": 0,
    "non_compliant_count": 0,
    "sample_size": 0
  },
  "recent_decisions": [],
  "recent_rule_changes": [],
  "sentinel_summary": {},
  "ai_health": {},
  "generated_at": "ISO-8601 timestamp"
}
```

Never show a compliance percentage without its denominator/sample size. Never label an agent or model `Healthy` unless a live service check has passed.

## 2.3 Shared login and routing behaviour

- `/login` is shared.
- Backend authentication verifies password and account status.
- Backend issues a session/access token using the security design already present in the repo. Prefer secure, HttpOnly cookies with CSRF protection for browser sessions if compatible; otherwise preserve the existing bearer-token pattern and document its storage/security controls.
- Frontend calls `/api/v1/auth/me` (or the existing equivalent) to retrieve authoritative role and workspace.
- Creator goes to `/creator/dashboard`; Brand Manager goes to `/manager/overview`.
- Requests to the other role's routes must return a proper `403` page and API response.
- A refresh/deep link must retain the correct page after the session is revalidated.

---

# 3. System architecture and how frontend/backend/AI connect

## 3.1 Recommended logical architecture

```text
Browser
  React + TypeScript + Vite + Tailwind
  React Router + TanStack Query
       |
       | HTTPS / JSON / authenticated session
       v
FastAPI application
  Routers -> Pydantic schemas -> authorization -> services
       |
       +--> Deterministic Rule Engine (source of truth)
       |
       +--> VisualGuard service
       |      OCR -> OpenCV -> visual facts -> findings
       |
       +--> Evidence Intelligence service
       |      document chunks -> embeddings/BM25 -> reranker
       |      -> optional LLM -> citation validator
       |
       +--> Review Crew (fixed, restricted agent workflow)
       |
       +--> Sentinel service + background scheduler/worker
       |
       +--> Notification service + Audit service
       |
       v
PostgreSQL + pgvector (preferred deployed database)
Object storage (local dev; S3-compatible production)
Redis/worker only if needed for long-running/background jobs
```

## 3.2 Required technology choices

| Layer | Recommended choice | Role in Precedent |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | 21 pages and role-specific shells |
| Styling | Existing design system/Tailwind | Match the 21 supplied screenshots |
| Routing | React Router | Creator/Manager routes and guards |
| Server state | TanStack Query | Fetch/cache/mutate API data and invalidate after changes |
| Forms | Existing form library; React Hook Form + Zod if absent | Validated forms |
| Backend | FastAPI + Python 3.12 | REST APIs and application services |
| Validation | Pydantic | Request/response and AI structured output validation |
| ORM | SQLAlchemy 2 | Persistence and queries |
| Migrations | Alembic | Safe schema evolution |
| Database | PostgreSQL | Source of truth for business data |
| Vector search | pgvector | Embedding search in PostgreSQL |
| OCR | RapidOCR as first candidate | Poster/image text extraction |
| OCR alternative | PaddleOCR, benchmark before choosing | Alternative OCR/document pipeline; do not automatically install both |
| Image processing | OpenCV + Pillow | Logo/template matching, palette, geometry, image normalization |
| PDF extraction | PyMuPDF | Text, page numbers, bounding boxes and PDF preview |
| DOCX extraction | python-docx | Extract paragraphs/tables from DOCX |
| Embeddings | BGE-M3 OR multilingual E5 | Semantic retrieval; select after benchmark |
| Reranker | BGE Reranker v2 M3 if needed | Reorder retrieved passages for relevance |
| BM25 | PostgreSQL full-text search or an existing BM25 library | Lexical retrieval alongside vector search |
| LLM | Configurable provider/client | Advisory explanation and minimal edits only |
| Agents | PydanticAI | Typed, bounded Review Crew orchestration |
| Scheduler | APScheduler for single scheduler instance | Daily Sentinel scan and expiry notices |
| Background jobs | Existing task system; Redis-backed worker if analysis volume requires it | Run OCR/LLM/reassessment without blocking requests |
| Privacy | Microsoft Presidio where useful | Detect/redact PII before external LLM calls |
| Evaluation | Ragas plus a human-labelled test set | Evaluate retrieval/groundedness; not a substitute for human labels |
| Tests | pytest + frontend test tooling + Playwright | Unit/integration/E2E tests |

### Do not add technologies just to increase the technology count

- Do not use both PydanticAI and LangGraph to orchestrate the same five agents. PydanticAI is the primary recommendation for this typed, bounded workflow. LangGraph is an alternative only if the workflow later requires graph persistence, branching and durable human checkpoints.
- Do not use BGE-M3 and multilingual E5 simultaneously unless an evaluation proves a practical benefit.
- Do not run RapidOCR and PaddleOCR in production simultaneously by default. Benchmark them using your poster dataset and select one primary engine; an optional fallback may be retained if its dependency footprint is acceptable.
- Do not require a GPU for the base application. The base workflow should still work with CPU-friendly OCR/embeddings and deterministic rules. Large vision-language models are optional.
- Do not add blockchain for ordinary approvals or audit logging. See [Section 10](#10-blockchain-and-cryptographic-provenance-what-is-actually-needed).

## 3.3 Request lifecycle

1. Request arrives with request ID and structured logging.
2. Router validates payload using Pydantic.
3. Authentication and role/workspace permission are checked.
4. Router calls a service; routers must not contain business logic.
5. Service reads/writes through SQLAlchemy transaction.
6. State-changing operation writes an audit record in the same transaction where possible.
7. Response is validated through Pydantic response schema.
8. Errors use one structure: `code`, `message`, `details`, `request_id`.
9. Frontend TanStack Query updates/refetches affected queries.

## 3.4 Deterministic rule engine contract

Every structured rule should have:

- `code`, `name`, `description`, `category`, `severity`, `priority`
- `condition_type` and validated `condition_config`
- `scope` (workspace/brand, campaign, channel, content type, market as required)
- `source_passage_id` and guideline version
- `effective_from`, `effective_until`
- `status` (`draft`, `active`, `inactive`, `archived`)
- creator/owner and activation audit metadata

For each rule/submission evaluation, return one outcome:

- `violation`: evidence/facts satisfy the violation condition.
- `compliant`: rule was actually checked and passed.
- `unknown`: required facts are missing, extraction failed or confidence is insufficient.

Evaluation order:

1. Check rule active status and effective date.
2. Check rule scope.
3. Gather analysed facts first and verified/manual facts second.
4. If required facts are missing, return `unknown`.
5. Evaluate deterministic condition.
6. Apply only a valid exception whose scope, conditions, date and revocation status match.
7. Produce finding with rule code, severity, explanation, source passage, region reference if visual, and suggested action.

The rule engine must be pure/testable and must not call an external LLM.

---

# 4. Shared database and domain model

Inspect existing models first and reuse them. The following is the target domain model, not an instruction to duplicate tables that already exist.

## 4.1 Core tables

| Table | Main purpose / important fields |
|---|---|
| `users` | id, email, password_hash, role, status, name, created_at |
| `workspaces` | id, name, settings |
| `workspace_members` | workspace_id, user_id, role, status |
| `campaigns` | id, workspace_id, name, objective, channel, product, audience, dates, status |
| `submissions` | id, workspace_id, creator_id, campaign_id, title, content_type, current_version_id, status |
| `submission_versions` | id, submission_id, version_number, copy, metadata, asset references, created_by, created_at, immutable review snapshot |
| `assets` | id, workspace_id, owner_id, storage_key, filename, mime_type, size, dimensions, checksum, status, metadata |
| `asset_analysis` | asset_id, status, OCR text/blocks, colors, logo matches, layout metrics, contrast findings, analyzer versions, errors |
| `guidelines` | id, workspace_id, title, category, status, current_version_id, owner_id |
| `guideline_versions` | id, guideline_id, version, storage key, effective dates, status, uploaded_by |
| `guideline_passages` | id, guideline_version_id, page_number, section, text, bounding/metadata |
| `passage_embeddings` | passage_id, model_name, vector/dimension, created_at |
| `rules` | id, workspace_id, code, fields described in Section 3.4 |
| `rule_versions` | rule_id, version, condition config, scope, effective dates, source passage, status |
| `rule_conflicts` | rule_a_id, rule_b_id, conflict_type, evidence, status, resolution |
| `findings` | submission_version_id, rule_code, source (deterministic/AI/visual), outcome, severity, explanation, passage_id, region, confidence |
| `ai_findings` | submission_version_id, rule_code, passage_id, quote, rationale, minimal_edit, confidence, citation_verified, rejected_reason, model, prompt_version |
| `approval_decisions` | submission_version_id, manager_id, decision, comment, timestamp, rule/guideline snapshot |
| `comments` | resource_type, resource_id, author_id, body, created_at |
| `exception_requests` | requester_id, rule_code, campaign/content scope, reason, conditions, requested dates, status |
| `exceptions` | approved request, scope, conditions, effective/expiry dates, approved_by, revoked_at |
| `publications` | submission_version_id, channel, published_at, published_by, status |
| `reassessment_tasks` | submission_version_id, trigger_type/ref, assignee, status, due_at, resolution; unique trigger key |
| `notifications` | user_id, type, title, payload, read_at, created_at |
| `audit_events` | actor, action, resource, before/after metadata, request_id, timestamp |
| `ai_call_log` | purpose, model, latency, token counts if available, status, error, prompt version |
| `agent_runs` | run id, submission version, state, status, timing, error |
| `agent_tool_calls` | run id, agent, tool, input/output summary, permission class, timing, result |
| `simulations` | manager, rule candidate/version, parameters, result summary, created_at |
| `simulation_items` | simulation_id, submission_version_id, previous/proposed outcome, impact reason |

## 4.2 Important database constraints

- Unique email (case-insensitive where appropriate).
- Unique rule code per workspace or agreed scope.
- Unique guideline version number per guideline.
- Unique submission version number per submission.
- Unique Sentinel task per `(submission_version_id, trigger_type, trigger_ref)`.
- Foreign keys for all ownership and source references.
- Use UTC timestamps in storage and convert to user timezone in the UI.
- Store immutable approval snapshots and never rewrite past decision evidence.
- Store file bytes in object/file storage, not as unbounded database blobs unless the existing architecture explicitly does so.

---

# 5. The 21 feature implementation tasks

Each task below defines **role, what the user sees, frontend behaviour, backend work, AI/ML/agent involvement, APIs/data and tests**. Use these as individual implementation tickets. A task is complete only when its UI is wired to real API responses and persistence.

## CREATOR WORKSPACE - 10 FEATURES

## C01 - Creator Dashboard

**Route:** `/creator/dashboard`  
**Role:** Content Creator, own records only.  
**Reference:** Creator Dashboard overview PNG.

### What the user sees

- Left sidebar with the 10 Creator links.
- Top search, notifications and profile.
- Metric cards: My Submissions, Approved, Pending Review, Needs Attention.
- Active Content & Briefs cards with actual campaign/asset thumbnails.
- Recent Submissions table with updated date, status and brand-check state.
- Quick Actions: Upload Poster, Check Copy, Request Exception.
- My Tasks panel showing the Creator's assigned Sentinel tasks.

### Frontend task

- Implement metric cards, active content cards, table, quick actions and task summary exactly in the screenshot's visual style.
- Load dashboard data on page entry and refresh after relevant mutations.
- Each campaign/submission/task card navigates to its detail or related screen.
- Show zero-state and loading skeletons; do not show fabricated growth percentages.

### Backend task

- Build dashboard aggregation service scoped to authenticated Creator.
- Return current submission counts by status, recent records, campaigns, open tasks and unread notifications.
- Add pagination/limits to recent lists.

### API and storage

- `GET /api/v1/creator/dashboard`
- Read `submissions`, `submission_versions`, `campaigns`, `reassessment_tasks`, `notifications`.

### AI/ML

No separate model is required. Dashboard may show the latest completed VisualGuard/Evidence status but must not run expensive AI inference just to render.

### Example

A Creator submits `Summer Product Launch v2`. Pending Review increases; the row appears in Recent Submissions; clicking it opens the version detail.

### Acceptance tests

- Creator A cannot see Creator B's private submissions.
- Counts match database queries.
- Empty workspace renders zero counts and helpful empty states.
- Refresh and deep link work.

---

## C02 - New Content

**Route:** `/creator/new-content`  
**Role:** Content Creator.

### What the user sees

- Content Details form: campaign, title, type, channel, product, audience, publish date.
- Content copy editor and character count.
- Upload Creative dropzone with preview and supported file types.
- Brand Check Preview: claims, approved phrases, tone, disclaimers, visual assets.
- Guideline Match panel with document/version links.
- Submission Checklist.
- Save Draft, Run Brand Check and Submit for Approval actions.

### Frontend task

- Validate required fields, dates, file type/size and content length.
- Upload file with progress and show analysis state.
- Poll or subscribe to analysis status while a background pipeline runs.
- Show findings in the same page after analysis finishes.
- Disable duplicate submit while a mutation is pending.

### Backend task

- Create/update draft; generate immutable versions when content is revised/submitted.
- Validate uploaded file by actual file signature/MIME, size and allowed type.
- Store asset securely and create `asset_analysis` with `pending` status.
- Enqueue VisualGuard and review tasks; do not block HTTP response for slow inference.
- Save the draft and current version transactionally.

### APIs

- `POST /api/v1/submissions`
- `PATCH /api/v1/submissions/{id}`
- `POST /api/v1/assets/upload`
- `GET /api/v1/assets/{id}/analysis`
- `POST /api/v1/submissions/{id}/analyze`
- `POST /api/v1/submissions/{id}/submit`

### AI/ML

- VisualGuard runs on uploaded images.
- Deterministic rule engine checks known facts and copy.
- Evidence Intelligence is optional at creator request or after deterministic checks.
- Agents can prepare analysis summary, but cannot submit/approve on behalf of the user.

### Example

Creator uploads a poster stating `100% safe`. OCR extracts the claim; deterministic rule `HEALTH-001` flags an absolute safety claim if configured; Evidence Intelligence retrieves the supporting guideline passage; the Creator sees a finding linked to the poster region.

### Acceptance tests

- Draft persists after reload/re-login.
- Corrupt, oversize and wrong-type files are rejected safely.
- OCR failure is shown as failure/unknown, never as "passed".
- Duplicate submission cannot create duplicate versions.

---

## C03 - My Submissions

**Route:** `/creator/submissions`  
**Role:** Content Creator.

### What the user sees

- Summary cards: total, approved, pending, needs changes.
- Filters: All, Approved, In Review, Needs Changes, Rejected.
- Submission list with thumbnail, campaign, title, version, timestamp and state.
- Detail drawer with content preview, review summary, manager comments, report and version history.

### Frontend task

- Server-side search, filters, sorting and pagination.
- Clicking a row opens a detail route/drawer.
- Version history compares exact content versions and their outcomes.
- Report download uses an authorized API response.

### Backend task

- Return only submissions the Creator may access.
- Provide paginated query and detail endpoints.
- Return decision history and feedback for each version.
- Generate a report using persisted findings and decision snapshot.

### APIs

- `GET /api/v1/submissions/my`
- `GET /api/v1/submissions/{id}`
- `GET /api/v1/submissions/{id}/versions`
- `GET /api/v1/submissions/{id}/report`

### AI/ML

Read existing finding records; do not re-run models just to open the list.

### Example

A submission changes from `In Review` to `Changes Requested`. The list reflects that status and links to the exact Manager comment and reviewed version.

### Acceptance tests

- Cross-user access returns 403/404 according to policy.
- Filters/pagination return correct totals.
- Old version decisions remain unchanged when a new version is created.

---

## C04 - AI Review

**Route:** `/creator/ai-review`  
**Role:** Content Creator; Manager can see review details in Manager Review Queue.

### What the user sees

Three distinct groups:

1. **Deterministic Violations** - official rule-engine outcomes.
2. **AI Suggestions** - advisory semantic findings with verified citations.
3. **Needs Human Review** - missing facts, ambiguity or low confidence.

Also show selected content preview, VisualGuard boxes, severity, rule code, source passage, verified quote, confidence, minimal-edit suggestion, before/after diff and Run New Analysis.

### Frontend task

- Draw OCR/logo/contrast bounding boxes on the image using normalized coordinates.
- Clicking a finding highlights its region and opens the exact source passage.
- Label AI-generated content and distinguish it visually from deterministic results.
- Show citation verified/rejected state and why a finding was rejected if authorized.
- Apply a proposed edit only after Creator confirmation; applying creates a new version.

### Backend task

- Combine separate deterministic, visual and AI findings without merging their authority.
- Validate LLM output using Pydantic.
- Validate citations: active rule exists; passage ID was retrieved; quote occurs in stored passage after normalization.
- Reject invalid citations and record rejection counts.
- Preserve analysis model/prompt versions.

### APIs

- `GET /api/v1/submissions/{id}/findings`
- `GET /api/v1/submissions/{id}/analysis`
- `POST /api/v1/submissions/{id}/ai-review`
- `POST /api/v1/findings/{id}/suggest-fixes`
- `POST /api/v1/fix-suggestions/{id}/apply`

### AI/ML/agents

- BGE-M3 OR multilingual E5 for retrieval.
- BM25 + dense retrieval with reciprocal-rank fusion.
- Optional BGE reranker.
- Configurable LLM returns structured JSON only.
- Evidence Verifier agent checks citations using a read-only passage tool.
- No model may change the official rule engine outcome.

### Example

Guideline says "Do not make unsupported disease-prevention claims." Copy says "Keeps you protected from every disease." Semantic retrieval can find the guideline even when wording differs. The LLM may suggest a concern, but the finding remains an AI suggestion unless a deterministic rule independently matches.

### Acceptance tests

- Fabricated passage ID is rejected.
- Quote not present in passage is rejected.
- Malformed LLM JSON is rejected.
- No LLM key still returns deterministic results.
- Prompt injection in uploaded copy is treated as untrusted content.

---

## C05 - Guidelines (Creator read-only)

**Route:** `/creator/guidelines`  
**Role:** Content Creator, read-only active guidelines.

### What the user sees

- Search and category filters.
- Active guideline cards with title, category, version and updated date.
- Document/page preview and exact source passage.
- Related guidelines and safe download action.

### Frontend task

- Show active versions only by default.
- Permit read/preview/download; hide edit/upload/archive controls.
- Search by title/category/phrase.

### Backend task

- Expose active guideline data to authorized workspace members.
- Enforce workspace and document visibility.
- Serve documents through authorized download endpoints or short-lived signed URLs.

### APIs

- `GET /api/v1/guidelines/active`
- `GET /api/v1/guidelines/{id}`
- `GET /api/v1/guidelines/{id}/versions`
- `GET /api/v1/guideline-passages/search?q=...`
- `GET /api/v1/guideline-versions/{id}/download`

### AI/ML

Search can use keyword and vector retrieval; only query existing stored passages. No LLM is required for simple document browsing.

### Example

Creator searches "logo clear space" and sees the active Visual Identity guideline with page/section citation.

### Acceptance tests

- Creator cannot upload/edit/activate a guideline.
- Archived/draft versions are not accidentally presented as active policy.
- Download endpoint checks workspace permission.

---

## C06 - Exception Requests (Creator)

**Route:** `/creator/exceptions`  
**Role:** Creator requests; Manager decides.

### What the user sees

- Request counts and status filters.
- Request list and selected detail panel.
- Campaign/content/rule association.
- Reason, requested scope, conditions, start/end date and supporting evidence.
- Manager comments and decision timeline.
- Request Exception form.

### Frontend task

- Validate reason and required date/scope inputs.
- Display pending/approved/rejected/expired/revoked correctly.
- Never present a pending request as an active exception.

### Backend task

- Create request as `pending` only.
- Manager approval creates the enforceable exception record with explicit scope, conditions and effective/expiry dates.
- Reject/revoke actions are audited.
- Match exceptions at rule-evaluation time, not by UI state alone.

### APIs

- `POST /api/v1/exception-requests`
- `GET /api/v1/exception-requests/my`
- `GET /api/v1/exception-requests/{id}`
- `GET /api/v1/exception-requests/{id}/history`

### AI/ML

No AI approval. An LLM may help clarify the request text but must not determine approval.

### Example

Creator requests use of an alternate festival background for one campaign from 1-10 November. If approved, the exception only applies to that campaign and date range.

### Acceptance tests

- Pending request does not bypass rules.
- Expired/out-of-scope/revoked exception never applies.
- Creator cannot approve own request.

---

## C07 - Sentinel Tasks (Creator)

**Route:** `/creator/sentinel-tasks`  
**Role:** Creator sees/acts on tasks assigned to them.

### What the user sees

- Total/open/resolved tasks and priority filters.
- Task trigger reason and affected version.
- Campaign thumbnail/details.
- Recommended resolution steps.
- Add comment, submit resolution and request reassessment.

### Frontend task

- Show trigger (rule activated, guideline replaced, exception expired/revoked, claim withdrawn/changed).
- Allow Creator to submit a fix or explanation.
- Display reassessment state after submit.

### Backend task

- Return assigned/authorized tasks only.
- Resolution submission creates a new content version or resolution record as appropriate.
- Re-run deterministic checks and relevant AI/visual pipeline.
- Manager verifies closure where required.

### APIs

- `GET /api/v1/sentinel/tasks/my`
- `GET /api/v1/sentinel/tasks/{id}`
- `POST /api/v1/sentinel/tasks/{id}/resolution`
- `POST /api/v1/sentinel/tasks/{id}/comments`

### AI/ML

No agent autonomously closes a task. Evidence retrieval can explain the changed policy.

### Example

A new rule prohibits a specific claim. Sentinel creates a task for a published version. Creator edits the content; Precedent reruns the rule engine; Manager reviews the new version.

### Acceptance tests

- Task appears only for authorized assignee/workspace.
- Duplicate scans do not create duplicate tasks.
- "Resolved" is not shown until required reevaluation/manager verification is complete.

---

## C08 - Notifications (Creator)

**Route:** `/creator/notifications`  
**Role:** Creator's own notifications.

### What the user sees

- Total, unread, action-required and system categories.
- Approval, changes-requested, comment, exception, guideline and Sentinel notifications.
- Detail panel with related content link.
- Mark read/unread and mark all read.

### Frontend task

- Filters and unread count.
- Clicking a notification navigates to the related submission/task.
- Keep count in sync after mutations/refetch.

### Backend task

- Persist notification event and per-user read state.
- Generate notifications from domain events, not UI clicks alone.
- Avoid duplicate event notifications with idempotency key.

### APIs

- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{id}/read`
- `POST /api/v1/notifications/read-all`

### AI/ML

None required. LLM summaries are optional and labelled if used.

### Example

Manager requests changes on `Campaign v3`; Creator receives a notification linking directly to the version and reviewer feedback.

### Acceptance tests

- Read state persists after refresh.
- One domain event does not create duplicate notification rows.
- Users cannot read/mark another user's notification.

---

## C09 - Approved Content (Creator)

**Route:** `/creator/approved-content`  
**Role:** Creator reads approved versions they may access.

### What the user sees

- Approved count and optional actual engagement/views only where connected data exists.
- Approved content list with asset, campaign, exact approved version and timestamp.
- Approval summary, manager, guideline/rule snapshot and report download.

### Frontend task

- Show only approved versions.
- Clearly identify the immutable approved version.
- "Make changes" must create a new draft/version, never overwrite approval.

### Backend task

- Query approved decisions joined to exact versions.
- Return approval metadata and policy snapshot.
- Generate authorized report.

### APIs

- `GET /api/v1/approved-content/my`
- `GET /api/v1/approved-content/{version_id}`
- `GET /api/v1/approved-content/{version_id}/report`

### AI/ML

Display stored analysis only; do not recalculate score on every page load.

### Example

A Creator sees `Summer Product Launch v2` approved by Manager with timestamp and guideline version. Editing creates v3 and sends it through review again.

### Acceptance tests

- Draft and rejected versions do not appear here.
- Creator cannot modify approved bytes/version in place.
- Report matches the approval snapshot.

---

## C10 - Creator Profile

**Route:** `/creator/profile`  
**Role:** Creator.

### What the user sees

- Profile/photo/contact and role.
- Department/account details.
- Preferences and notifications.
- Security settings.
- Recent activity.

### Frontend task

- Edit permitted profile fields.
- Password change with current-password verification.
- Preference toggles.
- Never provide a role-edit control.

### Backend task

- Authenticated self-profile endpoint.
- Validate email and profile updates.
- Password update with Argon2 hashing and session revocation policy.
- Record security-related audit events.

### APIs

- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `POST /api/v1/users/me/password`
- `GET /api/v1/users/me/sessions` (only if session model exists)

### AI/ML

None.

### Acceptance tests

- Creator cannot elevate role through request payload manipulation.
- Password update invalidates/revokes sessions according to policy.

---

## BRAND MANAGER WORKSPACE - 11 FEATURES

## M01 - Brand Manager Overview

**Route:** `/manager/overview`  
**Role:** Brand Manager.

### What the user sees

- Pending reviews, approved today, active/expiring exceptions, rules to confirm.
- Review Queue preview.
- Compliance health with sample size.
- Recent rule changes and decisions.
- Sentinel impact summary.
- Review Crew/AI Trust status only when supported by service health data.

### Frontend task

- Render the supplied Manager overview screenshot accurately.
- Cards navigate to their corresponding pages with filters applied.
- Refresh summaries after approval, rule activation or Sentinel activity.

### Backend task

- Workspace-scoped aggregate queries with date/timezone handling.
- Use exact data definitions for each metric and document them.
- Report `sample_size`, `generated_at` and empty state.

### API

- `GET /api/v1/manager/dashboard`

### AI/ML/agents

Show agent health from actual health probes and latest run statuses. Do not execute agents merely to render dashboard.

### Example

A newly submitted Creator version raises pending reviews from 4 to 5 and appears in the Review Queue preview.

### Acceptance tests

- All counts reconcile with feature lists.
- No invented percentage or fake model health.
- Only authorized workspace data is included.

---

## M02 - Review Queue

**Route:** `/manager/review-queue`  
**Role:** Brand Manager.

### What the user sees

- Kanban/status columns: In Review, Needs Changes, Approved, Rejected.
- Campaign, Creator, status and risk filters.
- Content cards with thumbnails, filename, campaign, Creator, timestamps and issue counts.
- Right detail pane with image, findings/evidence/comments, reviewer assignment, due date and decision controls.

### Frontend task

- Match the supplied Review Queue reference (multi-column queue plus selected-item detail panel).
- `AI Compare` compares versions/findings; it must not make final decision.
- Click finding to highlight image region and show stored passage.
- Request Changes requires comment/reason.
- Reject requires reason according to policy.
- Approve Version confirms exact version ID before submission.

### Backend task

- Query workspace submissions by status/scope.
- Return exact version, asset analysis, deterministic findings, AI suggestions, evidence, comments and decision history.
- Decision endpoint must run in transaction, verify authority/current status/version, save decision, audit event and notification.

### APIs

- `GET /api/v1/manager/review-queue`
- `GET /api/v1/submissions/{id}/review-detail`
- `POST /api/v1/submissions/{id}/decisions`
- `POST /api/v1/submissions/{id}/comments`

### AI/ML/agents

- VisualGuard results from stored analysis.
- Evidence Intelligence results with `citation_verified` state.
- Synthesis agent may prepare reviewer summary, but Manager chooses action.

### Example

Manager selects poster with logo mismatch and unsupported claim; sees bounding box plus guideline passage; requests changes with comment. Creator receives notification and the exact version becomes `changes_requested`.

### Acceptance tests

- Approve affects exact version, not latest version silently.
- A stale/conflicting decision returns 409.
- Manager cannot approve from untrusted agent output.
- Every decision appears in Audit History.

---

## M03 - All Submissions

**Route:** `/manager/submissions`  
**Role:** Brand Manager.

### What the user sees

- Total/approved/pending/changes/rejected metrics.
- Table with thumbnail, title, campaign, Creator, status, compliance outcome/score, submitted date and action.
- Filters, sorting, pagination, analytics distribution and campaign list.

### Frontend task

- Server-side table filtering, pagination and export.
- Open submission details in M02 detail view.
- Never treat an AI confidence score as the compliance score.

### Backend task

- Workspace-wide authorized query and aggregate service.
- CSV export with audit event and access check.

### APIs

- `GET /api/v1/manager/submissions`
- `GET /api/v1/manager/submissions/summary`
- `GET /api/v1/manager/submissions/export`

### AI/ML

None needed for list; read previously persisted findings.

### Acceptance tests

- Filters and totals reconcile.
- Large result sets paginate.
- Export follows same filters and permissions.

---

## M04 - Brand Guidelines

**Route:** `/manager/guidelines`  
**Role:** Brand Manager; Creator has read-only view C05.

### What the user sees

- Total/active/pending/archived metrics.
- Category filters and document card grid/list.
- Upload Document.
- Document detail panel: title, owner, category, version, date, preview, pages and related guidelines.
- Extracted passages and draft rules awaiting confirmation.

### Frontend task

- Upload PDF/DOCX with progress and extraction status.
- Show preview and page-linked passages.
- Create new version; old version remains accessible and immutable.
- Display extraction errors rather than showing empty success.
- Draft/activate status clearly distinguished.

### Backend task

- Validate and store document.
- Extract text/page/sections using PyMuPDF and python-docx.
- Use OCR only for scanned pages when required.
- Chunk text with stable passage IDs and page metadata.
- Create embeddings asynchronously.
- Create draft rule suggestions only; Manager confirms before activation.

### APIs

- `POST /api/v1/guidelines`
- `GET /api/v1/guidelines`
- `GET /api/v1/guidelines/{id}`
- `POST /api/v1/guidelines/{id}/versions`
- `GET /api/v1/guidelines/{id}/passages`
- `POST /api/v1/guidelines/{id}/extract`
- `POST /api/v1/guidelines/{id}/draft-rules`

### AI/ML

- PyMuPDF, python-docx.
- RapidOCR fallback for image/scanned pages.
- Embeddings and hybrid retrieval.
- LLM may help draft structured rules; it cannot activate them.

### Example

Manager uploads `Visual Identity Guide v3.pdf`. The system extracts page 12's logo rule; the UI shows the exact passage and a draft `LOGO-001` rule. Manager reviews/edits and activates it.

### Acceptance tests

- Fresh upload and subsequent version both work.
- Page numbers and passage references remain stable.
- Failed parsing is visible.
- Draft rule does not become active without human confirmation.

---

## M05 - Rules & Conflicts

**Route:** `/manager/rules-conflicts`  
**Role:** Brand Manager.

### What the user sees

- Total/active/conflicting/pending rules.
- Rule list with code, category, status, severity, priority and source.
- Create/Edit/Archive actions.
- Conflict panel comparing rules and showing source passages, scope/date conflict, impact and suggested resolution.

### Frontend task

- Rule editor with typed condition form, scope, channel/campaign/content type, priority and effective dates.
- Conflict details should show exact conflicting fields/passages.
- Require confirmation before activation.

### Backend task

- Validate condition types/configs with Pydantic.
- Version every material rule change.
- Detect conflicts using structured scope/condition/effective-date comparison.
- AI may explain possible ambiguity, but deterministic conflict checks should be used when possible.
- Resolution remains human-authorized and audited.

### APIs

- `GET /api/v1/rules`
- `POST /api/v1/rules`
- `PATCH /api/v1/rules/{id}`
- `POST /api/v1/rules/{id}/activate`
- `POST /api/v1/rules/{id}/deactivate`
- `GET /api/v1/rule-conflicts`
- `POST /api/v1/rule-conflicts/{id}/resolve`

### AI/ML

Optional LLM to phrase clarification questions; not required for basic structured conflict detection.

### Example

Two rules specify different minimum logo widths for the same channel/scope. System flags the conflict and displays both source passages. Manager resolves the rule priority/scope and records the decision.

### Acceptance tests

- Inactive/expired rules are not evaluated.
- Scope/date boundaries are tested.
- Conflict suggestion cannot auto-activate a rule.

---

## M06 - Exceptions

**Route:** `/manager/exceptions`  
**Role:** Brand Manager.

### What the user sees

- Total, pending, approved, rejected and expired requests.
- Request table with campaign, rule, reason, Creator and dates.
- Detail panel with requested scope, conditions, supporting evidence, notes and history.
- Approve, Reject, Revoke and expiry controls.

### Frontend task

- Approval form must require all enforceable exception fields.
- Clearly mark expiry and scope.
- Show affected content count if available.

### Backend task

- Separate request record from approved exception record.
- Verify approver permission.
- Validate date boundaries, scope and required conditions.
- Expiry/revocation emits Sentinel trigger and audit event.

### APIs

- `GET /api/v1/manager/exception-requests`
- `POST /api/v1/exception-requests/{id}/decision`
- `POST /api/v1/exceptions/{id}/revoke`
- `GET /api/v1/exceptions/{id}/usage`

### AI/ML

No autonomous approval. Optional AI can summarise request/evidence for Manager.

### Example

Manager approves a green background exception for Campaign A from 1-10 November, only for Instagram posters, with a disclaimer condition. The same exception does not apply to Campaign B.

### Acceptance tests

- Out-of-scope, expired and revoked exceptions never bypass a rule.
- Exception decisions are audited and notify Creator.
- Revocation triggers Sentinel once.

---

## M07 - Rule Impact Sandbox

**Route:** `/manager/rule-impact-sandbox`  
**Role:** Brand Manager.

### What the user sees

- Simulation history and metrics.
- Select rule and proposed change (tighten/relax/modify).
- Current vs proposed rule preview.
- Run Simulation action.
- Impact score with explanation and sample count.
- Affected content, campaigns and channels.
- Detailed breakdown and recommendations.
- Save/export simulation.

### Frontend task

- Store proposed changes in a draft simulation form.
- Display result only after API completion.
- Distinguish `simulation` from `activated rule`.
- Require explicit confirmation on separate activation workflow.

### Backend task

- Clone proposed rule config in memory or immutable simulation record.
- Replay proposed rule against selected stored submission versions.
- Do not write to current submission verdicts or active rules.
- Persist simulation inputs/results separately.
- On explicit activation, create new rule version, audit event and Sentinel trigger.

### APIs

- `POST /api/v1/simulations`
- `GET /api/v1/simulations/{id}`
- `GET /api/v1/simulations/{id}/affected-content`
- `POST /api/v1/rules/{id}/activate-proposed-version`

### AI/ML

No LLM required for simulation math. AI can provide a labelled explanation after deterministic result is computed.

### Example

Manager tests a proposed rule requiring larger disclaimer text. Sandbox replays 120 applicable posters: 14 become `violation`, 8 `unknown`, and 98 remain `compliant`. No live state changes until Manager activates the rule.

### Acceptance tests

- Running simulation changes no live rule/submission data.
- Results reproducible for same rule/data snapshot.
- Activation is a separate permissioned transaction.

---

## M08 - Sentinel Monitoring

**Route:** `/manager/sentinel`  
**Role:** Brand Manager.

### What the user sees

- Monitored content, open alerts, resolved alerts and coverage.
- Alert trend/category/channel charts.
- Recent alerts with severity, trigger, status and timestamp.
- Detail panel with affected content, rule/evidence change, recommended action, assignment and resolution.

### Frontend task

- Filters by priority, campaign, trigger and status.
- Preview impact from a pending rule change.
- Open task detail, assign, comment, verify resolution and close.

### Backend task

Triggers:
- Rule activated/edited/deactivated where impact changes.
- Exception expires or is revoked.
- Claim/evidence is changed or withdrawn if claims registry exists.
- Guideline version replaced/effective date changes.

Impact finder:
1. Find approved/published versions in affected scope.
2. Use rule scope and claim/text matching to narrow candidates.
3. Replay the new rule set.
4. Create tasks only for newly non-compliant or `unknown` items needing review.
5. Use unique key `(version, trigger_type, trigger_ref)` for idempotency.
6. Notify affected Creator and authorized Manager.
7. Audit the scan and outcome.

### APIs

- `GET /api/v1/sentinel/alerts`
- `POST /api/v1/sentinel/scan` (manual, Manager-only)
- `GET /api/v1/sentinel/tasks`
- `POST /api/v1/sentinel/tasks/{id}/assign`
- `POST /api/v1/sentinel/tasks/{id}/verify-resolution`

### AI/ML

Embeddings may help identify semantically related content, but every candidate must be replayed through deterministic rule engine. AI cannot close or reject content.

### Scheduling

APScheduler is acceptable when exactly one scheduler process is deployed. If multiple API workers/replicas are used, run scheduling in a dedicated worker or use a persistent distributed queue/scheduler to prevent duplicate scans.

### Acceptance tests

- A trigger creates tasks only for affected records.
- Repeated scan does not duplicate tasks.
- Unaffected content stays untouched.
- Expired/revoked exceptions no longer apply.

---

## M09 - Asset Library

**Route:** `/manager/assets`  
**Role:** Brand Manager; Creator can use approved assets if permission allows.

### What the user sees

- Asset counts: total, approved, pending, flagged.
- Grid/list toggle.
- Images, videos, documents, logos, product shots and templates.
- Search/filter by type/category/status/campaign/tag.
- Detail panel: preview, filename, size, dimensions, owner, upload date, checksum, tags, versions and related guideline.
- Upload, preview, download, approve/flag and attach-to-campaign actions.

### Frontend task

- Grid and list use same server data.
- Upload progress/errors.
- Preview supported files safely.
- Show immutable version history.
- Use approved asset selector in Creator New Content if authorized.

### Backend task

- Secure upload validation and storage.
- MIME sniffing, size limits, safe paths and access policy.
- Extract image dimensions/metadata and checksum.
- Link assets to campaigns/guidelines/submissions.
- Track asset version and status transitions.

### APIs

- `POST /api/v1/assets`
- `GET /api/v1/assets`
- `GET /api/v1/assets/{id}`
- `POST /api/v1/assets/{id}/versions`
- `POST /api/v1/assets/{id}/decision`
- `GET /api/v1/assets/{id}/download`

### AI/ML

VisualGuard analyses uploaded image assets; store outputs in `asset_analysis`. Do not run large VLM for every asset automatically.

### Acceptance tests

- Upload size/type/malware scanning policy works.
- User cannot download unauthorized file.
- Asset approval/flag is audited.

---

## M10 - Analytics & Health

**Route:** `/manager/analytics`  
**Role:** Brand Manager.

### What the user sees

- Compliance trend by period.
- Violations by category/severity.
- Top violated rules.
- Campaign comparison.
- Approval time and queue size.
- Exception usage/expiry.
- Sentinel open/resolved statistics.
- AI citations verified/rejected and timeout/latency.
- Guideline health and rule coverage.
- Export report controls.

### Frontend task

- Time filters and campaign/category filters.
- Charts show totals, denominators and date range.
- Low-sample warning where applicable.
- Export CSV/PDF only using real API data.

### Backend task

- Aggregate from persisted records.
- Define calculation windows and status semantics.
- Avoid double-counting versions or events.
- Provide `sample_size`, `generated_at`, timezone and applied filters.

### APIs

- `GET /api/v1/analytics/overview`
- `GET /api/v1/analytics/compliance-trend`
- `GET /api/v1/analytics/rule-violations`
- `GET /api/v1/analytics/campaigns`
- `GET /api/v1/analytics/ai-quality`
- `GET /api/v1/analytics/export`

### AI/ML

Ragas can evaluate offline test sets and selected sampled production traces with privacy controls. Do not use model-generated evaluations as ground truth without human labels.

### Example

Show `12 violations out of 80 reviewed versions (15%)` rather than `15% compliance` with no denominator.

### Acceptance tests

- Metrics reconcile with source records.
- Timezone boundaries correct.
- Small sample warning shown.
- Exports respect Manager permissions.

---

## M11 - Audit History

**Route:** `/manager/audit-history`  
**Role:** Brand Manager.

### What the user sees

- Audit event count and filters.
- Actor, action, resource, timestamp, request ID and summary.
- Before/after details where safe.
- Submission decisions, rule activations, exception decisions, Sentinel triggers, AI call summaries and exports.

### Frontend task

- Search and filter by actor/action/resource/date.
- Open event detail drawer.
- Export authorized event list.
- Clearly indicate system vs human actor.

### Backend task

- Record material events centrally from service layer.
- Make application-level audit rows append-only; no edit/delete API.
- Restrict sensitive details from Creator/public endpoints.
- Optional tamper-evident hash chain can be added after core audit is stable.

### APIs

- `GET /api/v1/audit-events`
- `GET /api/v1/audit-events/{id}`
- `GET /api/v1/audit-events/export`

### AI/ML

No AI required. AI call and agent-run metadata may be linked as audit references but never expose provider secrets or raw private prompt content.

### Acceptance tests

- Every state-changing workflow produces audit event.
- No API permits changing/deleting historic event.
- Export role visibility is correct.

---

# 6. AI/ML, vision and agent pipelines - start to finish

## 6.1 A1 - VisualGuard pipeline

**Recommended primary components:** RapidOCR + OpenCV + Pillow. Benchmark PaddleOCR as an alternative. Optional Qwen3-VL is a later enhancement only if the base pipeline is stable and hardware/provider is available.

### Processing flow

```text
Image upload
   -> validate file signature, size, dimensions
   -> store asset + create analysis(status=pending)
   -> background worker
       -> normalize orientation / color / dimensions
       -> OCR: words, confidence, boxes
       -> approved-logo matching (template/ORB as applicable)
       -> dominant palette and delta from workspace-approved palette
       -> layout/position/safe-area measurements
       -> contrast estimation for text regions
       -> store facts + analyzer versions + confidence
       -> send extracted facts/text to deterministic rule engine
       -> save findings with region references
   -> frontend polls analysis status and renders overlays
```

### Important limitations

- Low OCR confidence becomes `unknown` or human review.
- Logo template match confidence is not certainty; low score must not be reported as a confirmed wrong logo.
- Colours depend on image color profile/lighting and should use defined tolerances.
- Contrast calculation on a photographic background may be approximate unless local text/background sampling is reliable.
- Font-family identification from a flattened poster is not reliable. Report estimated text size/legibility only, or mark font family `not_verifiable`.
- Do not claim OCR supports a language unless its model files were installed and tested. Configure `OCR_LANGS` after confirming exact support.

### Visual analysis API shape

`GET /api/v1/assets/{asset_id}/analysis`

```json
{
  "status": "completed",
  "ocr_blocks": [
    {"text": "100% safe", "confidence": 0.94, "box": [0.1, 0.2, 0.5, 0.3]}
  ],
  "logo_matches": [],
  "dominant_colors": [],
  "contrast_findings": [],
  "analyzer_versions": {"ocr": "configured-version", "opencv": "installed-version"},
  "findings": []
}
```

Use normalized coordinates (0-1) or document the pixel coordinate system and conversion. Frontend overlays must scale with the displayed image.

## 6.2 A2 - Evidence Intelligence pipeline

### Ingestion

1. Extract PDF text and page labels with PyMuPDF.
2. Extract DOCX paragraphs/tables using python-docx.
3. For scanned PDFs, render selected pages and run OCR.
4. Preserve title, version, page, section and source file references.
5. Chunk passages without losing provenance.
6. Generate embeddings in a background task.
7. Store passage text and vectors in `guideline_passages` + `passage_embeddings`.

### Retrieval and review

```text
Creator content sentences
   -> BM25 / PostgreSQL full-text search
   -> embedding nearest-neighbour search (pgvector)
   -> combine ranked results (RRF)
   -> optional cross-encoder reranker
   -> top relevant passages with stable IDs
   -> LLM receives only content + retrieved passages
   -> Pydantic validates structured output
   -> citation validator checks rule, passage, exact quote
   -> save valid ai_findings; reject/count invalid output
   -> frontend shows AI suggestion separately
```

### LLM reviewer guardrails

- Use only retrieved active passages.
- Never invent rule or passage IDs.
- Quote exact source text (keep quote short).
- If evidence is weak or content ambiguous, mark needs-human-review.
- Treat content/OCR/guidelines as untrusted data, not system instructions.
- No tool in the reviewer can approve content or activate rules.
- Use JSON schema/Pydantic validation.
- Use timeout, one bounded retry and daily call limits.
- Log provider/model, purpose, latency, token counts when provided, status and prompt version.
- If no API key or model outage, deterministic result remains available with a clear UI banner.

### Example structured output

```json
{
  "findings": [
    {
      "sentence_index": 0,
      "passage_id": "stored-passage-id",
      "rule_code": "HEALTH-002",
      "quote": "exact words copied from the stored passage",
      "rationale": "why the content may conflict",
      "confidence": 0.83,
      "needs_human_review": false,
      "minimal_edit": "smallest suggested change"
    }
  ]
}
```

Only accept the finding if the passage was in the retrieved result set and the quote is actually present after whitespace normalization.

## 6.3 A3 - Sentinel pipeline

### Trigger sources

- Rule created/edited/activated/deactivated if the change affects prior content.
- Exception expires/revoked.
- Guideline version replaced or effective state changes.
- Claim/evidence withdrawn or validity changed, if a claim registry is implemented.

### Impact process

```text
Domain event / daily scan
   -> determine affected rule/scope/date
   -> find approved/published versions in scope
   -> narrow using rule code, text match, asset facts and optional embeddings
   -> replay current/new rule engine against each version
   -> compare old and new outcome
   -> create reassessment task only for changed risk/unknown results
   -> unique idempotency key prevents duplicates
   -> notify Creator + Manager
   -> Creator submits resolution/new version
   -> re-run checks -> Manager verifies where required
   -> audit complete timeline
```

Sentinel must not mutate old approval. It creates an explicit reassessment workflow.

### APIs

- `POST /api/v1/sentinel/scan` (manual Manager action)
- `GET /api/v1/sentinel/tasks`
- `GET /api/v1/sentinel/alerts`
- `POST /api/v1/sentinel/tasks/{id}/assign`
- `POST /api/v1/sentinel/tasks/{id}/resolution`
- `POST /api/v1/sentinel/tasks/{id}/verify-resolution`

## 6.4 Review Crew - five controlled agents

**Primary framework:** PydanticAI. Use a deterministic, fixed Python orchestration sequence first. A graph framework is not required for this initial workflow.

| Agent | Responsibility | Allowed tools | Forbidden tools |
|---|---|---|---|
| Intake | Content type, channel, language, metadata validation | Read submission metadata | Approve/reject, edit rules |
| VisualGuard | Summarize actual stored visual analysis | Read asset analysis | Modify image, approve |
| Retrieval | Retrieve guideline passages | Search active guidelines | Activate guidelines/rules |
| Evidence Verifier | Check rule/passage/quote grounding | Read rule/passage, validate citation | Grant exception or decide approval |
| Synthesis | Prepare manager summary and minimal edits | Read findings/comments; create draft suggestion | Approve/reject/activate/revoke |

### Agent runtime controls

- Pydantic input/output schemas.
- Fixed plan and maximum steps.
- Per-call timeout and total run deadline.
- Token/call budget.
- Tool allowlist and permission checks.
- Prompt-injection defence; all uploaded content is untrusted.
- Persist `agent_runs` and `agent_tool_calls`.
- Show Agent Trace in Manager AI Trust panel.
- On agent failure, show failure and preserve deterministic output.

### AI Trust panel metrics

Only calculate from logs:
- Agent runs succeeded/failed.
- AI calls succeeded/timed out.
- Citations accepted/rejected.
- Average/median latency.
- Model and prompt versions.
- Retrieval model/version.
- PII redaction count if implemented.

Do not display "0 hallucinations" as a guarantee. Display a measured test metric and define the evaluation method.

---

# 7. Backend-first implementation order

Use these phases. Do not build all frontend pages with fake data while the backend is incomplete.

## Phase 0 - Baseline and compatibility

- Inventory repo, stack, tests, environment and deployment.
- Preserve current DB and routes.
- Create gap matrix against all 21 features.
- Review licences/model requirements before dependency changes.
- Record baseline test/build output.

Deliverables: `docs/IMPLEMENTATION_GAP_REPORT.md`, route map, schema map, test baseline.

## Phase 1 - Backend foundation

- Pydantic settings/config.
- Database session and transaction boundaries.
- Alembic migrations on fresh DB and existing Round 2 DB.
- Structured error handler/request ID.
- Central permission map and RBAC tests.
- Auth `/me` and role redirect support.
- Health/readiness endpoint.
- File storage abstraction and upload validation.
- Central audit service.

Deliverable: tested API foundation.

## Phase 2 - Core domain APIs

Implement/verify:
- Campaigns.
- Submissions and immutable versions.
- Assets.
- Guidelines, versions and passages.
- Rules and rule versions.
- Findings.
- Decisions.
- Exception requests/approved exceptions.
- Comments and notifications.
- Publications and audit events.

Deliverable: CRUD/integration tests for core data.

## Phase 3 - Deterministic engine

- Validate rule schema.
- Implement violation/compliant/unknown.
- Implement scope/effective-date logic.
- Implement exception matching.
- Add reproducible unit fixtures.

Deliverable: engine is the official policy source of truth.

## Phase 4 - A1 VisualGuard

- Install one selected OCR engine.
- Add OpenCV/Pillow pipeline.
- Add `asset_analysis` table/migration.
- Add background execution/status polling.
- Integrate extracted facts into rule engine.
- Build fixture posters with expected text/logo/colour/contrast outcomes.

Deliverable: upload poster -> actual analysis -> stored findings -> bounding-box UI data.

## Phase 5 - A2 Evidence Intelligence

- Document extraction and passage chunking.
- Pick one embedding model (benchmark BGE-M3 vs multilingual E5 on sample data).
- Add pgvector if DB supports it; use compatible fallback if not.
- Add BM25/lexical search, RRF and optional reranker.
- Add configurable LLM provider.
- Add Pydantic output validation and strict citation validation.
- Add AI logs, failure banner and deterministic fallback.

Deliverable: paraphrase -> correct source passage -> verified citation or rejection.

## Phase 6 - A3 Sentinel

- Publication records.
- Trigger service.
- Impact finder/replay.
- Idempotent reassessment task creation.
- Notifications.
- Daily scheduler/worker.
- Manual scan endpoint.
- Creator and Manager task flows.

Deliverable: rule change -> affected content -> unique tasks -> notification -> resolution -> audit.

## Phase 7 - Agent layer

- Add five agents over already-working A1/A2 services.
- Keep tools restricted.
- Log traces.
- Add malicious prompt-injection tests.
- Show real run state in Manager UI.

Deliverable: inspectable, bounded Review Crew; not autonomous policy authority.

## Phase 8 - Frontend integration (21 pages)

- Map all PNG references to their page routes.
- Preserve the existing Stitch-generated layouts.
- Build shared Creator and Manager layout shells.
- Wire every page to the real API with TanStack Query.
- Implement filters, forms, detail drawers, comments, uploads, charts and downloads.
- Remove static/hardcoded metrics from live mode.
- Add loading, empty, error, permission and success states.

Deliverable: 21 actual pages connected to backend.

## Phase 9 - Full workflow tests and hardening

- Playwright end-to-end journeys.
- RBAC coverage for every sensitive endpoint.
- Upload/file edge cases.
- Expired token and refresh/deep link.
- Duplicate actions/concurrent edits.
- OCR/LLM timeout/failure.
- Sentinel idempotency.
- Mobile/desktop visual checks.

Deliverable: reproducible test report with actual counts and limitations.

## Phase 10 - Deploy and document

- Docker/production config compatible with actual repo.
- PostgreSQL and vector extension setup if used.
- File storage persistence and backup.
- HTTPS and secrets.
- README clean-clone test.
- Architecture/API docs.
- Final PDF/feature list/roadmap.

---

# 8. Frontend architecture and page wiring rules

## 8.1 Route tree

```text
/login
/creator/dashboard
/creator/new-content
/creator/submissions
/creator/ai-review
/creator/guidelines
/creator/exceptions
/creator/sentinel-tasks
/creator/notifications
/creator/approved-content
/creator/profile
/manager/overview
/manager/review-queue
/manager/submissions
/manager/guidelines
/manager/rules-conflicts
/manager/exceptions
/manager/rule-impact-sandbox
/manager/sentinel
/manager/assets
/manager/analytics
/manager/audit-history
```

## 8.2 Suggested frontend structure

```text
frontend/src/
  api/                 typed API client, auth, endpoints
  app/                 providers, app config
  layouts/             CreatorLayout, ManagerLayout
  routes/              role guards and route definitions
  components/
    shared/             Sidebar, Topbar, Search, MetricCard, StatusBadge,
                        Table, Drawer, Modal, Toast, EmptyState, Skeleton
    creator/            creator-specific components
    manager/            manager-specific components
    findings/            FindingList, EvidencePanel, PosterCanvas, DiffView
    charts/              chart components
  features/
    auth/
    creator-dashboard/
    content/
    submissions/
    ai-review/
    guidelines/
    exceptions/
    sentinel/
    notifications/
    approved-content/
    profile/
    manager-overview/
    review-queue/
    rules/
    sandbox/
    assets/
    analytics/
    audit/
  hooks/                TanStack Query hooks
  schemas/              Zod/form schemas
  types/                API response types
  utils/                formatting, permissions, image coords
```

Adapt to existing repository structure instead of moving files unnecessarily.

## 8.3 API integration rules

- Use one typed fetch/axios client.
- Base URL comes from environment variable.
- Attach auth consistently.
- Map structured backend errors to user-friendly messages.
- Query keys include workspace/role/resource/filter/page parameters.
- Mutations invalidate the related queries.
- Do not duplicate server state in component local state unnecessarily.
- Abort stale searches and debounce typeahead.
- Handle 401, 403, 404, 409, 413, 422, 429 and 5xx distinctly.
- Use optimistic updates only for safe operations such as notification read state; approval and exception decisions should wait for server confirmation.

## 8.4 Visual match requirements

- Treat all 21 PNG images as visual source of truth.
- Use the provided Creator overview image for Creator home page and Manager overview image for Manager home page.
- Use corresponding screenshots for the other pages.
- Preserve sidebars separately; do not mix the two role menus.
- Match layout, proportions, spacing, typography, borders, cards, image ratio, right panels, icons and status colours.
- Product/campaign images must come from stored asset URLs or clearly labelled demo fixtures, not arbitrary random images in production.
- Check desktop and responsive layouts.

---

# 9. API conventions and endpoint catalogue

Use `/api/v1` consistently. Exact endpoint names should be reconciled with existing APIs before adding duplicates.

| Domain | Representative endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/refresh` |
| Creator dashboard | `GET /creator/dashboard` |
| Manager dashboard | `GET /manager/dashboard` |
| Campaigns | `GET/POST /campaigns`, `GET/PATCH /campaigns/{id}` |
| Submissions | `POST /submissions`, `GET /submissions/my`, `GET /submissions/{id}`, `PATCH /submissions/{id}` |
| Versions | `GET /submissions/{id}/versions`, `POST /submissions/{id}/versions` |
| Submission decisions | `GET /manager/review-queue`, `POST /submissions/{id}/decisions` |
| Assets | `POST /assets`, `GET /assets`, `GET /assets/{id}`, `GET /assets/{id}/analysis`, `GET /assets/{id}/download` |
| Guidelines | `POST /guidelines`, `GET /guidelines`, `POST /guidelines/{id}/versions`, `GET /guidelines/{id}/passages` |
| Retrieval | `GET /guideline-passages/search` |
| Rules | `GET/POST /rules`, `PATCH /rules/{id}`, `POST /rules/{id}/activate` |
| Conflicts | `GET /rule-conflicts`, `POST /rule-conflicts/{id}/resolve` |
| Findings/AI | `GET /submissions/{id}/findings`, `POST /submissions/{id}/ai-review`, `POST /findings/{id}/suggest-fixes` |
| Exceptions | `POST /exception-requests`, `GET /exception-requests`, `POST /exception-requests/{id}/decision`, `POST /exceptions/{id}/revoke` |
| Sandbox | `POST /simulations`, `GET /simulations/{id}`, `GET /simulations/{id}/affected-content` |
| Sentinel | `POST /sentinel/scan`, `GET /sentinel/tasks`, `GET /sentinel/alerts`, task resolution endpoints |
| Notifications | `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all` |
| Analytics | `GET /analytics/overview`, `/compliance-trend`, `/rule-violations`, `/campaigns`, `/ai-quality`, `/export` |
| Audit | `GET /audit-events`, `GET /audit-events/{id}`, `GET /audit-events/export` |
| Agents | `POST /agent-runs` only if user-triggered; `GET /agent-runs/{id}`, `GET /agent-runs/{id}/trace` |
| Health | `GET /health`, `GET /ready` |

## 9.1 Standard error response

```json
{
  "code": "VALIDATION_ERROR",
  "message": "The uploaded file is not supported.",
  "details": {"field": "file", "allowed": ["png", "jpg", "webp"]},
  "request_id": "correlation-id"
}
```

## 9.2 Background job status response

```json
{
  "job_id": "job-id",
  "status": "pending",
  "stage": "ocr",
  "progress": null,
  "error": null
}
```

Only show a percentage if actual progress can be measured. Otherwise use stage/status.

---

# 10. Blockchain and cryptographic provenance - what is actually needed

Blockchain is **not required** for the 21 core screens or the three committed Round 3 improvements. Do not add a blockchain dependency merely to claim blockchain technology.

## Recommended for approval integrity: cryptographic ProofPass (optional stretch)

- SHA-256 fingerprint for exact approved file.
- Ed25519 signature on a compact certificate/token.
- QR code linked to public verification page.
- Revocation/expiry status.
- Perceptual hash only as a secondary visual-similarity signal.
- Registered renditions for explicitly approved resized/exported files.

This is cryptographic provenance, not blockchain. SHA-256 equality proves exact byte equality. A perceptual hash can indicate similarity but cannot prove intent or tampering.

## When blockchain might be justified

Only consider a blockchain/permissioned ledger if multiple independent organizations must verify approval provenance without trusting one shared operator, and if that is a real product requirement. It is not needed for a single-workspace hackathon deployment where PostgreSQL, signed certificates and append-only/tamper-evident audit records are sufficient.

If the team nevertheless prototypes blockchain, isolate it as an optional adapter; never block the core approval workflow on chain availability or transaction finality. Do not store private documents, raw PII or content itself on-chain.

---

# 11. Security, privacy and operational requirements

- Argon2 password hashing; secure session/token handling.
- Central permission map and backend RBAC for every protected route.
- Workspace/resource ownership checks in service layer.
- HTTPS in deployment.
- Secrets in environment/secret manager only; never in prompts, code or Git.
- Validate file size, actual MIME/signature, extension, safe filename/path and storage permissions.
- Rate-limit login, upload, external AI calls and public verification endpoints.
- Use request IDs and structured logs.
- Do not put raw private content in error logs.
- Redact PII before sending external LLM requests where appropriate; preserve original stored submission unchanged.
- Treat PDF/DOCX/OCR/user content as untrusted input and possible prompt injection.
- No agent may have a write tool for approvals/rules/exceptions.
- Keep AI provider response/output and prompt versions for audit with appropriate privacy retention.
- Define retention and deletion policy for assets and user data.
- Create database and file-storage backup procedure.
- Separate `/health` (liveness) from `/ready` (database/services readiness).
- If LLM/OCR/embedding service is unavailable, surface a clear warning and preserve deterministic fallback where possible.

---

# 12. Testing and acceptance matrix

## 12.1 Core rule engine

- Violation/compliant/unknown outcomes.
- Rule scope and date boundaries.
- Exception scope/date/condition/revocation.
- Inactive/future/expired rules.
- Same input produces same result.

## 12.2 VisualGuard

- Known poster text and bounding boxes.
- Correct logo fixture.
- Wrong logo fixture.
- Low-confidence logo -> human review.
- Known palette and out-of-tolerance colour.
- Contrast boundary fixtures.
- Blank image, no-text image, corrupt file, oversized file.
- OCR model unavailable -> visible failed/unknown state.

## 12.3 Evidence Intelligence

- Paraphrased claim retrieves correct passage.
- No relevant passage -> no fabricated citation.
- Fake passage ID rejected.
- Quote not present -> rejected.
- Inactive rule not cited as active policy.
- Malformed JSON rejected.
- Prompt injection inside content ignored.
- No LLM key -> deterministic results still appear.

## 12.4 Sentinel

- One rule change creates tasks for exactly affected versions.
- Repeated scans create no duplicates.
- Unaffected versions untouched.
- Expired/revoked exception triggers reassessment.
- Creator sees only assigned/permitted tasks.
- Resolution requires reassessment/verification as configured.

## 12.5 RBAC/security

- Every sensitive endpoint tested for Creator and Manager.
- Direct URL/API access cannot bypass role guards.
- Creator cannot activate rules or decide exceptions.
- Manager cannot see another workspace's records.
- File download checks permission.
- Rate limits and session expiry handled.

## 12.6 Frontend and E2E

- Each of 21 routes loads and refreshes.
- Sidebar active state correct.
- Each visible button/action tested.
- Forms validate required fields.
- Filters/search/pagination work.
- Loading/empty/error/success/permission states work.
- Duplicate click does not create duplicate records.
- Mobile and desktop checks.

## 12.7 Complete end-to-end journey

1. Creator logs in.
2. Creates campaign content and uploads poster.
3. VisualGuard produces stored analysis.
4. Evidence Intelligence retrieves and validates source evidence.
5. Creator submits immutable version.
6. Manager sees it in Review Queue.
7. Manager requests changes or approves exact version.
8. Creator sees decision/notification.
9. Approved version appears in Approved Content.
10. Manager simulates rule change without mutation.
11. Manager activates new rule.
12. Sentinel creates idempotent reassessment tasks.
13. Creator submits resolution.
14. New review is completed and audit events are present.

Run and report actual commands/output, not invented counts. Typical commands include:

```bash
pytest -q
npm run build
npm run test
npx playwright test
```

Adjust commands to the actual repository scripts.

---

# 13. Official GitHub repositories and technology references

These are recommended starting points. Before installation, check current release, Python/Node/PostgreSQL compatibility, dependencies, model card, weight licence and commercial-use terms. A repository URL is not a guarantee that every model weight or dependency has the same licence.

## Core backend/database

- FastAPI: https://github.com/fastapi/fastapi
- SQLAlchemy: https://github.com/sqlalchemy/sqlalchemy
- Alembic: https://github.com/sqlalchemy/alembic
- Pydantic: https://github.com/pydantic/pydantic
- PostgreSQL: https://github.com/postgres/postgres
- pgvector: https://github.com/pgvector/pgvector
- APScheduler: https://github.com/agronholm/apscheduler

## Frontend and testing

- React: https://github.com/facebook/react
- Vite: https://github.com/vitejs/vite
- React Router: https://github.com/remix-run/react-router
- TanStack Query: https://github.com/TanStack/query
- Playwright: https://github.com/microsoft/playwright
- Lucide: https://github.com/lucide-icons/lucide

## OCR, vision and documents

- RapidOCR: https://github.com/RapidAI/RapidOCR
- PaddleOCR (alternative): https://github.com/PaddlePaddle/PaddleOCR
- OpenCV: https://github.com/opencv/opencv
- Pillow: https://github.com/python-pillow/Pillow
- PyMuPDF: https://github.com/pymupdf/PyMuPDF
- python-docx: https://github.com/python-openxml/python-docx

## Embeddings, retrieval and evaluation

- FlagEmbedding / BGE: https://github.com/FlagOpen/FlagEmbedding
- pgvector: https://github.com/pgvector/pgvector
- Ragas: https://github.com/vibrantlabsai/ragas

## AI agents and privacy

- PydanticAI: https://github.com/pydantic/pydantic-ai
- LangGraph (alternative, not required if using PydanticAI): https://github.com/langchain-ai/langgraph
- Presidio: https://github.com/microsoft/presidio
- MCP Python SDK (optional external tool interface): https://github.com/modelcontextprotocol/python-sdk

## Optional vision-language model

- Qwen3-VL: https://github.com/QwenLM/Qwen3-VL

Use a hosted or local model only after checking inference resources. Qwen3-VL is optional and not required for the deterministic/OCR baseline.

## Licensing notes

- RapidOCR repository indicates Apache-2.0 source code; check the model artifacts' provenance/licence notices separately.
- PaddleOCR repository indicates Apache-2.0; verify any separately downloaded model artefacts.
- TanStack Query repository indicates MIT.
- Confirm each package and each model weight licence before shipping. Keep `THIRD_PARTY_NOTICES.md` and `MODEL_CARDS_AND_LICENSES.md`.

---

# 14. Environment variables and configuration

Use `.env.example` with placeholders only; never commit secrets.

Suggested variables (align names with existing code):

```dotenv
APP_ENV=development
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/precedent
JWT_SECRET=replace-with-generated-secret
JWT_EXPIRE_MINUTES=30
UPLOAD_DIR=./data/uploads
MAX_UPLOAD_MB=20
OCR_ENGINE=rapidocr
OCR_LANGS=eng
EMBEDDING_MODEL=BAAI/bge-m3
VECTOR_DIMENSION=verify-from-selected-model
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
LLM_TIMEOUT_SECONDS=20
LLM_DAILY_CALL_LIMIT=100
SENTINEL_CRON=0 2 * * *
FRONTEND_ORIGIN=http://localhost:5173
```

- `OCR_LANGS` must reflect supported languages/model files that are actually installed and tested.
- Verify vector dimension from selected embedding model before migrations.
- Use a locally generated random secret for development and a secret manager/strong secret in production.
- Do not make external AI calls unless an approved API key is configured.

---

# 15. Repository folder structure (target, adapt to actual repo)

```text
precedent/
  frontend/
    src/
      api/
      app/
      layouts/
      routes/
      components/shared/
      components/creator/
      components/manager/
      features/creator-dashboard/
      features/new-content/
      features/my-submissions/
      features/ai-review/
      features/guidelines/
      features/exceptions/
      features/sentinel-tasks/
      features/notifications/
      features/approved-content/
      features/profile/
      features/manager-overview/
      features/review-queue/
      features/all-submissions/
      features/rules-conflicts/
      features/rule-impact-sandbox/
      features/sentinel-monitoring/
      features/asset-library/
      features/analytics/
      features/audit-history/
      hooks/
      schemas/
      types/
  backend/
    app/
      main.py
      config.py
      db.py
      security.py
      permissions.py
      models/
      schemas/
      routers/
      services/
        submissions/
        guidelines/
        rules/
        exceptions/
        audit/
        notifications/
        visual/
        semantic/
        sentinel/
        agents/
      engine/
      workers/
      errors.py
    alembic/
    tests/
  docs/
    ui-reference/
    IMPLEMENTATION_GAP_REPORT.md
    UI_REFERENCE_MAPPING.md
    ARCHITECTURE.md
    API.md
    SECURITY.md
    TEST_REPORT.md
    RELIABILITY_CHECKLIST.md
    LIMITATIONS.md
    ROADMAP.md
  data/                 # ignored by git; local development only
  docker-compose.yml
  .env.example
  README.md
  DESIGN.md
  THIRD_PARTY_NOTICES.md
  MODEL_CARDS_AND_LICENSES.md
```

Do not force this structure if the project already has a clean structure. Document any variation.

---

# 16. Definition of Done - per feature

A feature is `DONE` only when all of these are true:

- [ ] Correct role and route.
- [ ] Page closely matches its corresponding PNG reference.
- [ ] Frontend action is wired to a real API.
- [ ] Backend endpoint validates request and response.
- [ ] Database data persists and is correctly scoped.
- [ ] Loading, empty, error, success and permission states work.
- [ ] RBAC tested on backend.
- [ ] Important action writes audit event.
- [ ] AI/ML runs if required, and service errors are visible.
- [ ] Model/prompt/source traceability stored where applicable.
- [ ] Unit/integration/E2E tests pass.
- [ ] No hardcoded dashboard metrics or fake success responses.
- [ ] Docs and limitations updated.

Use these statuses in `FEATURE_IMPLEMENTATION_MATRIX.md`:

- `PASS` - implemented and verified with test evidence.
- `FAIL` - implemented but broken or test failure.
- `PARTIAL` - only part of the acceptance criteria works.
- `BLOCKED` - dependency/credential/hardware prevents verification.
- `NOT_IMPLEMENTED` - no working feature yet.

Do not count `BLOCKED`, `PARTIAL` or `NOT_IMPLEMENTED` as complete.

---

# 17. Required coding-agent execution prompt

Paste this instruction after adding `DESIGN.md` to the existing repo:

```text
Read DESIGN.md completely and inspect the existing repository before editing.
The supplied 21 PNG screenshots are binding UI references: 10 Creator pages and 11 Brand Manager pages. Build exactly two role-based workspaces and wire all 21 routes to real backend APIs and persisted database records.

Work backend-first: baseline audit -> migrations/core data models -> RBAC/auth -> deterministic rule engine -> VisualGuard -> Evidence Intelligence -> Sentinel -> controlled five-agent Review Crew -> frontend API wiring -> E2E tests -> deployment/docs.

For every feature C01-C10 and M01-M11, implement the frontend behaviour, backend service, API contract, database persistence, permissions, audit and tests stated in DESIGN.md. Preserve existing working functionality and design. Do not replace supplied UI references with generic templates.

Do not fabricate data, model output, citation status, health checks, analytics or test results. AI is advisory; deterministic rules decide; humans approve. Agents are read-only/draft-only and may never approve, reject, activate rules or grant exceptions. Simulations must not mutate live records. Sentinel must be idempotent.

After each phase, update docs/FEATURE_IMPLEMENTATION_MATRIX.md with file paths, endpoint, database table, tests and PASS/FAIL/PARTIAL/BLOCKED/NOT_IMPLEMENTED. Run the tests and build; report exact command output. Continue implementing rather than stopping after a plan. If a feature cannot be completed, leave it clearly unimplemented, explain the blocker and do not expose a fake working UI.
```

---

# 18. Final deliverables

The completed repository must include:

1. Both working post-login dashboards.
2. All 21 reference-matched pages.
3. Role-specific route and API protection.
4. Real CRUD and persisted database operations.
5. VisualGuard A1 working on actual uploaded images.
6. Evidence Intelligence A2 with verified source citations.
7. Sentinel A3 with idempotent reassessment and notifications.
8. Five controlled, observable AI agents if agent scope is enabled.
9. API documentation/OpenAPI.
10. Database migrations and seed/reset scripts.
11. Automated tests and actual test report.
12. README with clean-clone setup.
13. Security and model/licence notices.
14. Known limitations and roadmap.
15. Deployment configuration and health/readiness checks.

**Final product test:** A judge must be able to log in as a Creator, create and analyse content, submit it, log in as a Brand Manager, review and decide on the exact version, activate a simulated rule change, see Sentinel reassessment tasks, and verify the full history without help from the development team.

---

# 19. External source references

Official repository pages and current project descriptions used when selecting the recommended stack:

- RapidOCR: https://github.com/RapidAI/RapidOCR
- RapidOCR model licence notes: https://rapidai.github.io/RapidOCRDocs/main/en/model_licenses/
- PaddleOCR: https://github.com/PaddlePaddle/PaddleOCR
- OpenCV: https://github.com/opencv/opencv
- PyMuPDF: https://github.com/pymupdf/PyMuPDF
- FlagEmbedding: https://github.com/FlagOpen/FlagEmbedding
- pgvector: https://github.com/pgvector/pgvector
- PydanticAI: https://github.com/pydantic/pydantic-ai
- APScheduler: https://github.com/agronholm/apscheduler
- TanStack Query: https://github.com/TanStack/query
- Ragas: https://github.com/vibrantlabsai/ragas
- Playwright: https://github.com/microsoft/playwright
- Presidio: https://github.com/microsoft/presidio

Always check the current README, release notes, package compatibility, model card and licences before installing. Model weights and code can have different licence/usage terms.

---

**END OF DESIGN.md**
