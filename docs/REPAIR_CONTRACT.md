# PRECEDENT — Frontend Repair Contract

Read this fully before editing any page. All agents follow the same rules so the
21 pages stay consistent and the UI design is preserved.

## Goal

Make every visible control on the v2 pages **actually work**: real data, real
API calls, real persistence. The backend already provides working endpoints
(verified). The defect is that many v2 components render hardcoded numbers,
ignore filter state, or show fake success toasts.

## Hard rules

1. **Preserve the design.** Do not change layout, Tailwind classes, spacing,
   colour, copy tone, or component structure unless a change is required to
   display real data. Do not redesign. Do not add libraries.
2. **No fabricated data.** Delete hardcoded KPI numbers, percentages, counts,
   dates, `demo*` seed arrays, `Math.random()`, and `setTimeout`-simulated
   results. Replace with values derived from `useApp()` or a real API call.
   If there is genuinely no data, render `0` or `—` plus an honest empty state.
3. **No fake success.** A toast may only report success **after** the API
   promise resolves. On failure show the real error message.
4. **Every control must do something real.** A button either performs a real
   action, navigates, or is removed. If a capability does not exist on the
   backend, disable it with `disabled` and an honest `title`/tooltip
   (e.g. "Not available on this server") — never a fake confirmation toast.
5. **Filters, search and sort must filter.** Every `<select>` needs `onChange`
   wired to state, and the rendered list must derive from that state.
6. **Images:** use the deterministic images provided by `AppContext`
   (`/images/brand/*.webp` via the mapped records). Remove `unsplash.com` and
   `googleusercontent.com` URLs — they are third-party and often blocked.
7. **After any mutation** the context `refresh()` runs automatically inside the
   context functions. Do not hand-roll optimistic fake updates.
8. **Loading / empty / error states** must exist where a list can be empty.

## What `useApp()` exposes (already implemented, do not re-add)

Data: `submissions`, `guidelines`, `ruleConflicts`, `exceptions`,
`sentinelAlerts`, `assets`, `auditEvents`, `notifications`, `currentUser`,
`role`, `loading`, `error`, `searchQuery`, `setSearchQuery`.

Analytics: `analytics` (AnalyticsSummary | null), `analyticsTrends`
(points[] for the range), `analyticsRange` ('7d' | '30d' | '90d' | '1y'),
`setAnalyticsRange`, `analyticsLoading`, `creatorSummary`.

Mutations (all real, all call the API and then `refresh()`):
`updateSubmissionStatus(id, status, comment?)`,
`updateExceptionStatus(id, 'Approved'|'Rejected', note?)`,
`resolveSentinelAlert(id)`, `resolveRuleConflict(id)`,
`addNewContentSubmission(content)`, `addNewException(req)`,
`addComment(submissionId, body)`, `markNotificationRead(id)`,
`markAllNotificationsRead()`, `runSemanticReview(submissionId)`,
`fetchAiFindings(submissionId)`, `runRuleSimulation(ruleId, changeType, newValue)`,
`activateSimulation(id)`, `updateProfile(patch)`, `changePassword(cur, next)`,
`downloadGuideline(id)`, `downloadAnalytics()`, `refresh()`.

Feedback: `showToast(msg, 'success'|'info'|'warning'|'error')` (alias `addToast`).

## Direct API calls for page-specific needs

```ts
import { api } from '@/services/api'
```

Useful methods: `api.submission(id)`, `api.addVersion`, `api.uploadPoster`,
`api.analysis`, `api.aiFindings`, `api.runSemanticReview`, `api.searchEvidence`,
`api.evidenceCapabilities`, `api.health`, `api.modelsHealth`, `api.aiTrust`,
`api.crewSummary`, `api.triggerCrewReview`, `api.simulations`, `api.rules`,
`api.conflicts`, `api.expiryForecast`, `api.feedbackReports`,
`api.submitFindingFeedback`, `api.downloadAuditCsv`, `api.downloadSubmissionsCsv`,
`api.downloadSubmissionReport`, `api.uploadAsset`, `api.approveAsset`,
`api.fetchAssetBlobUrl`, `api.fetchGuidelineBlobUrl`, `api.markPublished`,
`api.impactPreview`, `api.scanExpiring`, `api.searchGuidelines`,
`api.setDocStatus`, `api.addDocument`, `api.addRule`, `api.confirmRule`,
`api.editRule`, `api.deactivateRule`, `api.rejectRule`.

Types: `AnalyticsSummary`, `AnalyticsTrends`, `CreatorSummary` are exported from
`@/services/api`.

## Per-page guidance

- **KPI cards** — derive from the real lists (`submissions.length`, status
  counts, `sentinelAlerts.filter(a => a.status === 'Open').length`, etc.) or
  from `analytics` / `creatorSummary`. Include the sample size where a score is
  shown so an empty workspace reads as `—`, not `0%`.
- **Charts (donut / bars / trend lines)** — build the series from real data.
  If the series is empty, render an empty state instead of a fake shape.
  Time-range toggles must call `setAnalyticsRange(...)`.
- **Download / Export** — use the `api.download*` helpers (they attach the
  bearer token) or `downloadGuideline` / `downloadAnalytics`. A plain
  `window.open` will 401.
- **"Copy link"** — use `navigator.clipboard.writeText(window.location.origin +
  route)` and toast success only if it resolves.
- **Comment boxes** — call `addComment(...)`; disable send when empty.
- **Approve / Reject / Request changes** — `updateSubmissionStatus`.
- **Resolve task** — `resolveSentinelAlert(id)`.
- **Mark all read** — `markAllNotificationsRead()`.

## Definition of done for a page

- No hardcoded metric remains.
- Every button/select/input has a working handler or is honestly disabled.
- No `Math.random` / `setTimeout` faking of results.
- `npx tsc --noEmit` passes.
- The page still looks the same as before.

## Reporting

When finished, report per file: what was hardcoded → what it now derives from,
every control fixed, and anything that could not be wired (with the reason).
