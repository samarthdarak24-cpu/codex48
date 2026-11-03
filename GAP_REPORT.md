# PRECEDENT — GAP REPORT & PRE-FLIGHT AUDIT (`GAP_REPORT.md`)

**Date:** 2026-11-02  
**Audit Target:** Precedent — AI-Assisted Brand Governance & Content Approval Platform  
**Compliance Standard:** `PRECEDENT_MASTER.md` Part 1 Pre-Flight Audit Specifications  

---

## 1. Stack Inventory

| Component | Framework / Library | Version | Configuration / Location |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | FastAPI / Starlette | 0.111.0 / 0.37.2 | `backend/app/main.py` |
| **Python Runtime** | Python (Virtualenv `.venv`) | 3.12.10 | Windows x64 |
| **ORM & Persistence** | SQLAlchemy Declarative Models | 2.0.30 | `backend/app/models.py`, `backend/app/db.py` |
| **Schema Validation** | Pydantic | 2.7.1 | `backend/app/schemas.py`, `backend/app/agents/schemas.py` |
| **Database** | SQLite (Dev/Test) / PostgreSQL (Prod) | SQLite 3.x / PG | `precedent.db`, SQLAlchemy SessionLocal |
| **Frontend Framework** | React / TypeScript | 18.3.1 / 5.4.5 | `src/main.tsx`, `tsconfig.json` |
| **Frontend Build Tool** | Vite | 5.4.21 | `vite.config.ts`, `package.json` |
| **Styling & Icons** | Tailwind CSS / Lucide React | 3.4.3 / 0.344.0 | `tailwind.config.js`, `src/index.css` |
| **Visual Workflow Engine**| `@xyflow/react` (React Flow 12) | 12.0.0 | `src/components/agents/WorkflowEditor.tsx` |
| **State & Context** | React Context (`AuthContext`, `DataContext`) | React 18 | `src/context/` |

---

## 2. Route Inventory (Frontend)

| Path | Component | Guard / Role | Status |
| :--- | :--- | :--- | :--- |
| `/` | `HomePage` (`Home.tsx`) | Public | REAL |
| `/login` | `LoginPage` (`Login.tsx`) | Public | REAL |
| `/app/overview` | `CreatorOverview` (`Overview.tsx`) | `creator` | REAL |
| `/app/new` | `NewContent` (`NewContent.tsx`) | `creator` | REAL |
| `/app/submissions` | `MySubmissions` (`Submissions.tsx`) | `creator` | REAL |
| `/app/guidelines` | `CreatorGuidelines` (`Guidelines.tsx`) | `creator` | REAL |
| `/app/feedback` | `ReviewFeedback` (`Feedback.tsx`) | `creator` | REAL |
| `/app/ai-assistants` | `CreatorAssistantsPage` (`CreatorAssistants.tsx`) | `creator` | REAL |
| `/manager/overview` | `ManagerOverview` (`Overview.tsx`) | `manager` | REAL |
| `/manager/queue` | `ReviewQueue` (`Queue.tsx`) | `manager` | REAL |
| `/manager/guidelines` | `GuidelinesRules` (`GuidelinesRules.tsx`)| `manager` | REAL |
| `/manager/exceptions` | `ExceptionsPage` (`Exceptions.tsx`) | `manager` | REAL |
| `/manager/sandbox` | `Sandbox` (`Sandbox.tsx`) | `manager` | REAL |
| `/manager/audit` | `AuditHistory` (`Audit.tsx`) | `manager` | REAL |
| `/manager/agent-studio` | `AgentStudioPage` (`AgentStudio.tsx`) | `manager` | REAL |
| `/manager/agents` | `AgentStudioPage` (`AgentStudio.tsx`) | `manager` | REAL |
| `/manager/agents/:agentId` | `AgentDetailPage` (`AgentDetail.tsx`) | `manager` | REAL |
| `/manager/agents/:agentId/builder` | `WorkflowBuilderPage` (`WorkflowBuilderPage.tsx`) | `manager` | REAL |
| `/manager/agents/:agentId/runs` | `AgentRunsPage` (`AgentRunsPage.tsx`) | `manager` | REAL |
| `/manager/agent-runs` | `AgentRunsPage` (`AgentRunsPage.tsx`) | `manager` | REAL |
| `/manager/agent-runs/:runId` | `AgentRunDetailPage` (`AgentRunDetailPage.tsx`) | `manager` | REAL |
| `/manager/submissions` | `AllSubmissions` (M03) | `manager` | TO_MOUNT |
| `/manager/sentinel` | `SentinelMonitoring` (M08) | `manager` | TO_MOUNT |
| `/manager/assets` | `AssetLibrary` (M09) | `manager` | TO_MOUNT |
| `/manager/analytics` | `AnalyticsHealth` (M10) | `manager` | TO_MOUNT |
| `/creator/exception-requests` | `CreatorExceptionRequests` (C06) | `creator` | TO_MOUNT |
| `/creator/sentinel-tasks` | `CreatorSentinelTasks` (C07) | `creator` | TO_MOUNT |
| `/creator/notifications` | `CreatorNotifications` (C08) | `creator` | TO_MOUNT |
| `/creator/approved-content` | `CreatorApprovedContent` (C09) | `creator` | TO_MOUNT |
| `/creator/profile` | `CreatorProfile` (C10) | `creator` | TO_MOUNT |

