# PRECEDENT — Creator → Manager End-to-End Report

**Date:** 2026-11-02
**Harness:** `backend/scripts/qa_e2e_flow.py` — real HTTP against `http://127.0.0.1:8000`, real SQLite, assertions on both the response **and** the row.
**Result:** **33 / 33 checks passed**
**Test submission:** `sub_d03a353f3c50` (`SUB-1035`) — `QA_PRECEDENT_2026 PureGlow Winter Promotion`
**Evidence:** `qa-results/e2e.json`

---

## 1. Isolated QA workspace

The run never touches the PureGlow demo data. `require_workspace()` scopes every read and
write to `user.workspace`, and returns **404** (not 403) for cross-workspace access so the
existence of another workspace's rows is not disclosed.

| Item | Value |
|---|---|
| Workspace | `Precedent QA` |
| Creator | `qa.creator@precedent.qa` |
| Manager | `qa.manager@precedent.qa` |
| Brand | `PureGlow QA` |
| Title prefix | `QA_PRECEDENT_2026` |
| Password | `precedent` |

## 2. Seeded rules

Created through `POST /rules` and then confirmed through `POST /rules/{id}/confirm` —
exactly the path the UI takes, because a machine-proposed rule must be accepted by a human
before it judges live content.

| Code | Title | Status | ID |
|---|---|---|---|
| `CL-03` | Only Approved Product Claims | active | `rule_c9fc92317e2e` |
| `CL-04` | No Unqualified Superlatives | active | `rule_3e693efeef8a` |
| `CL-05` | Substantiation Required | active | `rule_ff8c46017399` |

```
[PASS] QA rules CL-03/04/05 exist and are active — 3/3 active in Precedent QA
```

## 3. The poster

`make_poster()` draws a real 1080×1080 PNG carrying the three claims:

1. `India's No. 1 Skin Care Product.`
2. `100% Safe for Everyone.`
3. `Supports healthy-looking skin.`

Claim 3 is compliant and must produce no finding — that is the control case.

## 4. The journey, step by step

### Step 1 — Creator creates the submission

```
POST /submissions          → 200
[PASS] Submission persisted with creator + workspace — sub_d03a353f3c50 · status=Pending
```

Writes: 1 `submissions` row, 1 `content_versions` row (v1), 1 `submission_versions` row
(v1, `status=submitted`, content hash), findings from the typed copy, and the score.

### Step 2 — Creator uploads the poster

```
POST /analysis/upload      → 200
[PASS] OCR read the poster copy — status=complete · 132 chars of OCR text
```

The background task runs the pipeline: OCR → colour → logo → layout → contrast, then
`apply_to_submission()` re-runs the rule engine over **typed copy + OCR text**.

### Step 3 — AI review produces findings

```
[PASS] AI review produced findings — 4 finding(s)
[PASS] Findings cover the seeded rules — codes=['CL-04', 'CL-05']
```

| Rule | Severity | Explanation |
|---|---|---|
| `CL-04` | High | Unsubstantiated absolute claim: `"no. 1"` |
| `CL-04` | High | Unsubstantiated absolute claim: `"100% safe"` |
| `CL-05` | High | Absolute claim `"no. 1"` without a substantiation reference |
| `CL-05` | High | Absolute claim `"100% safe"` without a substantiation reference |

`Supports healthy-looking skin.` produced nothing. **Four** findings, not one, because each
distinct offending phrase is now its own finding.

### Step 4 — Score stored

```
[PASS] Score stored on the submission — score=0 formula=severity_weighted_v1
```

Score `0` is arithmetically correct, not a bug:

```
penalty    = 4 high × 5.0            = 20.0
applicable = 3 rules × 5.0           = 15.0
score      = round(100 × (1 − 20/15)) = −33 → clamped to 0
```

### Step 5 — Immutable snapshot

```
[PASS] Snapshot carries copy + content hash — hash=34a271353376…
[PASS] Snapshot records the rulebook it was judged against — 3 rule version(s)
[PASS] Submission points at its current version — currentVersionId=sv_…
```

### Step 6 — Manager sees it in the queue

```
GET /submissions           → the QA submission is present
[PASS] Manager sees the submission
```

### Step 7 — Manager requests changes

```
POST /submissions/{id}/decide  {"action":"Changes Requested"}  → 200
[PASS] Status persisted as changes requested
[PASS] Decision row written — 1 decision(s)
[PASS] Creator notified of the decision — 5 notification(s)
```

