# PRECEDENT — API Integration Report

**Date:** 2026-11-02
**Base URL:** `http://127.0.0.1:8000`
**OpenAPI:** `/openapi.json` → **181 paths, 204 operations** across 21 router modules
**Method:** every endpoint listed below was called with a real request during the audit.

---

## 1. Surface area

| Tag | Operations |
|---|---|
| `agent-studio` | 48 |
| `proofpass` | 18 |
| `submissions` | 13 |
| `sentinel` | 12 (+7 alias) |
| `rules` | 10 |
| `assets` | 8 |
| `auth` | 7 (+4 alias) |
| `guidelines` | 7 |
| `exceptions` | 7 |
| `Creator` | 7 |
| `visualguard` | 6 |
| `evidence` | 6 |
| `analytics` | 4 (+3 alias) |
| `review-crew` | 4 |
| `notifications` | 4 |
| `Manager` | 4 |
| `publications` | 3 (+3 alias) |
| `Brand Kit` | 2 |
| `Shared` | 3 |
| untagged | 19 |

The `agent-studio` router is mounted twice — at `/` and `/api/v1` — so both prefixes work.

## 2. Contract conventions

| Convention | Rule |
|---|---|
| Field naming | Responses are **camelCase** (`complianceScore`, `ruleCode`, `createdAt`) |
| Errors | `{code, message, detail, details, request_id}` |
| Auth | `Authorization: Bearer <jwt>` from `POST /auth/login` → `{token, user}` |
| Workspace | Every read/write filtered by `user.workspace`; cross-workspace → **404** |
| Roles | `require_manager` for governance writes; creators can read their own rows |

## 3. Endpoints exercised end-to-end

### Auth
| Method | Path | Result |
|---|---|---|
| POST | `/auth/login` | 200 → `{token, user}` |
| GET | `/auth/me` | 200 → user; 401 on a stale token (session is dropped) |

### Submissions
| Method | Path | Result |
|---|---|---|
| GET | `/submissions` | 200 → 15 rows (workspace-scoped, creator-scoped) |
| GET | `/submissions?status=Approved` | 200 → **1** row |
| GET | `/submissions?status=Pending` | 200 → **12** rows |
| GET | `/submissions?search=summer` | 200 → **1** row |
| GET | `/submissions/{id}` | 200 → full camelCase payload incl. `scoreBreakdown`, `versionSnapshots` |
| POST | `/submissions` | 200 → creates row + v1 + findings + score |
| POST | `/submissions/{id}/versions` | 200 → v2 + snapshot + manager notification |
| POST | `/submissions/{id}/decide` | 200 → status + decision + creator notification |

> **Fixed in this audit:** `/submissions` previously ignored every query parameter, so
> `?status=Approved` returned all 15 rows. Filters are now applied in SQL.

### Rules
| Method | Path | Result |
|---|---|---|
| GET | `/rules` | 200 → 19 rows |
| POST | `/rules` | 201 → creates as `needs_confirmation` |
| POST | `/rules/{id}/confirm` | 200 → `active` |
| POST | `/rules/{id}/deactivate` | 200 |
| GET | `/rules/conflicts` | 200 → `[]` (no open conflicts) |

> **Fixed:** codes were globally unique, so `CL-04` could not exist in a second workspace.
> Uniqueness is now `(workspace, code)`.

### VisualGuard / analysis
| Method | Path | Result |
|---|---|---|
| POST | `/analysis/upload` | 200 → schedules the background pipeline |
| GET | `/analysis/submission/{id}` | 200 → `status`, `ocrText`, `textBlocks`, `hasFile`, **and `submission`** |
| GET | `/analysis/{id}/file` | 200 → image bytes; 404 only when the file is genuinely gone |
| POST | `/analysis/{id}/rerun` | 200 |

> **Fixed:** this endpoint returned no findings, so a client polling for review results saw
> zero. It now includes the submission (findings + score).

### Guidelines, exceptions, sentinel, assets, analytics, audit
| Method | Path | Result |
|---|---|---|
| GET | `/guidelines` | 200 → 3 docs |
| GET | `/exceptions` | 200 → 4 rows |
| GET | `/sentinel/tasks` | 200 → 3 rows |
| GET | `/assets` | 200 → 10 rows |
| GET | `/analytics` | 200 → 14 metrics |
| GET | `/analytics/trends` | 200 → 5 points |
| GET | `/audit` | 200 → 322 events |
| GET | `/notifications` | 200 → 1 row |

### Agent Studio
| Method | Path | Result |
|---|---|---|
| GET | `/agents/templates` | 200 → 6 templates, 7 tools each |
| POST | `/agents/draft-from-prompt` | 201 → `{agent, spec, validation, generation}` |
| POST | `/agents/{id}/validate` | 200 → `{ok:true, errors:[], nodeCount, toolCount}` |
| POST | `/agents/{id}/publish` | 200 → `{agent:{status:"published"}}` |
| POST | `/agents/{id}/execute` | 201 → `{run:{...}}` |
| POST | `/agent-runs/{id}/approve` | 200 → run `completed` |
| GET | `/agents/{id}/runs` | 200 → run history |
| POST | `/agents/{id}/pause` · `/resume` | 200 |
| GET | `/agents/stats` | 200 → `{totalAgents, totalExecutions, successRate, …}` |

## 4. Integration defects found and fixed

| # | Defect | Fix |
|---|---|---|
| 1 | `/submissions` ignored `status`, `search`, `brand`, `channel`, `limit` | Query parameters added and applied in SQL |
| 2 | `/analysis/submission/{id}` omitted findings | Returns `submission` alongside the analysis |
| 3 | `/analysis/{id}/file` 404'd for rows whose file was never written | Path resolved on disk; API exposes `hasFile` |
| 4 | `POST /rules` rejected codes that exist in another workspace | Collision check scoped to the workspace |
| 5 | `POST /agents/{id}/execute` returned **500** for the audit template | `generate_summary` no longer assumes `findings` is a list |
| 6 | Exception / sentinel tools hard-failed a run on missing input | `missing_input` now yields a `skipped` step with a message |
| 7 | `submission_to_dict` returned raw `region` in two shapes | Normalised to `{x,y,w,h}` |

## 5. Error handling

| Case | Observed |
|---|---|
| Unknown path | 404 JSON, not an HTML shell |
| Cross-workspace read | 404 `{"code":"not_found"}` — never 403 |
| Creator publishing an agent | 403 |
| Creator running an unpublished agent | 403 |
| Duplicate rule code **in the same workspace** | 409 |
| Stale JWT | 401 + session dropped client-side |
| Unhandled exception | 500 with `request_id` (the audit agent case, now fixed) |

## 6. Verifying the surface

```bash
curl -s http://127.0.0.1:8000/openapi.json | \
  python -c "import json,sys; d=json.load(sys.stdin); print(len(d['paths']), 'paths')"
# 181 paths
```

Interactive docs: `http://127.0.0.1:8000/docs`.
