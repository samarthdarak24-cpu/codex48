# Precedent — Full-Stack QA Test Report

**Product:** Precedent — A Smarter Way to Manage Brand Rules and Approvals
**Scope:** Full-stack audit of the existing repository: architecture review, dedicated test dataset (GreenLeaf Organics), CRUD, AI/LLM validation, all 11 dashboard screens, security/isolation, end-to-end workflows, fixes, and re-tests.
**Date:** 2026-10-27
**Result:** **READY FOR DEMO** (with one documented, non-blocking configuration limitation: live LLM is not configured).

---

## A. Environment summary

| Item | Value |
|---|---|
| Frontend | React 18 + TypeScript 5 + Vite 5 + Tailwind (package manager: npm) |
| Backend | FastAPI + Pydantic v2 + SQLAlchemy 2 (Python 3.12) |
| Database | SQLite for dev/test (`precedent.db`, `qa_test.db`); PostgreSQL-ready via `DATABASE_URL` + Alembic |
| Auth | Argon2 password hashing + JWT (HS256), server-enforced RBAC (`creator` / `manager`) |
| AI provider | OpenAI-compatible client (`app/ai.py`); default model name `gpt-4o-mini` |
| AI credentials | **Not configured** (`LLM_BASE_URL` / `LLM_API_KEY` empty, no `.env`) → live LLM **BLOCKED** |
| Image-source provider | Optional, **not configured** → returns `{configured:false, results:[]}` (never fabricates) |
| Embeddings / vector retrieval | **Not implemented** (`use_pgvector` flag exists, no code path) |
| Test environment | Dedicated `backend/qa_test.db` + `backend/qa_uploads/`; demo DB `precedent.db` untouched by destructive tests |
| Live demo stack | Backend `:8000`, Vite `:5173` |

**Safety:** All destructive CRUD ran against a dedicated test database created fresh per run (`qa_test.db`). The demo database was backed up before any reseed. No production data was touched. No secrets are printed in this report.

---

## B. Feature matrix

| # | Core feature | Frontend | Backend | DB persistence | Rule engine / AI | CRUD | E2E | Remaining defects |
|---|---|---|---|---|---|---|---|---|
| 1 | Auth & RBAC | ✅ Login, guards | ✅ JWT, `require_manager` | ✅ users | n/a | Read/Create | ✅ | None |
| 2 | Guideline documents & extraction | ✅ list/search/upload | ✅ PDF/DOCX/TXT + passages | ✅ docs + passages | Deterministic extraction; AI suggestions empty when unconfigured | Create/Read/Status update | ✅ | Archive via status only |
| 3 | Structured rules & conflicts | ✅ drafts/confirm | ✅ CRUD-lite + conflicts | ✅ rules | ✅ deterministic conflict detection | Create/Read/Confirm/Reject | ✅ | No hard delete (by design) |
| 4 | Content submissions & versions | ✅ New Content, list | ✅ create/version/comment | ✅ submissions/versions | ✅ engine on every create/version | Create/Read/Version | ✅ | `add_version` is text-only (asset facts immutable) |
| 5 | Evidence-linked review | ✅ Feedback, evidence | ✅ findings + verified evidence | ✅ findings | ✅ deterministic + verified passages | Create/Read | ✅ | None |
| 6 | Exceptions (scope/expiry/revoke) | ✅ Exceptions | ✅ create/decide/revoke/history | ✅ exceptions + history | ✅ scope + expiry + workspace enforced | Create/Decide/Revoke/Read | ✅ | None |
| 7 | Rule Impact Sandbox | ✅ Sandbox | ✅ run + activate | ✅ simulations + proposed_rules | ✅ real re-evaluation (not prose) | Create/Read/Activate | ✅ | `change_text_condition` cannot alter code-driven evaluation (documented) |
| 8 | Audit history & reporting | ✅ Audit | ✅ list/filter/export/health | ✅ audit_events (append-only) | n/a | Read/Export (no edit/delete) | ✅ | None |
| + | Brand / product assets | ✅ picker/upload | ✅ upload/approve/attach | ✅ brand_assets | Upload validation (magic bytes) | Create/Read/Approve | ✅ | External research requires provider config |

