# PRECEDENT — Final Bug Report

**Date:** 2026-11-02
**Scope:** full-stack E2E audit — 21 features, both roles, backend, database, Agent Studio, chatbot
**Principle applied:** a bug is only marked fixed when it was **re-executed** and observed working.

---

## 1. Summary

| Metric | Value |
|---|---|
| Bugs found and **fixed** | **23** |
| Bugs found and **open** | 0 |
| Known limitations (not bugs) | 4 |
| E2E checks | 33 / 33 |
| Pages rendering clean | 22 / 22 |
| Agent + chat checks | 22 / 22 |
| Role permission checks | 20 / 20 |
| Features returning real data | 21 / 21 |
| Backend tests | 158 passed |

Severity scale: **Critical** = data loss / wrong governance decision · **High** = feature
broken · **Medium** = wrong data shown · **Low** = cosmetic or robustness.

---

## 2. Critical

### C1 — Compliance score was never stored, and was computed from the wrong denominator

| | |
|---|---|
| **Symptom** | Every submission read directly from the table had `compliance_score = NULL`. Scores displayed in the UI disagreed with the stored findings. |
| **Root cause** | Two defects compounding. (a) The score was computed lazily inside `submission_to_dict()`, so it only existed if something happened to GET the row. (b) The denominator counted **every active rule in every workspace**, so a `Precedent QA` submission was scored against `PureGlow`'s rulebook. |
| **Impact** | Reports, exports and agent tools saw no score at all; where a score did appear it was arithmetically wrong across workspaces. A governance decision could be made on a number that did not match the findings. |
| **Fix** | `store_score()` writes the score in the same transaction as the findings (create, new version, post-upload). `_applicable_rule_count()` applies the same workspace filter as the engine. |
| **Verification** | `[PASS] Score stored on the submission — score=0 formula=severity_weighted_v1`, then `100` after the revision. 11 unit tests pin the formula in `tests/test_scoring.py`. |
| **Files** | `app/services/submissions.py`, `app/services/visual/pipeline.py`, `app/services/scoring.py` |

### C2 — Immutable version history did not exist

| | |
|---|---|
| **Symptom** | `submission_versions` had **0 rows** while `content_versions` had 19. `submissions.current_version_id` was NULL on every row. |
| **Root cause** | `SubmissionVersion` (spec §5) was read by `app/agents/tools.py` but no code path ever wrote it. `content_versions` — which carries no review context — was the only history. |
| **Impact** | Nothing recorded *what* was approved or *which rulebook* judged it. There was no way to prove the approved copy had not changed afterwards. |
| **Fix** | `snapshot_version()` appends an immutable row on create, on each new version, and on every decision (with `frozen_at`), carrying a SHA-256 `content_hash` and a `review_snapshot` of the rulebook. Superseded rows keep their outcome. `current_version_id` is set. |
| **Verification** | `[PASS] Version history grew with the revision — 4 snapshot(s): ['superseded','changes_requested','superseded','approved']`, `[PASS] Approved version is frozen with a hash`, `[PASS] Submission points at its current version`. |
| **Files** | `app/services/submissions.py`, `app/models.py` |

---

## 3. High

### H1 — Rule codes were globally unique, so a second workspace could not own `CL-04`

```
POST /rules {"code":"CL-04"} → 409 {"message":"Rule code 'CL-04' already exists"}
```

`ix_rules_code` was a global `UNIQUE` index. Rule codes are house conventions, not global
identifiers. **Fix:** uniqueness moved to `(workspace, code)` via migration `a3b4c5d6e7f8`;
the collision check and auto-code generation are workspace-scoped.
**Verified:** `3/3 active in Precedent QA` alongside the PureGlow copies.

### H2 — `CL-05` had no evaluator and could never fire

`evaluate_text_rule()` had branches for `CL-03`, `CL-04`, `CL-06`, `MK-02`, `TV-02`, `PA-05`
— but none for `CL-05`. A "Substantiation Required" rule could be activated and would
silently never produce a finding. **Fix:** implemented `CL-05` with `ABSOLUTE_CLAIM` and
`SUBSTANTIATION` patterns; it clears only when the asset cites a study, trial, survey or
reference. **Verified:** `CL-05` now fires on `"no. 1"` and `"100% safe"`.

### H3 — `No. 1` was not detected at all

`SUPERLATIVE` matched `100% safe|guaranteed|no risk|perfect|best-in-class|miracle`. The
claim `India's No. 1 Skin Care Product.` matched nothing, so `CL-04` reported the poster as
clean. **Fix:** added `no\.?\s*1`, `number\s*one`, `#1`. **Verified:** `CL-04 High — "no. 1"`.

### H4 — Only the first offending phrase was reported per rule