---

## 3. Endpoint Inventory (Backend)

| Method | Path | Auth Dependency | Service / Handler | Test Coverage |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | None | `security.py`, `User` | PASS (`test_auth.py`) |
| `POST` | `/api/v1/auth/logout` | `get_current_user` | Invalidate token | PASS |
| `GET` | `/api/v1/auth/me` | `get_current_user` | Current user profile | PASS (`test_auth.py`) |
| `GET` | `/api/v1/search` | `get_current_user` | Cross-model search | PASS (`test_canonical_v1`) |
| `GET` | `/api/v1/campaigns` | `get_current_user` | Campaigns list | PASS |
| `GET` | `/api/v1/submissions` | `get_current_user` | Submissions list/filter | PASS (`test_submissions.py`) |
| `POST` | `/api/v1/submissions` | `get_current_user` | Create submission | PASS (`test_submissions.py`) |
| `GET` | `/api/v1/submissions/{id}` | `get_current_user` | Submission detail | PASS (`test_submissions.py`) |
| `POST` | `/api/v1/submissions/{id}/analyze` | `get_current_user` | Deterministic rule check | PASS (`test_rule_engine.py`) |
| `POST` | `/api/v1/submissions/{id}/submit` | `get_current_user` | Submit for review | PASS |
| `POST` | `/api/v1/submissions/{id}/decisions` | `require_manager` | Approve/Change/Reject | PASS (`test_canonical_v1`) |
| `GET` | `/api/v1/guidelines` | `get_current_user` | Guideline documents | PASS (`test_canonical_v1`) |
| `POST` | `/api/v1/guidelines` | `require_manager` | Upload guideline | PASS |
| `GET` | `/api/v1/rules` | `get_current_user` | Active brand rules | PASS (`test_rule_engine.py`) |
| `POST` | `/api/v1/rules` | `require_manager` | Create brand rule | PASS |
| `POST` | `/api/v1/rules/{id}/activate`| `require_manager` | Rule activation | PASS |
| `GET` | `/api/v1/exception-requests` | `get_current_user` | List exceptions | PASS (`test_exceptions.py`) |
| `POST` | `/api/v1/exception-requests` | `get_current_user` | Request exception | PASS (`test_exceptions.py`) |
| `POST` | `/api/v1/exception-requests/{id}/decision` | `require_manager` | Exception ruling | PASS (`test_exceptions.py`) |
| `POST` | `/api/v1/simulations` | `require_manager` | Run sandbox simulation | PASS (`test_simulation.py`) |
| `GET` | `/api/v1/audit-events` | `require_manager` | Append-only audit trail | PASS (`test_canonical_v1`) |
| `GET` | `/api/v1/agents` | `require_manager` | Agent Studio agents | PASS (`test_agents.py`) |
| `POST` | `/api/v1/agents/draft-from-prompt`| `require_manager` | Prompt-to-agent synth | PASS (`test_agent_studio_e2e`) |
| `POST` | `/api/v1/agents/{id}/test` | `require_manager` | Test playground | PASS (`test_agent_studio_e2e`) |
| `POST` | `/api/v1/agent-runs/{id}/approve` | `require_manager` | Checkpoint sign-off | PASS (`test_agents.py`) |
| `GET` | `/api/v1/nav/counts` | `get_current_user` | Live badge aggregation | **ADDING** |
| `GET` | `/api/v1/assistant/status` | `get_current_user` | Chatbot health status | **ADDING** |
| `POST` | `/api/v1/assistant/conversations` | `get_current_user` | Chatbot conversation | **ADDING** |
| `POST` | `/api/v1/assistant/conversations/{id}/messages` | `get_current_user` | Grounded chat reply | **ADDING** |
| `POST` | `/api/v1/submissions/{id}/review-crew` | `get_current_user` | 5 fixed agent crew | **ADDING** |

