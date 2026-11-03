# PRECEDENT — Functionality Audit (BEFORE)

**Date:** 2026-11-02
**Scope:** All 21 workspace features, both roles, backend, database, Agent Studio, chatbot.
**Method:** Executed, not inspected. Every verdict below comes from an HTTP call, a database
read, or a browser run recorded in `qa-results/`. Nothing in this file is inferred from
reading source code alone.

---

## 1. Environment under test

| Item | Value |
|---|---|
| Frontend | `http://127.0.0.1:5173` (Vite 5, React 18, TypeScript 5) |
| Backend | `http://127.0.0.1:8000` (FastAPI, SQLAlchemy 2.0, Pydantic 2) |
| Database | SQLite `backend/precedent.db` — **65 tables** |
| Routers | **21** modules mounted in `app/main.py` |
| Routes | 26 (`/manager/*` = 11 features, `/creator/*` = 10 features, plus public) |
| Auth | JWT via `/auth/login` → `{token, user}`; `sessionStorage` key `precedent.session` |
| Workspace isolation | `require_workspace()` → **404** (not 403) on cross-workspace access |
| Backend test suite | 158 tests |

## 2. Test workspace

The audit runs in an isolated workspace so it cannot disturb the PureGlow demo data:

| Item | Value |
|---|---|
| Workspace | `Precedent QA` |
| Prefix | `QA_PRECEDENT_2026` |
| Creator | `qa.creator@precedent.qa` |
| Manager | `qa.manager@precedent.qa` |
| Brand | `PureGlow QA` |

## 3. State found at the start of the audit

### 3.1 Rules could not be created in a second workspace — **FAIL**

```
POST /rules  {"code":"CL-04", ...}  →  409
{"code":"conflict","message":"Rule code 'CL-04' already exists"}
```

`Rule.code` carried a **global** `UNIQUE` index (`ix_rules_code`). `CL-03` and `CL-04`
already belonged to `PureGlow`, so the QA workspace could never own its own copy. Only
`CL-05` existed in `Precedent QA`, and it had landed as `needs_confirmation`, so it never
ran.

### 3.2 `CL-05` had no evaluator — **FAIL**

`rule_engine.evaluate_text_rule()` dispatched on `rule.code` with branches for `CL-03`,
`CL-04`, `CL-06`, `MK-02`, `TV-02`, `PA-05`. There was **no `CL-05` branch**, so a
"Substantiation Required" rule could be activated and could never fire.

### 3.3 "No. 1" was not detected — **FAIL**

`SUPERLATIVE` matched `100% safe|guaranteed|no risk|perfect|best-in-class|miracle`. The
claim `India's No. 1 Skin Care Product.` matched nothing, so `CL-04` reported clean.

### 3.4 Only the first offending phrase was reported — **FAIL**

`evaluate_text_rule()` returned a single `EngineFinding`. A poster carrying both
`No. 1` and `100% safe` produced **one** finding, so removing the first appeared to clear
the rule while the second claim stayed on the asset.

### 3.5 Uploaded posters produced zero findings and no score — **FAIL**

```
GET /analysis/submission/sub_4449e3f64b4c
  status: "complete"
  ocrText: "PureGlow Winter Promotion\nIndia's No. 1 Skin Care Product.\n100% Safe ..."
  ocrConfidence: 0.7683

findings for sub: (0,)
compliance_score: None
```

OCR worked and captured all three claims. The pipeline does call
`apply_to_submission()` → `run_rules()` → `_apply_findings()`, but with **0 active rules**
in the workspace the engine had nothing to run, so nothing was persisted. The score was
never written either: it was computed lazily inside `submission_to_dict()`, meaning a row
read directly from the table had `compliance_score = NULL`.

### 3.6 `submission_versions` was dead — **FAIL**

| Table | Rows |
|---|---|
| `content_versions` (legacy) | 19 |
| `submission_versions` (spec §5, immutable) | **0** |
| `submissions.current_version_id` | **NULL on every row** |

`app/agents/tools.py` read `SubmissionVersion`, but no code path ever wrote one. There was
no record of which rulebook reviewed a version, and no content hash proving the approved
copy never changed afterwards.

### 3.7 `/analysis/submission/{id}` never returned findings — **FAIL**

The endpoint returned `analysis_to_dict()` only. The findings it had just derived lived on
the submission, so any client polling this endpoint for results saw zero findings forever.

### 3.8 Four seeded analyses pointed at a file that does not exist — **FAIL**

```
asset_analysis.file_path = 'uploads\demo_poster_diwali.png'   (4 rows)
backend/uploads/demo_poster_diwali.png                        → No such file
```

`GET /analysis/sub_dfac9746ad2c/file` → **404**, logged as a console error on the
otherwise-healthy AI Review page.

### 3.9 Two box shapes, one of which the UI could not draw — **FAIL**

The pipeline writes `{"x","y","w","h"}`; the seed wrote corner arrays `[x1,y1,x2,y2]`.
The canvas read `.w`/`.h` off an array → `undefined` → `Math.max(NaN, 1)` is still `NaN`:

```
Warning: Received NaN for the `width` attribute.
Error: <rect> attribute width: Expected length, "NaN".
Error: <rect> attribute height: Expected length, "NaN".
```

### 3.10 Two status vocabularies for the same field — **FAIL**

The pipeline wrote `status = "complete"`; the seed wrote `"completed"`. The frontend
checked `analysis?.status === 'complete'`, so every seeded analysis silently lost its
region overlays.

### 3.11 LLM is genuinely unconfigured — **BLOCKED**

```
llm_base_url = (empty)
llm_api_key  = (empty)
llm_model    = gpt-4o-mini
```

Agent runs therefore report `"method": "lexical_only"` with an empty `tokenUsage`. This is
a configuration gap, not a code defect, and it is reported as **BLOCKED** everywhere it
applies rather than being simulated.

### 3.12 Part 9 Assistant has no backend — **NOT_IMPLEMENTED**

No `/assistant/*` endpoint exists in any of the 21 routers, and there are no conversation
tables. The floating launcher runs Agent Studio agents instead (which satisfies the
"chatbot must run agents" requirement, but is not the Part 9 conversation API).

---

## 4. Verdict summary (before fixes)

| Area | Verdict | Why |
|---|---|---|
| 21 pages render and are interactive | PASS | 22/22 routes render with content and controls |
| Creator → Manager submission loop | FAIL | Rules could not be created; uploads produced no findings |
| Compliance scoring | FAIL | Score never persisted; denominator counted other workspaces' rules |
| Immutable version history | FAIL | `submission_versions` empty, `current_version_id` NULL |
| Rule engine coverage | FAIL | `CL-05` unimplemented; `No. 1` unmatched; one finding per rule |
| AI review surface | FAIL | Findings not returned; poster 404; NaN SVG attributes |
| Agent Studio | PASS | Lifecycle, gates, runs all real |
| Chatbot → agent execution | PASS | Routing + execution produce real runs |
| LLM-assisted behaviour | BLOCKED | No base URL / key configured |
| Part 9 Assistant API | NOT_IMPLEMENTED | No endpoints, no tables |

**Failing checks at baseline: 4 of 33 E2E checks, plus 1 of 22 browser pages.**