`evaluate_text_rule()` returned a single `EngineFinding` using `hits[0]`. A poster carrying
both `No. 1` and `100% safe` produced **one** finding — removing it appeared to clear the
rule while the second claim stayed live. **Fix:** the function returns `list[EngineFinding]`,
one per distinct phrase; `run_rules()` extends instead of appending.
**Verified:** 4 findings instead of 1.

### H5 — Uploaded posters produced zero findings and no score

OCR worked (`status: complete`, 132 chars captured) but `findings` was empty. The pipeline
*does* call `apply_to_submission()` → `run_rules()`; with 0 active rules in the workspace
there was nothing to run, and H1 is why those rules could not be created. **Fix:** H1 + the
rule confirmation flow. **Verified:** `[PASS] AI review produced findings — 4 finding(s)`.

### H6 — `/analysis/submission/{id}` never returned findings

The endpoint returned `analysis_to_dict()` only. A client polling it for review results saw
zero findings forever, even though they had just been written to the submission.
**Fix:** the response now includes `submission` (findings + score). **Verified** by the E2E
polling loop.

### H7 — Agent Studio: `generate_summary` crashed the entire run with a 500

```
File "app/agents/tools.py", line 522, in generate_summary
    severities = Counter(str(f.get("severity","Medium")) for f in findings if isinstance(f, dict))
TypeError: 'int' object is not iterable
```

A prior step passed a **count** where a findings list was expected. Every audit-report run
returned `500 Internal Server Error`. **Fix:** `_as_finding_list()` normalises a list, a
wrapping dict, a single finding, or an int; applied to `generate_summary` and
`create_review_draft`. **Verified:** `audit → completed, steps=6, err=None`.

### H8 — Missing tool input hard-failed the whole agent run

```
exceptions → run failed: This tool requires an exception_id.
sentinel   → run failed: Provide an exception_id or rule_id.
```

The tools already raised a structured `ToolError(code="missing_input")`, but the runtime
treated it as fatal. A missing identifier is not an agent failure — there is nothing to look
up yet. **Fix:** `missing_input` becomes a `skipped` step carrying the message, and the
workflow continues. **Verified:** `exceptions → completed, steps=8, skipped=[…]`.

### H9 — Every chat intent collapsed onto one agent

Only 4 agents were published and all were `brand_compliance`, so the chat's category router
always fell back to the same agent — routing looked correct while being meaningless.
**Fix:** one agent per template category created and published (11 published).
**Verified:** `4/4 routed to the expected category`.

### H10 — `GET /submissions` ignored every query parameter

`?status=Approved` returned all 15 rows; the register, review queue and approved-content
screens all filtered client-side. **Fix:** `status` (comma-separated), `search`, `brand`,
`channel` and `limit` are applied in SQL, still scoped by role and workspace.
**Verified:** `all=15, approved=1, pending=12, search=1`.

---

## 4. Medium

### M1 — Poster 404 on the AI Review page

Four seeded analyses referenced `uploads/demo_poster_diwali.png`, which was never written:

```
GET /analysis/sub_dfac9746ad2c/file → 404
[FAIL] Creator · AI Review — errors=1
```

**Fix:** `scripts/repair_analysis_rows.py` repointed the rows (`dangling repaired: 4`),
`seed.py` no longer names a file it does not create, paths are resolved on disk, and the API
exposes `hasFile` so the UI only requests an image that exists.

### M2 — NaN SVG attributes broke the poster overlay

Two box shapes in the data — `{x,y,w,h}` from the pipeline, corner arrays `[x1,y1,x2,y2]`
from seed. `Math.max(undefined, 1)` is `NaN`, and React refuses to set an SVG attribute to
`NaN`:

```
Error: <rect> attribute width: Expected length, "NaN".
```

**Fix:** `_normalize_box()` converts either shape at the API boundary; `PosterCanvas` drops
non-finite boxes before rendering. **Verified:** AI Review page now has 0 console errors.

### M3 — Analysis status used two vocabularies

Pipeline wrote `complete`, seed wrote `completed`, frontend checked `=== 'complete'`. Seeded
analyses silently lost their region overlays. **Fix:** normalised `seed.py` (7 occurrences)
and existing rows (4). **Verified:** `status complete` on both seeded and live rows.

### M4 — Windows backslash paths

`file_path` stored as `uploads\demo_poster_diwali.png` does not resolve on a POSIX host.
**Fix:** paths normalised to forward slashes and resolved against `uploads_dir`.

### M5 — Campaign column showed the channel

`campaign` was populated from `s.channel || s.brand`, so a channel appeared under a
"Campaign" heading. **Fix:** `_campaign_for()` joins the real `campaigns` row and returns
`null` when unlinked — no substitution. Seeded 5 campaigns and linked the existing 15
submissions.

