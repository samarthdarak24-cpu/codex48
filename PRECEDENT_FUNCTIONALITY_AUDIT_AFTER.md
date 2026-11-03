# PRECEDENT — Functionality Audit (AFTER)

**Date:** 2026-11-02
**Companion to:** `PRECEDENT_FUNCTIONALITY_AUDIT_BEFORE.md`
**Rule applied:** a fix is only listed here if it was **re-executed** and observed working.
Code changes that were not verified against a live call are not counted.

---

## 1. Headline result

| Harness | Before | After |
|---|---|---|
| `qa_e2e_flow.py` (creator → manager loop) | 20 / 24 | **33 / 33** |
| `qa_21_feature_audit.mjs` (all pages) | 21 / 22 | **22 / 22** |
| `qa_agent_studio_chat.py` (studio + chat) | 17 / 20 | **22 / 22** |
| Backend test suite | 158 passed | **158 passed** |

The test submission for this run is **`sub_e57950018c2f`** (`SUB-1019`,
`QA_PRECEDENT_2026 PureGlow Winter Promotion`) in workspace `Precedent QA`.

---

## 2. What changed, and the evidence that it works

### 2.1 Rule codes are unique per workspace — PASS

`Rule.code` lost its global `UNIQUE` constraint; uniqueness moved to
`(workspace, code)` via migration `a3b4c5d6e7f8`.

```
sqlite_master:
  ix_rules_code            CREATE INDEX ... (code)                    -- non-unique
  uq_rule_workspace_code   CREATE UNIQUE INDEX ... (workspace, code)
```

Observed: `CL-03`, `CL-04`, `CL-05` now all exist in `Precedent QA` alongside the
`PureGlow` copies, with no collision.

### 2.2 Rules are confirmed through the real API — PASS

A rule created by `POST /rules` lands as `needs_confirmation` **by design** — a
machine-proposed rule must be accepted by a human before it judges live content. The
harness now confirms each rule exactly as the UI does:

```
[PASS] QA rules CL-03/04/05 exist and are active — 3/3 active in Precedent QA
```

| Code | Title | Status |
|---|---|---|
| `CL-03` | Only Approved Product Claims | active |
| `CL-04` | No Unqualified Superlatives | active |
| `CL-05` | Substantiation Required | active |

### 2.3 `CL-05` implemented — PASS

New evaluator branch in `rule_engine.py` with an `ABSOLUTE_CLAIM` pattern and a
`SUBSTANTIATION` pattern: an absolute claim fires unless the same asset cites a study,
trial, survey, or reference.

### 2.4 "No. 1" / "#1" / "number one" detected — PASS

Added to `SUPERLATIVE`. Engine output for the three poster claims:

```
CL-04 High | Unsubstantiated absolute claim detected: "no. 1"
CL-04 High | Unsubstantiated absolute claim detected: "100% safe"
CL-05 High | Absolute claim "no. 1" is made without a substantiation reference
CL-05 High | Absolute claim "100% safe" is made without a substantiation reference
```

`Supports healthy-looking skin.` correctly produces **no** finding.

### 2.5 Every offending phrase is its own finding — PASS

`evaluate_text_rule()` now returns `list[EngineFinding]`; `run_rules()` extends instead of
appending one. Two bad claims on one poster yield two findings per applicable rule.

### 2.6 Uploads now produce findings and a stored score — PASS

```
[PASS] OCR read the poster copy — status=complete · 132 chars of OCR text
[PASS] AI review produced findings — 4 finding(s)
[PASS] Findings cover the seeded rules — codes=['CL-04', 'CL-05']
[PASS] Score stored on the submission — score=0 formula=severity_weighted_v1
```

Score `0` is correct here: 4 high findings × 5.0 penalty = 20.0 against a denominator of
3 applicable rules × 5.0 = 15.0, clamped to the floor of 0.

After the creator removed both claims, the same submission scored **100**:

```
compliance_score = 100   score_formula_version = severity_weighted_v1   issue_count = 0
```

`store_score()` now writes the score at the moment findings change — on create, on new
version, and after a poster is analysed — instead of waiting for a GET.

### 2.7 Score denominator is workspace-scoped — PASS

`_applicable_rule_count()` filtered only on `status == "active"`, so another brand's
rules inflated the denominator. It now applies the same `(workspace == ws) OR workspace IS
NULL` filter as the rule engine.

### 2.8 Immutable version history — PASS

`submission_versions` now receives an append-only snapshot on create, on each new version,
and on every decision (frozen with `frozen_at`), with a SHA-256 `content_hash` and a
`review_snapshot` naming the rulebook that judged it.

