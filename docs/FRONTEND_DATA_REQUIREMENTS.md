# PRECEDENT — Frontend Data Requirements Specification

**Date:** 2026-11-02  
**Scope:** 21 Pages (10 Creator C01–C10 + 11 Brand Manager M01–M11) + Top-Bar Navigation & Shared Elements

---

## 1. Shared Elements (All Pages)

| UI Element | Fields Displayed / Sent | Backend Endpoint | Table / Columns |
|---|---|---|---|
| **Top-bar Search** | `q: string`, `types: string[]` | `GET /api/v1/search?q=&types=` | `submissions(title, excerpt)`, `guidelines(title, description)`, `rules(code, title)`, `assets(name)` |
| **Notification Bell** | `unread_count`, list of notifications | `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count` | `notifications(id, user_id, title, body, payload, read_at)` |
| **User Profile Pill** | `name`, `role`, `avatar_url`, `workspace` | `GET /api/v1/auth/me` | `users(id, name, email, role, avatar_tone, workspace)` |
| **Background Job Status** | `job_id`, `status`, `stage`, `progress`, `error` | `GET /api/v1/jobs/{id}` | `jobs(id, type, status, stage, attempts, error, result)` |

---

## 2. Creator Workspace (C01–C10)

| Page | UI Element / Action | Fields / Payload | Canonical Endpoint | Table / Entity |
|---|---|---|---|---|
| **C01 Dashboard** | Overview cards & activity | `total_submissions`, `approved`, `pending_review`, `needs_attention`, recent list | `GET /api/v1/creator/dashboard` | `submissions`, `reassessment_tasks`, `audit_events` |
| **C02 New Content** | Content editor & asset dropzone | `title`, `channel`, `campaign_id`, `copy`, `asset_ids` | `POST /api/v1/submissions`, `POST /api/v1/assets/upload` | `submissions`, `submission_versions`, `assets` |
| **C02 New Content** | Real-time analysis trigger | `submission_id` | `POST /api/v1/submissions/{id}/analyze` | `jobs`, `evaluations`, `findings` |
| **C02 New Content** | Freeze & submit | `submission_id`, `content_hash` | `POST /api/v1/submissions/{id}/submit` | `submission_versions(status=submitted, frozen_at)` |
| **C03 My Submissions** | List, filter, sort, cards | `status`, `campaign`, `q`, `page`, `page_size` | `GET /api/v1/submissions/my`, `GET /api/v1/submissions/my/summary` | `submissions`, `submission_versions` |
| **C03 My Submissions** | Detail view & version diff | `id`, `version_number` | `GET /api/v1/submissions/{id}`, `GET /api/v1/submissions/{id}/versions/{n}` | `submission_versions`, `findings` |
| **C03 My Submissions** | Download compliance PDF | `id` | `GET /api/v1/submissions/{id}/report` | Generated ReportLab PDF from persisted records |
| **C04 AI Review** | Findings list & regions | `rule_code`, `outcome`, `severity`, `explanation`, `passage_id`, `region` | `GET /api/v1/submissions/{id}/findings?version=` | `findings`, `ai_findings` |
| **C04 AI Review** | Request AI suggestions | `finding_id` | `POST /api/v1/findings/{id}/suggest-fixes` | `fix_suggestions`, `ai_call_log` |
| **C04 AI Review** | Apply minimal fix | `fix_suggestion_id` | `POST /api/v1/fix-suggestions/{id}/apply` | Creates new `submission_version` (never mutates frozen) |
| **C05 Guidelines** | Active list & search | `q`, `category` | `GET /api/v1/guidelines/active`, `GET /api/v1/guideline-passages/search` | `guidelines`, `guideline_passages` |
| **C05 Guidelines** | Viewer & page preview | `guideline_id`, `page_number` | `GET /api/v1/guidelines/{id}`, `GET /api/v1/guideline-versions/{id}/pages/{n}` | `guideline_versions`, `guideline_passages` |
| **C06 Exceptions** | Request form | `rule_code`, `submission_id`, `reason`, `scope`, `conditions`, `requested_until` | `POST /api/v1/exception-requests` | `exception_requests`, `exception_events` |
| **C06 Exceptions** | My exceptions & timeline | list with status chips (`pending`, `approved`, `rejected`) | `GET /api/v1/exception-requests/my`, `GET /api/v1/exception-requests/{id}/history` | `exception_requests`, `exceptions`, `exception_events` |
| **C07 Sentinel Tasks** | Creator reassessment queue | `task_id`, `trigger_type`, `new_outcome`, `recommended_steps` | `GET /api/v1/sentinel/tasks/my` | `reassessment_tasks(assignee_id=creator)` |
| **C07 Sentinel Tasks** | Submit resolution | `task_id`, `resolution_notes`, `resolved_version_id` | `POST /api/v1/sentinel/tasks/{id}/resolution` | `reassessment_tasks(status=resolution_submitted)` |
| **C08 Notifications** | Notification list & filter | `category: all \| unread \| action_required \| system` | `GET /api/v1/notifications?category=` | `notifications` |
| **C08 Notifications** | Mark read / read all | `id` or batch | `PATCH /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/read-all` | `notifications(read_at)` |
| **C09 Approved Content** | Approved catalogue & publish | list of approved versions | `GET /api/v1/approved-content/my`, `POST /api/v1/submissions/{id}/publications` | `submission_versions(status=approved)`, `publications` |
| **C09 Approved Content** | Clone to new draft | `version_id` | `POST /api/v1/approved-content/{version_id}/new-draft` | Creates new `submissions` or new version |
| **C10 Profile** | User settings & sessions | `name`, `timezone`, password change, avatar upload | `GET/PATCH /api/v1/users/me`, `POST /api/v1/users/me/avatar`, `GET /api/v1/users/me/sessions` | `users`, `refresh_tokens`, `user_preferences` |