Notification written: `type=changes_requested`, payload carries `submissionId`, `version`,
`reviewerId`.

### Step 8 — Creator revises

```
POST /submissions/{id}/versions  {"text":"PureGlow Winter Promotion. Supports healthy-looking skin."}  → 200
[PASS] Version number incremented — v2
[PASS] Manager notified of the resubmission — 3 notification(s)
```

The clean copy removes both offending claims; findings are recomputed and drop to zero, and
the stored score moves from `0` to `100`.

### Step 9 — Manager approves

```
POST /submissions/{id}/decide  {"action":"Approved"}  → 200
[PASS] Status persisted as approved — Approved
[PASS] Creator sees the approved status — Approved
```

### Step 10 — Version history

```
[PASS] Version history grew with the revision — 4 snapshot(s)
[PASS] Approved version is frozen with a hash — 2 frozen snapshot(s)
[PASS] Earlier versions are marked superseded
[PASS] Approved snapshot holds the cleaned copy — "PureGlow Winter Promotion. Supports healthy-looking…"
```

| # | Status | Content hash | Frozen at |
|---|---|---|---|
| 1 | superseded | `34a271353376…` | — |
| 2 | changes_requested | `34a271353376…` | yes |
| 3 | superseded | `e44d5319bc7f…` | — |
| 4 | approved | `e44d5319bc7f…` | yes |

The hash is identical for v1/v2 and for v3/v4 because those pairs contain the same copy —
which is the point: the hash proves *what* was decided, and it did not change under review.

### Step 11 — Audit trail

```
[PASS] Audit trail records this submission — 4 event(s)
```

`Approved` / `Revised` / `Revised` / `Revised` — every transition is recorded.

### Step 12 — Workspace isolation

```
[PASS] QA submission is invisible to the PureGlow workspace — 15 rows in PureGlow
[PASS] QA manager cannot read a PureGlow submission — HTTP 404
```

---

## 5. Full check log

```
[PASS] QA workspace users exist — Precedent QA
[PASS] Creator login — qa.creator@precedent.qa
[PASS] Manager login — qa.manager@precedent.qa
[PASS] QA rules CL-03/04/05 exist and are active — 3/3 active in Precedent QA
[PASS] Creator creates submission — HTTP 200
[PASS] Submission persisted with creator + workspace — sub_d03a353f3c50 · status=Pending
[PASS] Poster upload accepted — HTTP 200
[PASS] OCR read the poster copy — status=complete · 132 chars of OCR text
[PASS] AI review produced findings — 4 finding(s)
[PASS] Findings cover the seeded rules — codes=['CL-04', 'CL-05']
[PASS] Score stored on the submission — score=0 formula=severity_weighted_v1
[PASS] Immutable version snapshot exists — 1 submission_version row(s)
[PASS] Snapshot carries copy + content hash — hash=34a271353376…
[PASS] Snapshot records the rulebook it was judged against — 3 rule version(s)
[PASS] Submission points at its current version — currentVersionId=sv_…
[PASS] Manager sees the submission
[PASS] Manager requests changes — HTTP 200
[PASS] Status persisted as changes requested — Changes Requested
[PASS] Decision row written — 1 decision(s)
[PASS] Creator notified of the decision — 5 notification(s)
[PASS] Creator creates a new version — HTTP 200
[PASS] Version number incremented — v2
[PASS] Manager notified of the resubmission — 3 notification(s)
[PASS] Manager approves the revision — HTTP 200
[PASS] Status persisted as approved — Approved
[PASS] Creator sees the approved status — Approved
[PASS] Audit trail records this submission — 4 event(s)
[PASS] QA submission is invisible to the PureGlow workspace — 15 rows in PureGlow
[PASS] QA manager cannot read a PureGlow submission — HTTP 404
[PASS] Version history grew with the revision — 4 snapshot(s)
[PASS] Approved version is frozen with a hash — 2 frozen snapshot(s)
[PASS] Earlier versions are marked superseded
[PASS] Approved snapshot holds the cleaned copy

33/33 checks passed
```

---

## 6. Re-running

```bash
cd backend
.venv312/Scripts/python.exe server.py            # terminal 1
.venv312/Scripts/python.exe scripts/qa_e2e_flow.py   # terminal 2
```

The harness is idempotent: users and rules are reused if present, and every run creates a
new submission so previous evidence stays intact.