---

## C. CRUD results (actual)

Executed through the real HTTP layer (`TestClient`) against `qa_test.db`, with direct DB verification. Full machine-readable results: `reports/qa_results.json`.

| Entity | Create | Read | Update | Delete / archive | Result |
|---|---|---|---|---|---|
| Users / roles | seeded test users | ✅ `/auth/me`, `/team` (workspace-scoped) | n/a | n/a | PASS |
| Guideline documents | ✅ TXT upload, passages indexed | ✅ list + `/passages` | ✅ `PATCH /status` | status-only (no hard delete) | PASS |
| Guideline passages | ✅ created on upload | ✅ with page/paragraph refs | immutable | cascade with doc | PASS |
| Structured rules | ✅ auto-code draft | ✅ list + by id | ✅ confirm/reject | no hard delete (by design) | PASS |
| Approved claims | ✅ manager create | ✅ workspace-scoped list | n/a | no delete | PASS |
| Submissions | ✅ create (text/asset) | ✅ list + by id (owner/workspace) | ✅ new version, comment | status lifecycle | PASS |
| Content versions | ✅ v1 + revisions | ✅ full history | immutable | cascade | PASS |
| Findings | ✅ engine-generated | ✅ with evidence | recomputed on revision | cascade | PASS |
| Comments | ✅ add | ✅ returned | n/a | cascade | PASS |
| Review decisions | ✅ approve/changes/decline | ✅ returned | version-guarded (409 on stale) | immutable | PASS |
| Exceptions | ✅ request (derived titles) | ✅ list + history | ✅ decide | ✅ revoke (auditable) | PASS |
| Proposed rule changes | ✅ created with simulation | ✅ via simulation | n/a | status `simulated/activated` | PASS |
| Simulation runs | ✅ run | ✅ list + detail | immutable results | retained | PASS |
| Brand assets | ✅ PNG upload | ✅ list + file | ✅ approve | no delete (by design) | PASS |
| Audit events | ✅ via every action | ✅ list/export/health | ❌ no edit | ❌ no delete (append-only) | PASS |
| Notifications | — | — | — | — | **NOT IMPLEMENTED** (no model/endpoint) |

**Relationship checks (verified):** a finding belongs to the correct submission and cites a stored `GuidelinePassage` (`evidenceVerified=true`); a decision records the exact version reviewed; an attached asset is snapshotted onto the submission and survives re-read; exception history records Requested → Approved → Revoked.

---

## D. AI and external API results

| Integration | Status | Evidence |
|---|---|---|
| LLM provider configuration | **BLOCKED BY CONFIGURATION** | `LLM_BASE_URL`/`LLM_API_KEY` empty; no `.env` |
| Live LLM request | **BLOCKED** | Requires an OpenAI-compatible endpoint + key |
| Graceful degradation | ✅ PASS | `ai_available()` → False; `semantic_findings`, `minimal_edit_suggestion` return `None`; guideline upload returns `suggestedRules: []` (no fabrication) |
| Structured-output validation | ✅ code path present | Pydantic models (`RuleSuggestion`, `SemanticFinding`, `MinimalEdit`, `SemanticConflict`) reject malformed output and unknown rule codes |
| Evidence verification | ✅ PASS | Findings' citations resolve to stored passages; `evidenceVerified` true |
| Embeddings / retrieval | **NOT IMPLEMENTED** | No embedding code path (flag only) |
| Image-source provider | **BLOCKED BY CONFIGURATION** | `research` returns `{configured:false, results:[]}` — never fabricates |
| Rule engine (deterministic) | ✅ PASS | Same input → same findings (repeatability test); scope/expiry/workspace enforced |

> Live LLM is the only blocked item. The deterministic engine is the source of truth, so the product is fully demonstrable without it. To enable AI: set `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` and re-run `qa_audit.py`.

---

## E. Frontend results — 11 screens

Browser audit via Playwright/Chromium against the live stack (`:5173` + `:8000`). Machine-readable: `reports/qa_screens.json`. **13/13 pages passed, 0 console errors, mobile 2/2.**