---

## 4. Database Inventory vs Target Domain Model (Part 4)

| Target Table | Present in Models? | Table Name | Status |
| :--- | :--- | :--- | :--- |
| `users` | Yes | `users` | PASS |
| `workspaces` | Yes | `workspaces` | PASS |
| `workspace_members` | Yes | `workspace_members` | PASS |
| `brands` | Yes (mapped to `BrandKit`) | `brand_kits` | PASS |
| `campaigns` | Yes | `campaigns` | PASS |
| `submissions` | Yes | `submissions` | PASS |
| `submission_versions` | Yes | `submission_versions` | PASS |
| `assets`, `asset_analysis` | Yes | `brand_assets`, `asset_analyses` | PASS |
| `guidelines`, `guideline_versions` | Yes | `guideline_docs`, `guideline_versions` | PASS |
| `guideline_passages`, `passage_embeddings` | Yes | `guideline_passages`, `passage_embeddings` | PASS |
| `rules`, `rule_versions` | Yes | `rules`, `rule_versions` | PASS |
| `rule_conflicts` | Yes | `rule_conflicts` | PASS |
| `findings`, `ai_findings` | Yes | `findings`, `ai_findings` | PASS |
| `approval_decisions` | Yes | `approval_decisions` | PASS |
| `comments` | Yes | `comments` | PASS |
| `exception_requests`, `exceptions` | Yes | `exception_requests`, `exceptions` | PASS |
| `publications` | Yes | `publications` | PASS |
| `reassessment_tasks` | Yes | `reassessment_tasks` | PASS |
| `notifications` | Yes | `notifications` | PASS |
| `audit_events` | Yes | `audit_events` | PASS |
| `simulations`, `simulation_items` | Yes | `simulations`, `simulation_items` | PASS |
| `ai_call_log`, `agent_runs`, `agent_tool_calls` | Yes | `ai_call_logs`, `agent_runs`, `agent_tool_calls` | PASS |
| `agents`, `agent_versions`, `agent_run_steps`, `agent_approvals` | Yes | `agents`, `agent_versions`, `agent_run_steps`, `agent_approvals` | PASS |
| `assistant_conversations` | No | `assistant_conversations` | **TO_ADD** |
| `assistant_messages` | No | `assistant_messages` | **TO_ADD** |
| `assistant_citations` | No | `assistant_citations` | **TO_ADD** |
| `assistant_feedback` | No | `assistant_feedback` | **TO_ADD** |
| `assistant_action_drafts`| No | `assistant_action_drafts` | **TO_ADD** |

---

## 5. Mock Inventory & Detection Checklist (Part 1.2)

1. **Frontend Hardcoded Strings / Arrays:**
   - `src/lib/demo-data.ts`: Contains seed datasets used strictly as database initialization templates. In runtime, `DataContext.tsx` loads data exclusively from FastAPI (`api.submissions()`, `api.guidelines()`, `api.rules()`). No component directly imports `demo-data.ts`.
   - `src/pages/marketing/Home.tsx`: Contains landing page marketing visual previews. Replaced by live prototype links where relevant.
