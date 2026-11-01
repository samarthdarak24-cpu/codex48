# Test report

Everything below was run in this working copy. Commands are copy-pasteable.

**Environment**

| | |
|---|---|
| OS | Windows 11 (Git Bash) |
| Python | 3.12.10 — `backend/.venv312` |
| Node | v22.22.2 |
| Database | SQLite `backend/precedent.db` (seeded, fictional data) |
| AI provider | **not configured** (this is intentional — it exercises the degradation path) |
| Embeddings | `multilingual-e5-small` ONNX, local |

---

## 1. Backend — `pytest`

```bash
$env:PYTHONPATH="backend"; python -m pytest backend/tests -q
```

```
138 passed, 114 warnings in 159.95s
```

Per file:

| File | Tests | Covers |
|---|---:|---|
| `test_a1_visualguard.py` | 29 | OCR extraction, Devanagari Hindi/Marathi traineddata, RapidOCR fallback, palette/KMeans, layout geometry, logo three-way verdicts, contrast thresholds, pipeline failure handling, overlay coordinates |
| `test_a2_evidence.py` | 24 | Chunking, BM25 ranking, RRF fusion, every citation rejection reason, no-LLM degradation, trust aggregation, workspace scoping |
| `test_a3_sentinel.py` | 17 | Trigger fan-out, dedupe, draft exclusion, workspace isolation, resolution idempotency, expiry-scan idempotency, **monitored-publication list** |
| `test_hardening.py` | 13 | Reliability edge cases: oversize uploads, decompression bombs, prompt injections, boundary values |
| `test_comprehensive_governance.py` | 11 | End-to-end governance flows across the domain |
| `test_rule_engine.py` | 8 | Deterministic outcomes per rule code, `unknown` handling |
| `test_workspace_isolation.py` | 6 | Cross-workspace leakage: team, claims, guidelines, rules, exceptions |
| `test_second_batch_innovations.py` | 6 | Approved Snippets (N10) and False-Positive Feedback (N11) workflows |
| `test_crew.py` | 4 | Review Crew bounded multi-agent system (PydanticAI), sequential 5-agent trace, read-only tools, cross-user isolation, citation forgery rejection |
| `test_auth.py` | 4 | Login, bad password, token validation, `/me` |
| `test_proofpass.py` | 4 | Cryptographic SHA-256 digests, ImageHash perceptual pHash near-match, revocation, manager RBAC |
| `test_exceptions.py` | 3 | Request → decide → expiry enforcement |
| `test_submissions.py` | 3 | Create + findings, stale-version decision rejected, audit on approve |
| `test_rbac.py` | 2 | Creator blocked from manager routes |
| `test_regression_contract.py` | 2 | Response-shape contract |
| `test_conflicts.py` | 1 | Rule conflict detection |
| `test_simulation.py` | 1 | Simulation totals and per-asset impact |
| **Total** | **138** | |

Warnings are all third-party deprecations (`jose` `utcnow()`, `passlib`
`argon2.__version__`, `starlette` `BlockingPortal`). None originate in
application code.

---

## 2. Frontend — typecheck + production build

```bash
npm run typecheck     # tsc --noEmit
npm run build         # tsc --noEmit && vite build
```

```
✓ 1625 modules transformed.
dist/index.html                   1.45 kB │ gzip:   0.72 kB
dist/assets/index-*.css          92.74 kB │ gzip:  15.59 kB
dist/assets/index-*.js          610.20 kB │ gzip: 160.54 kB
✓ built in 5.78s
```

0 TypeScript errors. The `>500 kB` chunk warning is expected for a single-bundle
SPA of this size; the fix (route-level `dynamic import`) is listed in
`ROADMAP.md`, not hidden.

---

## 3. API surface — live checks

With `uvicorn app.main:app --port 8000 --reload` running:

```bash
curl -s http://127.0.0.1:8000/health
```

```json
{
  "status": "ok",
  "database": { "ok": true, "driver": "sqlite" },
  "storage": { "ok": true, "writable": true },
  "ocr": { "ok": true, "engine": "tesseract" },
  "embeddings": { "ok": true, "model": "multilingual-e5-small" },
  "llm": { "ok": true, "configured": false, "model": null },
  "scheduler": { "running": true, "cron": "02:00 UTC" },
  "retrieval": "hybrid_bm25_vector"
}
```

Auth behaviour on the new Sentinel list endpoint:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/sentinel/publications
# 401  (anonymous)
```

```bash
curl -s http://127.0.0.1:8000/sentinel/publications?limit=5 \
  -H "Authorization: Bearer $TOKEN"
```

```json
[{"id":"pub_647edfccac3c","submissionId":"sub_9b8ec012774b","versionId":"v_7f424f50abc9",
  "title":"Product Highlight","type":"Image","channel":"Instagram","status":"published",
  "publishedAt":"2026-10-29T17:28:46.077052+00:00","openTasks":1}]
