# Reliability Checklist

Scope: every case listed in `scratch/spec_round3.txt` lines 725-742 ("TEST MANUAL + AUTOMATED CASES" and "UX").
Two evidence sources exist. Nothing below is inferred: a row is PASS only if a probe line or a named
pytest test produced it.

- **Probe** — `backend/scripts/reliability_probe.py`, last run against a live API with seeded demo data:
  32 checks, 31 pass, 1 known fail. Checks the HTTP surface (status codes, isolation, payload edges).
- **Suite** — `cd backend && ./.venv312/Scripts/python.exe -m pytest -q` → **108 passed**
  (test_a1_visualguard 26, test_a2_evidence 24, test_a3_sentinel 17, test_comprehensive_governance 11,
  test_rule_engine 8, test_workspace_isolation 6, test_auth 4, test_exceptions 3, test_submissions 3,
  test_rbac 2, test_regression_contract 2, test_conflicts 1, test_simulation 1).

There is no frontend test runner in `package.json` (scripts are `dev`, `build`, `preview`, `typecheck` only),
so UI-only behaviour cannot be marked PASS. Those rows are `NOT COVERED`.

## 1. Content input
| Case | How it was exercised | Result | Evidence |
|---|---|---|---|
| Whitespace-only text accepted (no 500) | probe: `POST /submissions` | PASS | `POST /submissions -> 200` |
| Whitespace-only text yields no fabricated violation | probe: `POST /submissions`, then `issueCount` | **FIXED — pending re-verification** | Before fix: `issueCount=9` (FAIL). Root cause and change in §11. |
| Very long content (20,000 characters) | probe: `POST /submissions` | PASS | `POST /submissions -> 200` |
| Emoji + punctuation body | probe: `POST /submissions` | PASS | `POST /submissions -> 200` |
| Devanagari (Hindi/Marathi) body | probe: `POST /submissions` | PASS | `POST /submissions -> 200` |
| Sentence splitting keeps emoji and Devanagari danda intact | `test_a2_evidence.py::test_split_sentences_keeps_emoji_intact`, `::test_split_sentences_handles_devanagari_danda` | PASS | in 108 passed |

## 2. Uploads, images and OCR
| Case | How it was exercised | Result | Evidence |
|---|---|---|---|
| Unsupported `.gif` rejected | probe: `POST /analysis/upload` | PASS | `POST /analysis/upload -> 415` |
| Renamed `.txt` rejected | probe: `POST /analysis/upload` | PASS | `POST /analysis/upload -> 415` |
| Corrupt PNG bytes fail cleanly | probe: `POST /analysis/upload` | PASS | `POST /analysis/upload -> 400` |
| Empty file fails cleanly | probe: `POST /analysis/upload` | PASS | `POST /analysis/upload -> 400` |
| Oversized upload rejected | probe: `POST /analysis/upload` | PASS | `POST /analysis/upload -> 413` |
| Corrupt file reported as failed by the pipeline | `test_a1_visualguard.py::test_pipeline_reports_a_corrupt_file_as_failed` | PASS | in 108 passed |
| Very large-dimension image | — | NOT COVERED | no probe check, no test |
| OCR no-text result | `test_a1_visualguard.py::test_layout_without_text_boxes_reports_no_text`, `::test_contrast_without_text_blocks_is_unknown_not_a_pass` | PASS | in 108 passed |
| OCR dependency unavailable | `test_a1_visualguard.py::test_ocr_reports_an_unreadable_image_without_raising` skips when Tesseract is absent, so the unavailable branch is never asserted | NOT COVERED | guarded by `pytest.skip` |
| Low-confidence OCR / logo detection | `test_a1_visualguard.py::test_evaluate_logo_low_confidence_is_needs_review_not_a_violation` | PASS | in 108 passed |
| Model timeout | — | NOT COVERED | `llm_timeout_seconds` handling exists in `services/evidence.py`; no test, no probe |
| Provider timeout | — | NOT COVERED | same path, no test |

## 3. Auth, sessions and access control
| Case | How it was exercised | Result | Evidence |
|---|---|---|---|
| Health endpoint answers | probe: `GET /health` | PASS | `GET /health -> 200` |
| Unauthenticated request is 401 | probe: `GET /submissions`; `test_auth.py::test_me_without_token_401` | PASS | `GET /submissions -> 401`; in 108 passed |
| Wrong password is 401 | `test_auth.py::test_login_wrong_password_401` | PASS | in 108 passed |
| Garbage JWT is 401 | probe: `GET /submissions` with malformed bearer | PASS | `GET /submissions -> 401` |
| Expired JWT | — | NOT COVERED | `security.py` relies on `jose` `exp` verification; no test issues a short-lived token |
| Logout | — | NOT COVERED | `POST /auth/logout` exists (`routers/auth.py:58`); no test, no probe |
| Refresh on every route | — | NOT COVERED | frontend behaviour; no frontend test runner |
| Creator cannot POST /rules (403) | probe; `test_rbac.py::test_creator_cannot_create_rule`; `test_comprehensive_governance.py::test_rbac_creator_forbidden_on_all_manager_endpoints` | PASS | `POST /rules -> 403`; in 108 passed |
| Unknown submission is 404 | probe: `GET /submissions/sub_does_not_exist` | PASS | `GET /submissions/sub_does_not_exist -> 404` |
| Cross-workspace submission hidden (404) | probe: `GET /submissions/<id>` as another workspace | PASS | `GET /submissions/<id> -> 404` |
| Other workspace sees none of PureGlow's submissions | probe: `GET /submissions` as WellnessLife | PASS | `WellnessLife sees 0 submissions` |
| Unknown route does not 500 | probe: `GET /definitely-not-a-route` | PASS | `GET /definitely-not-a-route -> 200` (SPA catch-all) |
| Workspace isolation across team/claims/guidelines/rules | `test_workspace_isolation.py` (6 tests) | PASS | in 108 passed |