```
[PASS] Immutable version snapshot exists — 1 submission_version row(s)
[PASS] Snapshot carries copy + content hash — hash=34a271353376…
[PASS] Snapshot records the rulebook it was judged against — 3 rule version(s)
[PASS] Submission points at its current version — currentVersionId=sv_78d90e21cd1a
[PASS] Version history grew with the revision — 4 snapshot(s)
[PASS] Approved version is frozen with a hash — 2 frozen snapshot(s)
[PASS] Earlier versions are marked superseded
[PASS] Approved snapshot holds the cleaned copy — "PureGlow Winter Promotion. Supports healthy-looking…"
```

Final history for `sub_e57950018c2f`:

| # | Status | Content hash | Frozen |
|---|---|---|---|
| 1 | superseded | `34a271353376` | — |
| 2 | changes_requested | `34a271353376` | yes |
| 3 | superseded | `e44d5319bc7f` | — |
| 4 | approved | `e44d5319bc7f` | yes |

### 2.9 AI review endpoint returns findings — PASS

`GET /analysis/submission/{id}` now includes `submission`, so the review screen gets
"OCR read these words → these rules fired" in one request.

### 2.10 Poster 404 eliminated — PASS

Four seeded rows referenced `uploads/demo_poster_diwali.png`, which was never written.
`scripts/repair_analysis_rows.py` repointed them at a real demo asset and normalised
backslash paths; `seed.py` no longer names a file it does not create.

The API now also reports whether the file is really there, and the UI only requests the
image when it is:

```
GET /analysis/submission/sub_dfac9746ad2c
  status: complete   hasFile: true
```

### 2.11 NaN SVG attributes eliminated — PASS

Boxes are normalised to `{x, y, w, h}` at the API boundary (`_normalize_box`), and the
canvas drops any box whose dimensions are not finite numbers. Console output for the AI
Review page is now **clean** — the page flipped from FAIL to PASS.

### 2.12 Status vocabulary unified — PASS

`completed` → `complete` in `seed.py` (7 occurrences) and in the existing rows (4 rows
repaired). The frontend's `status === 'complete'` check now matches seeded and live data
alike.

### 2.13 Creator notified on decision and on resubmission — PASS

```
[PASS] Creator notified of the decision — 5 notification(s)
[PASS] Manager notified of the resubmission — 3 notification(s)
```

### 2.14 Agent Studio and chatbot — PASS

```
[PASS] Prompt drafts an agent — HTTP 201 · Brand Compliance Reviewer
[PASS] Draft workflow has nodes — 10 node(s)
[PASS] Workflow validates — ok=True errors=0 nodes=10 tools=7
[PASS] Agent publishes — status=published version=1
[PASS] Agent executes — status=waiting_approval steps=9
[PASS] Tool steps completed — 7/7
[PASS] Approval gate releases the run — status=completed steps=10
[PASS] Chat questions produce real runs — 4/4 routed
[PASS] Studio reports execution stats — 10 agents · 29 runs · 86.4% success
```

---

## 3. Verdict summary (after fixes)

| Area | Before | After |
|---|---|---|
| 21 pages render and are interactive | PASS | PASS |
| Creator → Manager submission loop | FAIL | **PASS** |
| Compliance scoring | FAIL | **PASS** |
| Immutable version history | FAIL | **PASS** |
| Rule engine coverage | FAIL | **PASS** |
| AI review surface | FAIL | **PASS** |
| Agent Studio | PASS | PASS |
| Chatbot → agent execution | PASS | PASS |
| LLM-assisted behaviour | BLOCKED | **BLOCKED** (unchanged — configuration, not code) |
| Part 9 Assistant API | NOT_IMPLEMENTED | **NOT_IMPLEMENTED** (unchanged) |

---

## 4. What is still not done

These are **not** regressions and **not** hidden. They are the honest remainder:

1. **LLM is unconfigured.** `LLM_BASE_URL` and `LLM_API_KEY` are empty at runtime, so
   every AI-assisted step takes the deterministic path (`"method": "lexical_only"`,
   empty `tokenUsage`). Setting both variables and restarting the backend enables it.
2. **Part 9 Assistant has no conversation API.** No `/assistant/*` endpoints, no
   conversation tables. The floating launcher executes Agent Studio agents instead.
3. **Guideline search is lexical only.** `Search brand guidelines` returned
   `count: 0` for the QA query because no passage matched lexically. Vector retrieval
   requires the LLM embedding endpoint above.