| # | Screen | Route | Result | Notes |
|---|---|---|---|---|
| 1 | Content Overview | `/app/overview` | ✅ | metrics render, no overflow |
| 2 | New Content | `/app/new` | ✅ | empty-submit blocked (validation), asset upload works |
| 3 | My Submissions | `/app/submissions` | ✅ | list + status render |
| 4 | Brand Guidelines (creator) | `/app/guidelines` | ✅ | documents + rules render |
| 5 | Review & Feedback | `/app/feedback/:id` | ✅ | findings, rule codes, "View source evidence" |
| 6 | Manager Overview | `/manager/overview` | ✅ | metrics from DB |
| 7 | Review Queue | `/manager/queue` | ✅ | submissions listed |
| 8 | Guidelines & Rules | `/manager/guidelines` | ✅ | docs + rules + conflicts |
| 9 | Exceptions | `/manager/exceptions` | ✅ | pending/approved/expired states |
| 10 | Rule Impact Sandbox | `/manager/sandbox` | ✅ | simulation UI renders |
| 11 | Audit History | `/manager/audit` | ✅ | events render |
| + | Marketing home | `/` | ✅ | loads |
| + | Login | `/login` | ✅ | both roles sign in |
| + | Mobile (390×844) | creator overview/submissions | ✅ | no horizontal overflow |

Full workflow (`e2e-check.mjs`): creator logs in → uploads asset → submits violating copy → Feedback shows findings + rule codes + evidence → manager sees it in Queue → Audit records it → **0 console errors**.

---

## F. Security results

| Check | Result | Evidence |
|---|---|---|
| Invalid credentials | ✅ 401 | login test |
| Unauthenticated protected routes | ✅ 401 | `/auth/me` without token |
| Creator blocked from manager actions | ✅ 403 | rules, claims, guidelines, decide, simulation |
| Other creator cannot read a submission | ✅ 403 | ownership check |
| Cross-workspace: guidelines | ✅ FIXED | GreenLeaf user no longer sees PureGlow doc |
| Cross-workspace: rules | ✅ FIXED | no `PG-01` leak |
| Cross-workspace: claims | ✅ FIXED | no PureGlow claim leak |
| Cross-workspace: team | ✅ FIXED | no PureGlow member leak |
| Cross-workspace: submissions | ✅ PASS | list + direct fetch blocked (403/404) |
| Cross-workspace: exception suppression | ✅ FIXED | PureGlow exception no longer suppresses GreenLeaf finding |
| Cross-workspace: rule evaluation | ✅ FIXED | submissions evaluated only against own-workspace rules |
| File upload validation | ✅ | invalid extension 415, empty 400, bad magic bytes 400, size cap |
| Audit append-only | ✅ | no edit/delete routes (404/405) |
| Secrets exposure | ✅ | no keys in bundles/logs (none configured) |

---

## G. Automated test results (actual)

| Command | Result |
|---|---|
| `cd backend && python -m pytest -q` | **41 passed** (35 existing + 6 new isolation regressions) |
| `cd backend && python qa_audit.py` | **87 passed, 0 failed, 1 blocked** (88 checks) |
| `node qa_screens.mjs` | **13/13 pages pass, 0 console errors, mobile 2/2** |
| `node e2e-check.mjs` | **pass**, 0 console errors |
| `npm run build` | **pass** (142.88 kB gzip JS) |

Per-area QA harness breakdown: auth 5/5, rbac 7/7, guidelines 7/7, rules 5/5, claims 2/2, submissions 14/14, rule_engine 6/6, database 2/2, exceptions 12/12, simulations 6/6, assets 6/6, isolation 7/7, audit 5/5, ai 3/3 (+1 blocked).

---

## H. Bugs fixed