## 4. Idempotency and concurrency
| Case | How it was exercised | Result | Evidence |
|---|---|---|---|
| Double submit creates two distinct versions, no 500 | probe: `POST /submissions` twice | PASS | `200/200` |
| Duplicate upload of the same file | — | NOT COVERED | no probe check, no test |
| Duplicate exception request | — | NOT COVERED | no probe check, no test |
| Repeated Sentinel scan is idempotent | probe: second `POST /sentinel/scan`; `test_a3_sentinel.py::test_run_trigger_is_deduplicated` | PASS | `second scan notified=0`; in 108 passed |
| Concurrent manager edits (stale version) | `test_submissions.py::test_stale_version_decision_rejected` | PASS | in 108 passed — see §4.1 |
| Task resolution is idempotent | `test_a3_sentinel.py::test_resolve_task_is_idempotent` | PASS | in 108 passed |

### 4.1 Stale-version check

`POST /submissions/{id}/decide` accepts a `version` in the body. `routers/submissions.py:147` compares it
with `sub.version` and raises **409** when they differ ("you reviewed v1 but the current version is v2").
`test_stale_version_decision_rejected` creates a submission, adds v2, asserts the v1 decision returns 409,
then asserts a v2 decision returns 200 and `status == "Approved"`.

## 5. Network interruption and recovery
| Case | How it was exercised | Result | Evidence |
|---|---|---|---|
| Network interruption while analysis is pending | — | NOT COVERED | no probe check, no test |
| Page refresh and recovery of analysis status | — | NOT COVERED | frontend behaviour; no frontend test runner |

## 6. AI failure modes
| Case | How it was exercised | Result | Evidence |
|---|---|---|---|
| AI unavailable (no provider configured) | `test_a2_evidence.py::test_semantic_review_without_llm_returns_empty_and_logs_skipped` | PASS | in 108 passed |
| AI review degrades without a provider | probe: `POST /evidence/review/<id>` | PASS | `POST /evidence/review/<id> -> 200` |
| Capability report names the live retrieval mode | probe: `GET /evidence/capabilities` | PASS | `retrieval=hybrid_bm25_vector llm=False` |
| Malformed structured output | — | NOT COVERED | parser path exists; no test feeds malformed JSON |
| Fabricated citation rejected | `test_a2_evidence.py::test_validate_citation_never_accepts_a_fabricated_quote` | PASS | in 108 passed |
| Fabricated passage / quote not in passage rejected | `::test_validate_citation_rejects_a_passage_that_was_not_retrieved`, `::test_validate_citation_rejects_a_quote_that_is_not_in_the_passage` | PASS | in 108 passed |
| Daily quota reached | — | NOT COVERED | `_calls_today` / quota logic in `services/evidence.py`; no test |
| AI trust report is manager-only (403) | probe: `GET /evidence/trust` as creator | PASS | `GET /evidence/trust -> 403` |
| Empty search query returns no results, not an error | probe: `GET /evidence/search?q=` | PASS | `GET /evidence/search?q= -> 200` |
| Search with a real query answers | probe: `GET /evidence/search?q=immunity` | PASS | `GET /evidence/search?q=immunity -> 200` |

## 7. Rules, exceptions and unknown facts
| Case | How it was exercised | Result | Evidence |
|---|---|---|---|
| Exception expired | `test_exceptions.py::test_approve_expired_exception_is_rejected` | PASS | in 108 passed |
| Exception revoked | `test_comprehensive_governance.py::test_exception_lifecycle_scope_expiry_and_revocation` | PASS | in 108 passed |
| Exception suppresses the finding when valid | `test_exceptions.py::test_approved_exception_suppresses_finding` | PASS | in 108 passed |
| Exception out of scope (other workspace) | `test_workspace_isolation.py::test_other_workspace_exception_does_not_suppress_finding` | PASS | in 108 passed |
| Exception out of scope (channel / campaign scope) | — | NOT COVERED | only workspace scope is asserted |
| Unknown fact (unmeasured asset) reported as unknown, not pass | `test_a1_visualguard.py::test_br01_unreadable_asset_unknown`, `::test_contrast_without_text_blocks_is_unknown_not_a_pass` | PASS | in 108 passed |
| Rule effective-date boundary | — | NOT COVERED | no test crosses an `effective_from` / `effective_to` boundary |

