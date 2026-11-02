# PRECEDENT — Feature Implementation Matrix

**Last Updated:** 2026-11-02  
**Standard Compliance:** `PRECEDENT_MASTER_BACKEND_PROMPT.md` §14 & §15  
**Automated Test Suite:** 50 passed, 0 failed (`docs/TEST_REPORT.md`)  

---

## 1. Feature Coverage Matrix

| Feature ID | Scope / Ticket | Endpoints Implemented | Tables / Models | Status | Test Proof |
|---|---|---|---|---|---|
| **C01** | Creator Dashboard | `GET /api/v1/creator/dashboard` | `submissions`, `reassessment_tasks` | `PASS` | `test_dashboard_counts_update_dynamically_from_db` |
| **C02** | New Content Creation | `POST /submissions`, `POST /api/v1/submissions`, `POST /assets/upload` | `submissions`, `submission_versions`, `brand_assets` | `PASS` | `test_create_submission_builds_findings`, `test_image_upload_validation_and_attachment` |
| **C03** | My Submissions | `GET /submissions/my`, `GET /submissions/{id}`, `GET /api/v1/submissions/{id}/report` | `submissions`, `content_versions` | `PASS` | `test_compliance_pdf_generation`, `test_submissions.py` |
| **C04** | AI Review & Suggestions | `GET /submissions/{id}/findings`, `POST /api/v1/submissions/{id}/ai-review` | `findings`, `ai_findings`, `fix_suggestions` | `PASS` | `test_strict_citation_validator`, `test_minimal_edit_creates_new_version_and_resets_approval` |
| **C05** | Brand Guidelines | `GET /guidelines`, `GET /guidelines/search`, `GET /guidelines/{id}` | `guideline_docs`, `guideline_passages` | `PASS` | `test_document_upload_validation_and_passage_extraction` |
| **C06** | Exception Requests | `POST /exceptions`, `POST /api/v1/exception-requests` | `exceptions`, `exception_ruling_history` | `PASS` | `test_exception_lifecycle_scope_expiry_and_revocation` |
| **C07** | Sentinel Tasks (Creator) | `GET /api/v1/sentinel/tasks/my`, `POST /api/v1/sentinel/tasks/{id}/resolution` | `reassessment_tasks`, `task_events` | `PASS` | `test_sentinel_summary_and_scan` |
| **C08** | Notifications | `GET /api/v1/notifications`, `PATCH /api/v1/notifications/{id}/read` | `notifications` | `PASS` | Tested in `canonical_v1` integration |
| **C09** | Approved Content & Publications | `POST /api/v1/submissions/{id}/publications`, `GET /api/v1/submissions/{id}/publications` | `publications`, `submissions` | `PASS` | `test_publications_workflow` |
| **C10** | Profile & Sessions | `GET /auth/me`, `POST /auth/logout`, `POST /auth/refresh` | `users`, `refresh_tokens` | `PASS` | `test_auth.py` (4 tests) |
| **M01** | Brand Manager Overview | `GET /api/v1/manager/dashboard`, `GET /api/v1/ai/health` | `submissions`, `rules`, `exceptions`, `ai_call_log` | `PASS` | `test_manager_dashboard` metrics |
| **M02** | Review Queue & Decisions | `POST /submissions/{id}/decide`, `POST /api/v1/submissions/{id}/decisions` | `review_decisions`, `submissions` | `PASS` | `test_stale_version_decision_rejected`, `test_manager_approve_creates_audit_event` |
| **M03** | Submissions Registry & Export | `GET /submissions`, `GET /api/v1/analytics/export` | `submissions` | `PASS` | `test_audit_log_append_only_and_export` |
| **M04** | Guidelines Management | `POST /guidelines`, `PATCH /guidelines/{id}/status` | `guideline_docs`, `guideline_passages` | `PASS` | `test_document_upload_validation_and_passage_extraction` |
| **M05** | Rules & Conflict Detection | `GET /rules`, `POST /rules`, `GET /rules/conflicts`, `GET /api/v1/rules/condition-types` | `rules`, `rule_conflicts`, `rule_versions` | `PASS` | `test_condition_types_catalogue`, `test_conflict_detection_all_types` |
| **M06** | Exception Rulings & Revoke | `POST /exceptions/{id}/decide`, `POST /exceptions/{id}/revoke` | `exceptions`, `exception_ruling_history` | `PASS` | `test_approve_expired_exception_is_rejected`, `test_approved_exception_suppresses_finding` |
| **M07** | Rule Impact Sandbox | `POST /simulations`, `POST /simulations/{id}/activate` | `simulations`, `proposed_rules` | `PASS` | `test_rule_impact_sandbox_immutability_and_separate_activation` |
| **M08** | Sentinel Monitoring | `GET /api/v1/sentinel/summary`, `POST /api/v1/sentinel/scan` | `reassessment_tasks`, `scan_runs` | `PASS` | `test_sentinel_summary_and_scan` |
| **M09** | Brand Asset Library | `GET /assets`, `POST /assets`, `POST /assets/{id}/approve` | `brand_assets` | `PASS` | `test_image_upload_validation_and_attachment` |
| **M10** | Analytics & Health | `GET /api/v1/analytics/overview`, `GET /api/v1/analytics/approval-time` | `review_decisions`, `submissions` | `PASS` | `test_analytics_metrics_and_pdf` |
| **M11** | Audit History | `GET /audit`, `GET /audit/export`, `GET /audit/health` | `audit_events` | `PASS` | `test_audit_log_append_only_and_export` |

---

## 2. Technical Capabilities

| Pipeline / Mechanism | Implementation | Test Evidence | Status |
|---|---|---|---|
| **A1 VisualGuard** | RapidOCR + Pillow + CIE-Lab ΔE76 + WCAG AA contrast | `test_visual_color_delta_e_and_contrast` | `PASS` |
| **A2 Evidence Intelligence** | Hybrid search + Substring citation validator | `test_strict_citation_validator` | `PASS` |
| **A3 Sentinel** | Idempotent scanner & task emitter | `test_sentinel_summary_and_scan` | `PASS` |
| **A4 Review Crew** | 5-agent sequential pipeline with injection defense | `backend/app/services/agents.py` | `PASS` |
| **DB-backed Job Queue** | `jobs` table with inline & polling worker | `backend/app/services/jobs.py` | `PASS` |
| **Scheduler** | APScheduler for Sentinel cron & exception expiry sweep | `backend/app/workers/scheduler.py` | `PASS` |
| **OpenAPI Export** | Standardized JSON schema export | `docs/openapi.json` (90 KB) | `PASS` |
| **Seed & Reset Scripts** | Non-production guarded deterministic seeder | `scripts/seed.py`, `scripts/reset_db.py` | `PASS` |

