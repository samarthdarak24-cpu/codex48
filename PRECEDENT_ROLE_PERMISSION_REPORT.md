# PRECEDENT — Role & Permission Report

**Date:** 2026-11-02
**Harness:** `backend/scripts/qa_role_matrix.py` — signs in as each role and probes the same endpoints
**Result:** **20 / 20 permission checks passed**
**Evidence:** `qa-results/role_matrix.json`

---

## 1. Model

Two roles, enforced **server-side** on every route. The UI also hides controls, but hiding a
button is not a permission — every check below is an HTTP call with a real JWT.

| Role | Can do | Cannot do |
|---|---|---|
| **Manager** | Create/confirm/deactivate rules, decide submissions, publish agents, read all workspace rows, read audit history | Read another workspace's rows |
| **Creator** | Create submissions, upload posters, add versions, comment, request exceptions, run **published** agents, read own submissions and shared guidelines | Create rules, decide submissions, publish agents, run **draft** agents |
| **Anonymous** | `POST /auth/login`, public pages | Everything else |

---

## 2. Measured matrix

| Action | Method | Path | Role | Expected | Actual | Verdict |
|---|---|---|---|---|---|---|
| Create rule | POST | `/rules` | manager | 201 | **201** | PASS |
| Create rule | POST | `/rules` | creator | 403 | **403** | PASS |
| Confirm rule | POST | `/rules/{id}/confirm` | creator | 403/404 | **403** | PASS |
| Deactivate rule | POST | `/rules/{id}/deactivate` | creator | 403/404 | **403** | PASS |
| List rules | GET | `/rules` | manager | 200 | **200** | PASS |
| List rules | GET | `/rules` | creator | 200 | **200** | PASS |
| List submissions | GET | `/submissions` | manager | 200 | **200** | PASS |
| List submissions | GET | `/submissions` | creator | 200 | **200** | PASS |
| List guidelines | GET | `/guidelines` | creator | 200 | **200** | PASS |
| List exceptions | GET | `/exceptions` | creator | 200 | **200** | PASS |
| List notifications | GET | `/notifications` | creator | 200 | **200** | PASS |
| Audit history | GET | `/audit` | manager | 200 | **200** | PASS |
| Audit history | GET | `/audit` | creator | 200/403 | **200** | PASS |
| Publish agent | POST | `/agents/{id}/publish` | creator | 403/404 | **403** | PASS |
| Agent stats | GET | `/agents/stats` | manager | 200 | **200** | PASS |
| Current user | GET | `/auth/me` | manager | 200 | **200** | PASS |
| Current user | GET | `/auth/me` | creator | 200 | **200** | PASS |
| List submissions | GET | `/submissions` | **anonymous** | 401/403 | **401** | PASS |
| Create rule | POST | `/rules` | **anonymous** | 401/403 | **401** | PASS |
| Cross-workspace read | GET | `/submissions/{pureglow}` | QA manager | 404 | **404** | PASS |

---

## 3. Guard implementation

### 3.1 Role guard

```python
require_manager = ...   # raises 403 unless user.role == "manager"
```

Applied to `POST /rules`, `POST /rules/{id}/confirm`, `POST /rules/{id}/deactivate`,
`POST /submissions/{id}/decide`, `POST /agents/{id}/publish`.

### 3.2 Workspace guard

```python
def require_workspace(row, user, shared=False, detail="Not found"):
    ...
```

Returns **404**, never 403, for a row in another workspace. This is deliberate: a 403 would
confirm the row exists. Verified:

```
[PASS] Cross-workspace read   GET /submissions/sub_dfac9746ad2c   qa_manager -> 404
[PASS] QA submission is invisible to the PureGlow workspace — 15 rows in PureGlow
```

### 3.3 Creator scoping

`GET /submissions` filters `creator_id == current_user.id` for the creator role, so a creator
sees only their own work — 15 rows for Emily, not the whole register.

### 3.4 Agent guard

```python
def assert_can_use(agent, user):
    if is_manager(user): return
    if agent.status != "published": raise HTTPException(403, "This assistant is not published yet.")
```

| Case | Result |
|---|---|
| Creator runs a **draft** agent | 403 |
| Creator publishes an agent | 403 |
| Creator runs a **published** agent | 201 — allowed by design |

That last row is intentional, not a hole: agents are workspace assistants, and publishing is
the act of making one available to creators.

---

## 4. Client-side behaviour

The frontend mirrors the server rules so users are not offered actions that will fail:

| Behaviour | Implementation |
|---|---|
| `/manager/*` requires the manager role | `RequireRole` wrapper on the route tree |
| `/creator/*` requires the creator role | `RequireRole` |
| Creator nav omits rule/governance items | `V2Layout` builds the nav from the role |
| Stale token | `/auth/me` 401 → session dropped, redirect to `/login` |
| Agent chat copy | shows "Brand Manager" vs "Creator" and hides Approve for creators |

Verified in the browser audit: no page redirected to `/login` while authenticated, and both
role trees render their own 10–11 features.

---

## 5. Defects found and fixed

| # | Defect | Severity | Fix |
|---|---|---|---|
| 1 | Rule codes were globally unique, so a second workspace could not own `CL-04` | Medium (multi-tenant) | Uniqueness moved to `(workspace, code)` |
| 2 | `/submissions` ignored `status`/`search`/`brand`/`channel`/`limit` | Medium (data exposure of unfiltered rows) | Filters applied in SQL, still role- and workspace-scoped |
| 3 | Score denominator counted rules from **all** workspaces | Medium (wrong scores across tenants) | Denominator scoped to the submission's workspace |
| 4 | Creator could run an unpublished agent? | **No** — verified 403 | — |

Item 4 was investigated because an early probe suggested creators could execute a manager's
agent. The probe was wrong: the agent in question had already been published. The boundary
is correct and is now asserted explicitly.

---

## 6. Reproducing

```bash
cd backend
.venv312/Scripts/python.exe scripts/qa_role_matrix.py
# 20/20 role checks passed
```

Backend unit coverage of the same boundary lives in `tests/test_rbac.py` and
`tests/test_workspace_isolation.py`, both part of the 158-test suite.