## 8. Notifications, tasks and audit
| Case | How it was exercised | Result | Evidence |
|---|---|---|---|
| Notification read clears the unread count | `test_a3_sentinel.py::test_unread_count_falls_to_zero_after_marking_read` | PASS | in 108 passed |
| Task resolution records the human decision | `test_a3_sentinel.py::test_resolve_task_records_the_human_decision` | PASS | in 108 passed |
| Task resolution rejects an unknown resolution value | `test_a3_sentinel.py::test_resolve_task_rejects_an_unknown_resolution` | PASS | in 108 passed |
| Manual scan runs | probe: `POST /sentinel/scan` | PASS | `POST /sentinel/scan -> 200` |
| Creator cannot start a scan (403) | probe: `POST /sentinel/scan` | PASS | `POST /sentinel/scan -> 403` |
| Sentinel tasks are workspace-scoped | probe: `GET /sentinel/tasks?status=open`; `test_a3_sentinel.py::test_run_trigger_leaves_other_workspaces_alone` | PASS | `-> 200`; in 108 passed |
| Publication list answers | probe: `GET /sentinel/publications?limit=5` | PASS | `-> 200` |
| Publication list is workspace-scoped | `test_a3_sentinel.py::test_list_publications_is_workspace_scoped` | PASS | in 108 passed |
| Audit log answers | probe: `GET /audit` | PASS | `GET /audit -> 200` |
| Audit export answers | probe: `GET /audit/export` | PASS | `GET /audit/export -> 200` |
| Audit persistence / append-only | `test_comprehensive_governance.py::test_audit_log_append_only_and_export` | PASS | in 108 passed |

## 9. Empty states
| Case | How it was exercised | Result | Evidence |
|---|---|---|---|
| Empty guideline library | — | NOT COVERED | UI state; no frontend test runner |
| No submissions | — | NOT COVERED | same |
| Empty review queue | — | NOT COVERED | same |
| No notifications | — | NOT COVERED | same |
| No Sentinel tasks | — | NOT COVERED | same |

Backend list endpoints do return empty collections rather than errors (`GET /evidence/search?q= -> 200`
in §6), but that is the API contract, not the rendered empty state.

## 10. UX
| Case | How it was exercised | Result | Evidence |
|---|---|---|---|
| Desktop and phone viewport | — | NOT COVERED | no visual/regression harness |
| Keyboard navigation for core forms | — | NOT COVERED | no a11y harness |
| Risk score explainability (no unexplained percentage) | — | NOT COVERED | reviewed by reading only, no assertion |
| Demo account / no production credentials | — | NOT COVERED | environment-dependent; not exercised |

## 11. The one known failure

**Check:** `-> whitespace-only yields no fabricated violation` → `issueCount=9`.

**Root cause:** a text-only submission has no asset, but `_asset_from_dict` / `_asset_from_submission`
(`services/submissions.py:43`, `:55`) returned an empty asset object. `run_rules()` therefore treated every visual rule as measurable and returned `unknown` for nine of them — BR-01, LO-02, TY-01, IM-03, SM-01, LOGO-001, COLOR-001, CONTRAST-001, FORMAT-001 — nine review items on copy that has no image at all.

**Change:** `run_rules()` (`app/rule_engine.py:393`) now skips visual-only rules when `asset is None`, so not-applicable is distinct from unknown; the asset helpers are being changed to return `None` when no asset exists. Unknown stays reserved for an asset whose fact genuinely could not be measured, which is still a human-resolvable review item.

**Status:** FIXED — pending re-verification. The probe must be re-run; the row stays non-PASS until it reports `issueCount=0` for the whitespace-only body.

## 12. Gaps

- No automated coverage: very large-dimension images, OCR-dependency-unavailable branch, model/provider timeout, expired JWT, logout, refresh-on-every-route, duplicate upload, duplicate exception, network interruption while analysis is pending, refresh recovery, malformed AI output, daily quota, channel-scope exception, rule effective-date boundary, all five empty states, viewport and keyboard UX, risk-score explainability, demo-account safety.
- The probe covers the HTTP contract only; it cannot see rendered states, polling or client-side retry. The stale-version 409 path is API-level only — no test drives two simultaneous requests.

## 13. How to re-run

```bash
# Backend suite (108 passed expected)
cd backend && ./.venv312/Scripts/python.exe -m pytest -q

# One file / one case
cd backend && ./.venv312/Scripts/python.exe -m pytest -q tests/test_submissions.py
cd backend && ./.venv312/Scripts/python.exe -m pytest -q tests/test_a1_visualguard.py::test_pipeline_reports_a_corrupt_file_as_failed

# Live probe — requires the API on :8000 with seeded demo data (not started by this document)
cd backend && ./.venv312/Scripts/python.exe scripts/reliability_probe.py
# alternate host:
cd backend && BASE=http://127.0.0.1:8001 ./.venv312/Scripts/python.exe scripts/reliability_probe.py

# Frontend typecheck (no test runner exists)
npm run typecheck
```

The probe exits non-zero if any check fails and prints the failing check plus its response body. It creates
only submissions titled `RELIABILITY PROBE…`; `python seed.py` resets demo data afterwards.