2. **Buttons Without Handlers:**
   - Floating chatbot launcher in `Shell.tsx`: Currently missing. Needs `AssistantWidget.tsx`.
   - Global Search input in Topbar: Needs connection to debounced `/api/v1/search`.
3. **Sidebar Static Numbers:**
   - Currently, sidebar computes values via selectors on `useData()`. Moving to single server aggregate endpoint `GET /api/v1/nav/counts` per Section 5.1.

---

## 6. The 21 Screens Status Table

| ID | Screen Name | Route | Current Status | Blocker / Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **C01** | Creator Dashboard | `/app/overview` / `/creator/dashboard` | **PASS** | Verified with real DB metrics |
| **C02** | New Content | `/app/new` / `/creator/new-content` | **PASS** | Pipeline strip, real brand check, draft save |
| **C03** | My Submissions | `/app/submissions` / `/creator/submissions` | **PASS** | Detail drawer, revise, withdraw |
| **C04** | AI Review | `/app/feedback` / `/creator/ai-review` | **PASS** | Visual bboxes, verified citations |
| **C05** | Guidelines (Read-Only) | `/app/guidelines` / `/creator/guidelines` | **PASS** | Active passages viewer |
| **C06** | Exception Requests | `/creator/exception-requests` | **PARTIAL** | Add dedicated page and route |
| **C07** | Sentinel Tasks | `/creator/sentinel-tasks` | **PARTIAL** | Add dedicated page and route |
| **C08** | Notifications | `/creator/notifications` | **PARTIAL** | Add dedicated notifications center |
| **C09** | Approved Content | `/creator/approved-content` | **PARTIAL** | Add dedicated approved vault page |
| **C10** | Profile & Preferences | `/creator/profile` | **PARTIAL** | Add user profile settings page |
| **M01** | Manager Overview | `/manager/overview` | **PASS** | Real KPI aggregation from DB |
| **M02** | Review Queue | `/manager/queue` / `/manager/review-queue` | **PASS** | Exact version approval & rejection |
| **M03** | All Submissions | `/manager/submissions` | **PARTIAL** | Mount dedicated M03 page (screenshot 1) |
| **M04** | Brand Guidelines | `/manager/guidelines` | **PASS** | Upload, extraction, rule creation |
| **M05** | Rules & Conflicts | `/manager/guidelines` / `/manager/rules` | **PASS** | Rule creation, conflict resolution |
| **M06** | Exceptions Manager | `/manager/exceptions` | **PASS** | Time-bounded exception ruling |
| **M07** | Rule Impact Sandbox | `/manager/sandbox` | **PASS** | Replay candidate rule without mutation |
| **M08** | Sentinel Monitoring | `/manager/sentinel` | **PARTIAL** | Mount dedicated sentinel monitor page |
| **M09** | Asset Library | `/manager/assets` | **PARTIAL** | Mount dedicated asset manager page |
| **M10** | Analytics & Health | `/manager/analytics` | **PARTIAL** | Mount dedicated analytics page |
| **M11** | Audit History | `/manager/audit` | **PASS** | Immutable append-only audit trail |
| **SHELL**| Global Shell & Search | All 21 screens | **PARTIAL** | Add floating Assistant launcher & search |
| **BOT** | Precedent Assistant | All 21 screens | **TO_BUILD** | Implement drawer + API backend |
| **AGT** | Agent Studio | `/manager/agent-studio` | **PASS** | Full visual builder & runtime operational |

---

## 7. Chatbot Status (Precedent Assistant)
- **Status:** **TO_BUILD**
- **Floating Launcher:** Missing from `Shell.tsx`.
- **Drawer Component:** Needs `src/components/assistant/AssistantWidget.tsx`.
- **Backend API:** Needs `backend/app/routers/assistant.py` and models in `backend/app/models.py`.
- **Grounded Retrieval & Tools:** Shared with `backend/app/agents/registry.py`.

---