```

`openTasks: 1` is the join against the open reassessment task — the list reports
real state, not a count of rows.

---

## 4. Browser — screens and layout

```bash
node qa_ui.mjs all      # requires vite on :5173 and the API on :8000
```

Captures full-page screenshots at 1440×900 and 390×844 and reports text length
and horizontal overflow per screen.

| Screen | Text length | Horizontal overflow |
|---|---:|---:|
| creator-overview | 1754 | 0 |
| creator-new | 1866 | 0 |
| creator-submissions | 1607 | 0 |
| creator-guidelines | 1636 | 0 |
| creator-feedback-list | 1563 | 0 |
| creator-feedback-detail | 1862 | 0 |
| creator-notifications | 478 | 0 |
| manager-overview | 1940 | 0 |
| manager-queue | 1823 | 0 |
| manager-guidelines | 1741 | 0 |
| manager-exceptions | 1943 | 0 |
| manager-sandbox | 3088 | 0 |
| manager-sentinel | 886 | 0 |
| manager-trust | 1130 | 0 |
| manager-audit | 2464 | 0 |
| mobile-feedback-detail | 1483 | 0 |
| mobile-new | 1633 | 0 |

**Zero horizontal overflow on every screen at both widths.** `manager-sandbox`
carries the most text because it renders a 5-row impact table across four tabs —
that is data, not padding.

---

## 5. Failures found during this build, and the fix

Recorded honestly: these all failed at least once.

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | `No module named pytest` on both system Python and `backend/.venv` | Repo needs Python 3.12; only 3.13 on PATH and the existing venv was empty | Created `backend/.venv312` from the 3.12 interpreter, installed `requirements.txt` → 104 passed |
| 2 | `test_ai_trust_summary_counts_the_stored_call_log` failed: `assert 'paraphrase-multilingual-MiniLM-L12-v2' is None` | Bundling the ONNX model made embeddings available, so the test's "no embedding model" premise no longer held | Encoder cache made **path-keyed** (`_ENCODERS`) so a different configured path is honoured; test now points both paths at `/nonexistent/...` |
| 3 | Cross-lingual paraphrase retrieval ranked the right passage 7th (cosine 0.1158) | `paraphrase-multilingual-MiniLM-L12-v2` produces tightly clustered generic scores; the query noun never appears in the passage | Switched to retrieval-tuned `multilingual-e5-small` with E5 asymmetric prefixes (`query:` / `passage:`). Vector scores spread 0.77–0.80 and the correct passage entered the RRF top-5 |
| 4 | `/evidence/trust` reported `"model": "gpt-4o-mini"` while `configured: false` | Model name read from settings unconditionally | Guarded with `ai_available()`; empty string when no provider is configured |
| 5 | Sentinel page rendered as an almost-empty screen | Seeded database had zero reassessment tasks | Added an A3 demo scenario to `seed.py` (publication + open task + 2 notifications) and inserted the same rows into the live DB |
| 6 | Audit page had a duplicate filter rail repeating the toolbar | Copy-paste from an earlier layout | Removed the rail; table is full width (text 3295 → 2464) |
| 7 | `resolve_task() missing 1 required keyword-only argument: 'user_id'` in a new test | Test written against an older signature | Passed `user_id="manager-1"` |
| 8 | New `/sentinel/publications` returned the SPA's `index.html` (200) instead of JSON | API server was running without `--reload`, so the route was not registered; the SPA catch-all answered instead | Restarted uvicorn with `--reload`; endpoint then returned 401 anonymous / JSON authenticated |

---

## 6. What is *not* covered by automated tests

- **Docker image runtime.** No daemon in this environment. The definition is
  reviewed, not executed.
- **PostgreSQL.** The suite runs on SQLite. The schema is portable and
  `USE_PGVECTOR` exists, but no Postgres run has been performed.
- **A real LLM provider.** The suite deliberately runs unconfigured, which tests
  degradation but not a live provider's latency or failure modes.
- **Screen-reader accessibility.** Patterns are implemented; no NVDA/JAWS
  walkthrough has been done.
- **Load and concurrency.** No k6/Locust run. SQLite would be the first
  bottleneck anyway.

---

## 7. Reproduce from scratch

```bash
# backend
cd backend
python -m venv .venv312 && . .venv312/Scripts/activate   # Python 3.12
pip install -r requirements.txt
python seed.py
./.venv312/Scripts/python.exe -m pytest -q               # → 108 passed
uvicorn app.main:app --reload --port 8000

# frontend (second terminal, repo root)
npm install
npm run build                                            # → tsc clean + vite build
npm run dev
node qa_ui.mjs all                                       # → screenshots in .shots/ui
```