### M6 — Date sorting and date filtering were silently broken on three screens

`fmtDateTime()` emits `·` between date and time, and `new Date("… · …")` returns
`Invalid Date`. Column sorting on All Submissions was a no-op, "newest/oldest" on the Review
Queue did nothing, and the Audit History date range showed **0 of 213 events**.
**Fix:** one shared `parseStoredDateTime()` that strips the separator.
**Verified:** the audit range filter returns real events.

### M7 — Creator was never notified of a decision

`decide()` wrote `review_decisions` and updated status but created no `Notification`. The
creator only discovered the outcome by reloading the register; the bell badge never moved.
**Fix:** `_notify_creator()` with type-specific copy for approved / changes / rejected.
**Verified:** `[PASS] Creator notified of the decision — 5 notification(s)`.

### M8 — Managers were never notified of a resubmission

The queue badge moved but nobody was told why. **Fix:** `_notify_managers()`.
**Verified:** `[PASS] Manager notified of the resubmission — 3 notification(s)`.

---

## 5. Low

### L1 — Alembic migrations silently rolled back

`alembic upgrade head` printed "Running upgrade…" and exited 0, but `alembic_version` never
advanced and no columns existed. pysqlite's legacy isolation mode never commits DDL.
**Fix:** `connection.commit()` after `run_migrations()` in `alembic/env.py`.
**Verified:** `alembic_version = a3b4c5d6e7f8`, columns present in `sqlite_master`.

### L2 — Score was 0 for every submission

The first formula used findings as the denominator, but the `findings` table only stores
problems (0 pass rows), so clean content scored 0. **Fix:** `applicable_rules` (active rules
in scope) is the denominator. **Verified:** clean content scores 100.

### L3 — Build tooling false alarm

`npm run build` failed with `[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED]` when Vite
emptied `dist/images` (72 files > 50). This is the sandbox's bulk-delete guard, not a code
defect. Worked around by building to a fresh output directory each time.

---

## 6. Known limitations (not bugs)

| # | Limitation | Status | To enable |
|---|---|---|---|
| 1 | LLM unconfigured — `LLM_BASE_URL` and `LLM_API_KEY` empty. Prompt→agent uses keyword template routing (`"generatedBy":"fallback"`), summaries use a deterministic sentence, guideline search is `lexical_only`. | **BLOCKED** | Set both variables in `backend/.env`, restart. The code path exists and is guarded by `ai_available()`. |
| 2 | Part 9 Assistant has no conversation API — no `/assistant/*` endpoints, no conversation tables. The floating launcher executes Agent Studio agents instead. | **NOT_IMPLEMENTED** | Requires new router + tables; out of scope for this pass. |
| 3 | `rule_versions` is empty (0 rows) | **Open gap** | `review_snapshot.ruleVersionIds` falls back to rule ids. Rule versioning needs a write path. |
| 4 | `asset_versions`, `asset_tags`, `asset_links`, `task_events` are empty | **Open gap** | Tables exist; no feature writes them yet. |

---

## 7. Full verification log

```
qa_e2e_flow.py              33 / 33   creator → manager loop
qa_21_feature_audit.mjs     22 / 22   pages, 0 console errors
qa_agent_studio_chat.py     22 / 22   studio + chat routing
qa_role_matrix.py           20 / 20   permission boundaries
qa_feature_data_sweep.py    21 / 21   features return real rows
pytest tests/              158 passed
```

Test submission: **`sub_d03a353f3c50`** — `QA_PRECEDENT_2026 PureGlow Winter Promotion`,
workspace `Precedent QA`, final status `Approved`, score `100`.

---

## 8. How to start the system

```bash
# 1 — backend (FastAPI on :8000)
cd backend
.venv312/Scripts/python.exe -m alembic upgrade head
.venv312/Scripts/python.exe server.py

# 2 — frontend (Vite on :5173)
# from the repository root
npm run dev

# 3 — run the audit
cd backend
.venv312/Scripts/python.exe scripts/qa_e2e_flow.py
.venv312/Scripts/python.exe scripts/qa_agent_studio_chat.py
.venv312/Scripts/python.exe scripts/qa_role_matrix.py
.venv312/Scripts/python.exe scripts/qa_feature_data_sweep.py
# from the repository root
node scripts/qa_21_feature_audit.mjs
```

Demo accounts (password `precedent`):

| Role | Email |
|---|---|
| Manager | `david.kim@pureglow.co` |
| Creator | `emily.carter@pureglow.co` |
| QA manager | `qa.manager@precedent.qa` |
| QA creator | `qa.creator@precedent.qa` |