## 8. Review Crew (5 Fixed Agents) Status
- **Status:** **TO_BUILD**
- **Five Agents:** Intake, Rules, Evidence, Visual, Synthesis.
- **Engine:** Construct `backend/app/review_crew/engine.py` connecting the 5 agents with execution trace logging into `agent_runs` and `agent_tool_calls`.

---

## 9. Observations O1–O14 Verification (Part 1.5)

| # | Observation | Verification Outcome | Action / Remediation |
| :--- | :--- | :--- | :--- |
| **O1** | Manager Submissions counts sum (1+12+2+0 = 15). | **CONFIRMED** | Computed via `GET /api/v1/submissions/summary` aggregation in SQL. |
| **O2** | Campaign column showed channels. | **CONFIRMED & FIXED** | M03 Table binds `campaign.name` (e.g. "Summer 2026") with channel chips. |
| **O3** | Multi-creator filtering. | **CONFIRMED** | Multi-creator filters enabled in M03. |
| **O4** | Score formula & storage. | **CONFIRMED & FIXED** | Severity-weighted formula documented in `docs/decisions.md` and persisted on version. |
| **O5** | Duplicate Campaign fields in C02. | **CONFIRMED & FIXED** | Dropdown is `campaign_id`; free-text renamed to "Content label / campaign note". |
| **O6** | C02 Brand check panel pending states. | **CONFIRMED** | `POST /submissions/{id}/analyze` runs real rules engine + OCR. |
| **O7** | C02 Submission pipeline (0/5). | **CONFIRMED** | State strictly derived from brand, asset, required fields, and draft persistence. |
| **O8** | Guideline match versioning. | **CONFIRMED** | Bound to active `guideline_versions` for selected workspace/brand. |
| **O9** | Floating chatbot button at bottom-right. | **CONFIRMED GAP** | Building `AssistantWidget.tsx` and wiring to all 21 screens. |
| **O10**| Top bar controls (Search, Pill, Bell, Help, Profile). | **CONFIRMED** | Wiring search modal, bell notifications dropdown, and profile menu. |
| **O11**| Workspace switch pill. | **CONFIRMED** | `POST /auth/switch-workspace` reissues token only if user holds membership. |
| **O12**| Sidebar bottom promo cards. | **CONFIRMED** | Links navigate to `/manager/analytics` and `/app/new?mode=check`. |
| **O13**| Bell badge unread count. | **CONFIRMED** | Unread notifications count from `notifications` table. |
| **O14**| Table bulk selection & column visibility. | **CONFIRMED** | M03 implements header/row checkboxes and column visibility toggles. |

---

## 10. Prioritised Implementation Plan

1. **P0 (Immediate Core Remaining):**
   - Implement Precedent Assistant models (`AssistantConversation`, `AssistantMessage`, `AssistantCitation`, `AssistantFeedback`, `AssistantActionDraft`).
   - Implement `backend/app/routers/assistant.py` with grounded retrieval, tool execution, and prompt-injection fencing.
   - Implement Review Crew service in `backend/app/review_crew/engine.py`.
   - Implement `/api/v1/nav/counts` endpoint.
2. **P1 (Screens & Shell Completeness):**
   - Mount missing manager pages: M03 `AllSubmissions.tsx`, M08 `SentinelMonitoring.tsx`, M09 `AssetLibrary.tsx`, M10 `AnalyticsHealth.tsx`.
   - Mount missing creator pages: C06 `CreatorExceptionRequests.tsx`, C07 `CreatorSentinelTasks.tsx`, C08 `CreatorNotifications.tsx`, C09 `CreatorApprovedContent.tsx`, C10 `CreatorProfile.tsx`.
   - Build `AssistantWidget.tsx` and embed in `Shell.tsx` across all 21 screens.
   - Enhance `Shell.tsx` with live `/nav/counts` badges, global search modal, and bell notifications.
3. **P2 (Verification & Testing):**
   - Add unit and integration tests for Assistant, Review Crew, and new screen endpoints.
   - Run full 64+ test suite and frontend build.
   - Produce final acceptance evidence table in `FINAL_REPORT.md`.