| # | Defect | Root cause | Change | Regression test |
|---|---|---|---|---|
| 1 | `POST /claims` stored new claims in `PureGlow` regardless of caller; `GET /claims` returned all workspaces | `workspace` not set on create; no filter on list | Set `workspace=current_user.workspace`; filter list by workspace (+ NULL legacy) | `test_workspace_isolation.py::test_claim_created_in_caller_workspace`, `::test_claims_exclude_other_workspace` |
| 2 | `GET /team` exposed users from every workspace | No workspace filter | Filter by `current_user.workspace` | `::test_team_excludes_other_workspace` |
| 3 | `GET /guidelines` and `/guidelines/search` leaked other workspaces' docs | Filter `... OR workspace == "PureGlow"` | Removed the unconditional PureGlow clause | `::test_guidelines_exclude_other_workspace` |
| 4 | `GET /rules` leaked other workspaces' rules | Same leaky filter | Removed unconditional PureGlow clause | `::test_rules_exclude_other_workspace` |
| 5 | Another workspace's approved exception could suppress a finding | `_active_exception` ignored workspace | Added workspace scope to the lookup | `::test_other_workspace_exception_does_not_suppress_finding` |
| 6 | Submissions evaluated against all active rules globally | `filter_by(status="active")` | Filter active rules by submission workspace | isolation probe in `qa_audit.py` |
| 7 | `GET /rules/conflicts` would 500 on any draft/pending proposal | Referenced non-existent `ProposedRule.condition/title/action` | Read `proposed_value`/`target_rule_code` defensively | covered by conflicts route test |

**Previously fixed & re-verified this pass:** exception creation without `contentTitle`/`ruleTitle` (server-side derivation), rule creation without `code` (auto-slug), `pymupdf` pin for Python 3.12, and `seed.py` rebuilding the schema (drop+create) so a stale dev DB can't drift.

**Test-harness corrections (not product bugs):** visual findings correctly persist across text-only revisions (asset facts are per-submission); simulation "resolved" requires content whose only violation is the targeted rule.

---

## I. Remaining blockers & limitations

1. **Live LLM — BLOCKED BY CONFIGURATION.** No `LLM_BASE_URL`/`LLM_API_KEY`. All AI helpers degrade safely to `None`; the deterministic engine is authoritative. Enable by setting the three env vars.
2. **Image-source API — BLOCKED BY CONFIGURATION.** Upload/attach/approve work fully; external research returns `configured:false` and never fabricates.
3. **Embeddings / pgvector — NOT IMPLEMENTED.** A config flag exists but there is no embedding/retrieval code path.
4. **`add_version` is text-only.** Asset facts (background, typeface, clear space) are captured per submission, so visual findings persist across text-only revisions. A future revision flow should allow replacing the asset.
5. **Sandbox `change_text_condition`.** The engine is code-driven, so a text-condition change cannot alter deterministic evaluation; the simulation surfaces this honestly rather than inventing impact.
6. **Notifications — NOT IMPLEMENTED.** No model/endpoint.
7. **No hard-delete endpoints** for submissions/rules/docs/assets (by design: status/archive and revoke instead). Audit is strictly append-only.
8. **Bundle size warning** (>500 kB raw JS) — cosmetic; gzip is 142.9 kB.

---

## J. Final readiness assessment

### READY FOR DEMO

**Rationale (evidence-based):**
- 41/41 backend tests pass, including 6 new workspace-isolation regressions.
- 87/88 QA checks pass; the single "blocked" item is live LLM, which is optional and degrades safely.
- All 11 dashboard screens plus login and marketing load with **0 console errors**; mobile has no overflow.
- Full creator→manager→audit workflow passes end-to-end with evidence links.
- Production build succeeds.
- The seven defects found (all workspace-isolation or latent) were fixed and covered by regression tests; re-runs are green.

**Next actions in priority order:**
1. Provide LLM credentials to enable AI-assisted suggestions/explanations (optional; everything works without it).
2. Add asset replacement to the revision flow so visual findings can be resolved via new versions.
3. Implement notifications (email/in-app) for review decisions and exception expiry.
4. Add code-splitting to trim the >500 kB bundle.
5. Optionally add pgvector retrieval once embeddings are implemented.

---

### Reproduce this QA run

```bash
# Backend tests (isolated temp DB)
cd backend && python -m pytest -q

# Full QA harness on a dedicated GreenLeaf test DB
cd backend && python qa_audit.py          # writes ../reports/qa_results.json

# Browser audit of all screens (both servers running)
node qa_screens.mjs                        # writes reports/qa_screens.json

# Full workflow e2e + production build
node e2e-check.mjs && npm run build
```