---

## 3. Brand Manager Workspace (M01–M11)

| Page | UI Element / Action | Fields / Payload | Canonical Endpoint | Table / Entity |
|---|---|---|---|---|
| **M01 Overview** | Executive metrics & AI health | `pending_reviews`, `approved_today`, `active_exceptions`, `expiring_soon`, `rules_pending_confirmation`, `open_sentinel_tasks`, `ai_health` | `GET /api/v1/manager/dashboard`, `GET /api/v1/ai/health` | `submissions`, `decisions`, `exceptions`, `rules`, `reassessment_tasks`, `ai_call_log` |
| **M02 Review Queue** | Review table & detail drawer | `campaign`, `creator`, `status`, `risk: high\|med\|low` | `GET /api/v1/manager/review-queue`, `GET /api/v1/submissions/{id}/review-detail` | `submissions`, `submission_versions`, `review_assignments` |
| **M02 Review Queue** | Version Decision | `version_id`, `decision: approve\|request_changes\|reject`, `comment` | `POST /api/v1/submissions/{id}/decisions` | `approval_decisions` (immutable), `submission_versions` |
| **M02 Review Queue** | AI Compare tool | `version_a_id`, `version_b_id` | `POST /api/v1/submissions/{id}/ai-compare` | Non-mutating version diff + finding delta |
| **M03 All Submissions** | Full workspace registry & CSV | filters, sort, pagination | `GET /api/v1/manager/submissions`, `GET /api/v1/manager/submissions/export` | `submissions`, `submission_versions`, `campaigns` |
| **M04 Guidelines** | Upload PDF/DOCX, extract & activate | `file`, `title`, `category`, `effective_from` | `POST /api/v1/guidelines`, `POST /api/v1/guidelines/{id}/extract`, `POST /api/v1/guideline-versions/{id}/activate` | `guidelines`, `guideline_versions`, `guideline_passages` |
| **M04 Guidelines** | Draft rule generator | `guideline_id` | `POST /api/v1/guidelines/{id}/draft-rules` | `rules(status=draft)` |
| **M05 Rules & Conflicts** | Rule editor & test runner | `code`, `name`, `condition_type`, `condition_config`, `scope`, `effective_from` | `POST /api/v1/rules`, `POST /api/v1/rules/{id}/test`, `POST /api/v1/rules/{id}/activate` | `rules`, `rule_versions`, `rule_test_cases` |
| **M05 Rules & Conflicts** | Conflict detector & resolver | list of conflicts, resolve payload | `GET /api/v1/rule-conflicts`, `POST /api/v1/rule-conflicts/detect`, `POST /api/v1/rule-conflicts/{id}/resolve` | `rule_conflicts(status=open\|resolved)` |
| **M06 Exceptions** | Manager rulings queue | list of pending requests | `GET /api/v1/manager/exception-requests`, `POST /api/v1/exception-requests/{id}/decision` | `exception_requests`, `exceptions`, `exception_events` |
| **M06 Exceptions** | Active registry & Revoke | list with expiry, `revoke_reason` | `GET /api/v1/manager/exceptions`, `POST /api/v1/exceptions/{id}/revoke` | `exceptions(status=revoked)`, `scan_runs` (Sentinel trigger) |
| **M07 Sandbox** | Simulation Runner & History | `rule_id`, `proposed_config`, `sample_filter` | `POST /api/v1/simulations`, `GET /api/v1/simulations`, `GET /api/v1/simulations/{id}/affected-content` | `simulations`, `simulation_items` (strictly non-mutating) |
| **M07 Sandbox** | Activate from simulation | `simulation_id` | `POST /api/v1/rules/{id}/activate-proposed-version` | Manager transaction: activates rule version, records `activated_from_simulation_id` |
| **M08 Sentinel** | Real-time monitoring & alerts | `summary`, `alerts`, trigger types | `GET /api/v1/sentinel/alerts`, `GET /api/v1/sentinel/summary`, `POST /api/v1/sentinel/scan` | `reassessment_tasks`, `scan_runs` |
| **M08 Sentinel** | Verify & Close task | `task_id`, `verification_note` | `POST /api/v1/sentinel/tasks/{id}/verify-resolution`, `POST /api/v1/sentinel/tasks/{id}/close` | `reassessment_tasks(status=resolved\|closed)` |
| **M09 Asset Library** | Media catalog, filter, approve | `kind`, `category`, `status`, `campaign` | `GET /api/v1/assets`, `POST /api/v1/assets`, `POST /api/v1/assets/{id}/decision` | `assets`, `asset_versions`, `tags` |
| **M10 Analytics** | Multi-metric dashboard & export | `approval-time`, `exceptions`, `sentinel`, `rule-coverage`, `guideline-health` | `GET /api/v1/analytics/overview`, `GET /api/v1/analytics/compliance-trend`, `GET /api/v1/analytics/approval-time` | Aggregated from persisted `decisions`, `findings`, `reassessment_tasks` |
| **M11 Audit** | Append-only event stream & export | `actor`, `action`, `resource_type`, `date_range` | `GET /api/v1/audit-events`, `GET /api/v1/audit-events/export` | `audit_events(actor_id, action, resource_id, before, after)` |

