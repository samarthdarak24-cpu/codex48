# Precedent v2 UI — 21-page integration notes

This document records exactly what was ported from `lastfinalecode/`, how it is
wired to the existing FastAPI backend, what is live, and what still needs work.

## 1. Source and approach

- **Source:** `lastfinalecode/` — a standalone AI Studio app (React 19, Tailwind 4,
  Vite 8) with 21 views, an in-memory `AppContext`, and 738 lines of mock data.
- **Target:** the existing React 18 + Vite 5 + Tailwind 3 app in `src/`.
- **Approach:** copy the 21 views into `src/v2/`, keep their JSX, replace the mock
  context with a **backend-backed adapter**, retheme to the product palette, and
  mount them on real routes. The legacy creator workspace at `/app/*` is preserved.

## 2. Files added / changed

| File | Purpose |
|---|---|
| `src/v2/components/views/creator/*` (10) | Ported creator pages |
| `src/v2/components/views/manager/*` (11) | Ported manager pages |
| `src/v2/components/layout/{Sidebar,Header}.tsx` | Shell; role switcher removed, real counts |
| `src/v2/components/modals/AiCompareModal.tsx` | Ported modal |
| `src/v2/context/AppContext.tsx` | **New** backend-backed context (same `useApp()` API) |
| `src/v2/V2Layout.tsx` | Shell with loading/error/toast handling |
| `src/v2/types/index.ts` | Ported view types (+ optional `format`) |
| `src/v2/v2.css` | Animations, card hover, conic gradients, Tailwind-4 shims |
| `src/App.tsx` | `/creator/*` and `/manager/*` route groups |
| `src/services/api.ts` | Added `conflicts()` |
| `src/pages/Login.tsx` | Redirects to `/creator/dashboard` or `/manager/overview` |

## 3. Route map

### Content Creator — 10 pages (`/creator/*`)
| # | Page | Route | View |
|---|---|---|---|
| 1 | Dashboard | `/creator/dashboard` | `CreatorDashboardView` |
| 2 | New Content | `/creator/new-content` | `NewContentView` |
| 3 | My Submissions | `/creator/submissions` | `MySubmissionsView` |
| 4 | AI Review | `/creator/ai-review` | `AIReviewView` |
| 5 | Guidelines | `/creator/guidelines` | `CreatorGuidelinesView` |
| 6 | Exception Requests | `/creator/exceptions` | `CreatorExceptionRequestsView` |
| 7 | Sentinel Tasks | `/creator/tasks` | `CreatorSentinelTasksView` |
| 8 | Notifications | `/creator/notifications` | `NotificationsView` |
| 9 | Approved Content | `/creator/approved` | `ApprovedContentView` |
| 10 | Profile | `/creator/profile` | `MyProfileView` |

### Brand Manager — 11 pages (`/manager/*`)
| # | Page | Route | View |
|---|---|---|---|
| 1 | Overview | `/manager/overview` | `OverviewView` |
| 2 | Review Queue | `/manager/review-queue` | `ReviewQueueView` |
| 3 | All Submissions | `/manager/all-submissions` | `AllSubmissionsView` |
| 4 | Brand Guidelines | `/manager/brand-guidelines` | `BrandGuidelinesView` |
| 5 | Rules & Conflicts | `/manager/rules-conflicts` | `RulesConflictsView` |
| 6 | Exceptions | `/manager/exceptions` | `ExceptionsView` |
| 7 | Rule Impact Sandbox | `/manager/rule-impact-sandbox` | `RuleImpactSandboxView` |
| 8 | Sentinel Monitoring | `/manager/sentinel` | `SentinelMonitoringView` |
| 9 | Asset Library | `/manager/asset-library` | `AssetLibraryView` |
| 10 | Analytics & Health | `/manager/analytics` | `AnalyticsHealthView` |
| 11 | Audit History | `/manager/audit-history` | `AuditHistoryView` |

## 4. Data mapping (real API → view types)

`src/v2/context/AppContext.tsx` fetches once per workspace and maps:

| Backend | View type | Notes |
|---|---|---|
| `GET /submissions` | `Submission[]` | status mapped; findings/comments mapped; `complianceScore` **derived** from open findings (100 − 15·high − 8·medium − 3·low); thumbnails are deterministic SVG placeholders |
| `GET /guidelines` | `Guideline[]` | category/status mapped; `format` from `fileType` |
| `GET /rules/conflicts` | `RuleConflict[]` | only real conflicts; empty stays empty |
| `GET /exceptions` | `ExceptionItem[]` | status/scope/expiry mapped |
| `GET /sentinel/tasks` | `SentinelAlert[]` | trigger → category; overdue → High |
| `GET /assets` | `Asset[]` | approval state mapped |
| `GET /audit` | `AuditEvent[]` | actor resolved from `/team` |
| `GET /sentinel/notifications` | `NotificationItem[]` | read state, link, time |
| `GET /team` | name/avatar lookup | initials avatar generated locally |

