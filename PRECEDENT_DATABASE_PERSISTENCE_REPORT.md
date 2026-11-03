# PRECEDENT — Database Persistence Report

**Date:** 2026-11-02
**Database:** `backend/precedent.db` (SQLite), **65 tables**
**Method:** every claim below was produced by a write through the HTTP API followed by a
direct `SELECT` against the same file. Nothing is inferred from the ORM.

---

## 1. Does the data actually persist?

Yes. The table below compares row counts before and after one full E2E run
(`qa_e2e_flow.py`) plus one Agent Studio run.

| Table | Rows | Written by |
|---|---|---|
| `users` | 5 | seed + QA harness |
| `submissions` | 21 | `POST /submissions` |
| `content_versions` | 27 | create + `POST /{id}/versions` |
| `submission_versions` | 16 | **new** — create / version / decision |
| `findings` | 127 | rule engine on create, version, and poster upload |
| `review_decisions` | 16 | `POST /{id}/decide` |
| `notifications` | 17 | decision + resubmission |
| `audit_events` | 439 | every mutation |
| `rules` | 22 | `POST /rules` |
| `exceptions` | 4 | exception requests |
| `reassessment_tasks` | 3 | Sentinel triggers |
| `brand_assets` | 10 | asset library |
| `asset_analysis` | 11 | `POST /analysis/upload` |
| `guideline_docs` | 3 | seed |
| `campaigns` | 5 | `seed_campaigns.py` |
| `simulations` | 2 | rule impact sandbox |
| `studio_agents` | 19 | Agent Studio |
| `studio_agent_runs` | 51 | `POST /agents/{id}/execute` |
| `studio_agent_run_steps` | 411 | runtime (≈8 steps per run) |

`studio_agent_run_steps` at 411 rows for 51 runs is the strongest single signal that agent
execution is real: each step (trigger, tool call, approval, output) is its own row.

---

## 2. The critical persistence path, row by row

Submission `sub_d03a353f3c50`:

```
submissions
  id                  sub_d03a353f3c50
  code                SUB-1035
  title               QA_PRECEDENT_2026 PureGlow Winter Promotion
  status              Approved
  workspace           Precedent QA
  compliance_score    100
  score_formula_...   severity_weighted_v1
  version             2
  issue_count         0
  current_version_id  sv_…
```

After the creator removed both offending claims, `findings` for this submission is **empty**
and `issue_count` is `0` — the engine recomputed rather than leaving stale rows.

---

## 3. What was broken, and the proof it is fixed

### 3.1 `submission_versions` was an empty table — FIXED

Before: `content_versions` 19 rows, `submission_versions` **0**, `current_version_id` NULL
on every submission. `app/agents/tools.py` read the table; nothing ever wrote it.

After: `snapshot_version()` appends on create, on each new version, and on every decision.

```
version_number  status             content_hash   frozen_at
1               superseded         34a271353376   NULL
2               changes_requested  34a271353376   2026-11-02 16:08:27
3               superseded         e44d5319bc7f   NULL
4               approved           e44d5319bc7f   2026-11-02 16:08:27
```

Each row carries `review_snapshot` = `{ruleVersionIds, guidelineVersionIds, exceptionIds,
findingsHash}`, so the rulebook in force is recorded with the copy it judged.

### 3.2 `compliance_score` was NULL in the table — FIXED

The score used to be computed lazily inside `submission_to_dict()`, so anything reading the
table directly (reports, exports, agent tools) saw `NULL`. `store_score()` now writes it in
the same transaction as the findings.

### 3.3 Score denominator leaked across workspaces — FIXED

`_applicable_rule_count()` counted every active rule regardless of workspace. A submission
in `Precedent QA` was being scored against `PureGlow`'s rules too. Now scoped with the same
`(workspace == ws) OR workspace IS NULL` filter the engine uses.

### 3.4 Rule codes collided across workspaces — FIXED

`ix_rules_code` was a global `UNIQUE` index. Migration `a3b4c5d6e7f8` replaced it:

```
ix_rules_code            CREATE INDEX ... (code)                     -- non-unique
uq_rule_workspace_code   CREATE UNIQUE INDEX ... (workspace, code)
```

### 3.5 Seeded analyses pointed at a file that did not exist — FIXED

4 rows referenced `uploads/demo_poster_diwali.png`, which was never written, and stored
Windows backslashes. `scripts/repair_analysis_rows.py` reported:

```
status normalised : 4
path normalised   : 5
dangling repaired : 4
```

### 3.6 Two status vocabularies — FIXED

`completed` (seed) vs `complete` (pipeline). Normalised in `seed.py` (7 occurrences) and in
existing rows (4 rows). The frontend only understands `complete`, so seeded analyses had
been silently losing their region overlays.

---

## 4. Migration integrity

An earlier bug made every `alembic upgrade` a no-op: pysqlite's legacy isolation mode never
commits DDL, so the migration printed "Running upgrade…" and exited 0 while the schema was
unchanged. `alembic/env.py` now calls `connection.commit()` after `run_migrations()`.

Current head:

```
alembic_version = a3b4c5d6e7f8
```

Verified by reading `sqlite_master` after each upgrade rather than trusting the exit code.

---

## 5. Known gaps (honest)

| Gap | Detail |
|---|---|
| `rule_versions` is empty (0 rows) | `review_snapshot.ruleVersionIds` therefore falls back to rule **ids**, not rule version ids. The snapshot still names the rulebook, but not a versioned revision of it. |
| `asset_versions`, `asset_tags`, `asset_links`, `task_events` are empty | Tables exist; no feature writes them yet. |
| No cascade audit for `findings` | Deleting a submission removes its findings via FK cascade; no audit row is written for the cascade itself. |

---

## 6. Reproducing

```bash
cd backend
.venv312/Scripts/python.exe -m alembic upgrade head
.venv312/Scripts/python.exe scripts/repair_analysis_rows.py
.venv312/Scripts/python.exe -c "
import sqlite3; c=sqlite3.connect('precedent.db')
print(list(c.execute('select * from alembic_version')))
print(list(c.execute('select count(*) from submission_versions')))"
```
