# 21 FEATURE BROWSER TEST REPORT

| # | Feature Screen | Role | Route | Status | Notes & Verification |
|---|----------------|------|-------|--------|----------------------|
| 1 | Manager Overview | Manager | `/manager/overview` | **PASS** | Metric cards, compliance chart, review queue loaded |
| 2 | Guidelines & Rules | Manager | `/manager/guidelines` | **PASS** | DOCX upload works without reload; rules auto-extracted |
| 3 | Agent Studio | Manager | `/manager/agent-studio` | **PASS** | Prompt builder synthesizes agent; templates available |
| 4 | Agent Executions | Manager | `/manager/agent-runs` | **PASS** | Step execution cards, tool telemetry, JSON toggle |
| 5 | Review Queue | Manager | `/manager/queue` | **PASS** | Real submission queue with AI findings and rulings |
| 6 | All Submissions | Manager | `/manager/submissions` | **PASS** | Submissions table with search, filters, and drawer |
| 7 | Exceptions | Manager | `/manager/exceptions` | **PASS** | Exception requests with approval/rejection actions |
| 8 | Rule Impact Sandbox | Manager | `/manager/sandbox` | **PASS** | Simulation metrics and before/after comparison |
| 9 | Sentinel Monitoring | Manager | `/manager/sentinel` | **PASS** | Reassessment tasks, change triggers, and filters |
| 10 | Asset Library | Manager | `/manager/assets` | **PASS** | Image 1 & 2 uploaded independently with preview |
| 11 | Analytics & Health | Manager | `/manager/analytics` | **PASS** | Derived metrics, policy violations, and CSV export |
| 12 | Audit History | Manager | `/manager/audit` | **PASS** | Append-only audit logs with search and CSV/JSON export |
| 13 | Creator Overview | Creator | `/app/overview` | **PASS** | Submissions count, pending review alerts, profile |
| 14 | New Content | Creator | `/app/new-content` | **PASS** | Multi-channel copy editor, image upload, OCR |
| 15 | My Submissions | Creator | `/app/submissions` | **PASS** | Real-time submission status, version tracking |
| 16 | AI Review | Creator | `/app/submissions` | **PASS** | Grounded OCR extraction, claim substantiation checks |
| 17 | Brand Guidelines | Creator | `/app/guidelines` | **PASS** | View passages, Download PDF button |
| 18 | Exception Requests | Creator | `/app/exceptions` | **PASS** | Form to request scoped policy exemption |
| 19 | Sentinel Tasks | Creator | `/app/sentinel-tasks` | **PASS** | Reassessment notifications assigned to creator |
| 20 | Notifications | Creator | `/app/notifications` | **PASS** | Real-time notifications for rulings and reviews |
| 21 | Approved Content | Creator | `/app/approved-content` | **PASS** | Repository of approved marketing assets |
| 22 | My AI Assistants | Creator | `/app/ai-assistants` | **PASS** | 1-click prompt suggestion chips & rich executive reports |