Mutations are wired to the real API:
`updateSubmissionStatus` → `POST /submissions/{id}/decide` (with version),
`updateExceptionStatus` → `POST /exceptions/{id}/decide`,
`addNewContentSubmission` → `POST /submissions`,
`addNewException` → `POST /exceptions`,
`resolveSentinelAlert` → `POST /sentinel/tasks/{id}/resolve`,
`markNotificationRead` → `POST /sentinel/notifications/{id}/read`.

`resolveRuleConflict` is intentionally **UI-only**: it marks the row as reviewed
and states that no policy was changed. Rule activation is a separate backend action.

## 5. Live data vs remaining view-local demo data

**Live (real API):** Overview, Review Queue, All Submissions, Brand Guidelines,
Rules & Conflicts, Exceptions, Sentinel Monitoring, Asset Library, Audit History,
Creator Dashboard, My Submissions, AI Review, Creator Guidelines, Exception
Requests, Notifications, Approved Content, Profile, and the New Content submit
action.

**Now also live:** `CreatorSentinelTasksView` (real `/sentinel/tasks`, resolution calls
`POST /sentinel/tasks/{id}/resolve`) and the Analytics KPIs, top-rule table, campaign-health
table and CSV export (derived from submissions/findings).

**Still view-local (not yet wired):**
| View | What is still demo | Backend that should feed it |
|---|---|---|
| `AnalyticsHealthView` | donut, trend line and Guideline Health card | findings-by-category aggregation, compliance-over-time, `/audit/health` |
| `RuleImpactSandboxView` | local rule list / simulated result | `GET /rules`, `POST /simulations` |

**Route aliases** (to match DESIGN.md §8.1): `/creator/sentinel-tasks`,
`/creator/approved-content`, `/manager/submissions`, `/manager/guidelines`,
`/manager/assets`, `/manager/audit-events` all resolve to the same views.

These three are marked in code and should be wired before claiming full
backend parity for every widget. Some static reviewer labels now read
**“Brand Manager”** (a role, not a fabricated person).

## 6. Theme conversion

The source UI was slate/blue/indigo. It was converted to the product palette:

- `blue-*` / `indigo-*` / `sky-*` → `brand-*` (forest green)
- `purple-*` / `violet-*` → `grape-*` (sage/olive)
- `slate-*` → `ink-*` / warm ivory / `line`
- `#f8fafc` → `#F7F3EA` (warm ivory)
- conic gradients and badge glows rethemed to green/sage/amber/red.

A scan of `src/v2` finds **0 blue/purple utility classes**.

## 6.1 Imagery

The source UI relied on Unsplash URLs and SVG initials. The backend already had
10 uploaded demo photos, but they are **third-party brand shots** (Curology,
Nécessaire, Estée Lauder, NARS…), which would misrepresent the fictional
PureGlow brand. Instead, six cohesive fictional images were generated and
stored locally:

| File | Use |
|---|---|
| `public/images/brand/serum.webp` | Serums, sensitive-skin and product-claims cards |
| `public/images/brand/jar.webp` | Moisturiser / product-launch cards |
| `public/images/brand/summer.webp` | Summer, sale and offer campaigns |
| `public/images/brand/gift.webp` | Festival / holiday / legal-compliance cards |
| `public/images/brand/lifestyle.webp` | Wellness, influencer and partner cards |
| `public/images/brand/guidelines.webp` | Brand-guideline / awareness cards |

- All six are 900 px-wide WebP (total ~500 KB, down from ~11 MB of PNG).
- Assignment is deterministic by title keywords, with a hash fallback, so the
  same record always gets the same image.
- Submission cards, the review drawer, the asset library, exception cards,
  Sentinel alerts and guideline cards all use this set.
- The backend's `backend/uploads/demo_*.jpg` files are left untouched (they are
  the A1 analysis inputs); replace them before a public demo if the third-party
  branding is a concern.

## 7. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | passes (909 kB JS / 201 kB gzip; code-splitting still recommended) |
| `node v2-sweep.mjs` | 21/21 routes load, **0 console errors** |
| `node v2-images-check.mjs` | 10 key pages, **0 broken images**, 0 console errors |
| `node v2-new-pages-check.mjs` | 7 pages incl. aliases, **0 console errors** |
| Backend suite | 138 passed (unchanged) |

## 8. Known limitations / next steps

1. Finish the Analytics donut/trend/guideline-health cards and wire the Rule Impact Sandbox.
2. Add the Brand & Product Assets picker to the v2 `NewContentView` (the legacy
   `/app/new` page already has it).
3. Delete the unused `demo*` arrays left in the ported views.
4. Route-level code splitting to reduce the 909 kB bundle.
5. The v2 UI uses SVG placeholder thumbnails because text submissions have no
   stored poster; real poster thumbnails are available for A1-analysed assets.
