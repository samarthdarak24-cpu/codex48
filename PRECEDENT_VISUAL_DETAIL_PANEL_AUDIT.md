# PRECEDENT — Visual Detail Panel Audit

**Scope:** All 21 Precedent feature screens (10 Content Creator, 11 Brand Manager)
**Focus:** Colour-coded detail panels, connected visual flows, and reusable visual primitives
**Date:** 2 November 2026
**Build:** React 18 · TypeScript · Vite 5 · Tailwind 3 · Motion for React · Lucide · Recharts · React Flow

---

## 1. Executive summary

Every detail surface in Precedent now answers five questions the moment it opens:

| Question | Answered by |
| --- | --- |
| **What is this?** | Tinted `DetailHeader` (icon + title + short description + status/version/date) |
| **Why is it important?** | `InfoCard` "At a glance" with a meaning-coded tone |
| **What evidence supports it?** | `EvidenceCard` / `SourceRefCard` with document + page and a real open action |
| **What happens next?** | `VisualFlow` / `StepTrail` ending in the recorded next step |
| **What can I do?** | Sticky `ActionFooter` containing only backend-supported actions |

The shared vocabulary lives in **`src/v2/components/detail/index.tsx`** (detail kit) and **`src/v2/components/motion/index.tsx`** (motion primitives). Screens compose these instead of hand-rolling bordered text blocks, which is what made the original drawers read as walls of grey text.

**Result:** 21/21 screens verified rendering with **0 console errors**, TypeScript clean, production bundle builds.

---

## 2. The shared visual system — component inventory

All components support: custom colour (tone), icon, heading, description, optional metadata, optional action, and responsive behaviour.

| Component | File | Purpose |
| --- | --- | --- |
| `DetailDrawer` | `detail/index.tsx` | Right-hand panel; pinned header + footer, only the body scrolls |
| `DetailHeader` | `detail/index.tsx` | Soft tinted header: icon in a circular chip, title, description, badges, meta, close |
| `InfoCard` | `detail/index.tsx` | Tinted card with left rail, icon, eyebrow, title, body, meta, optional `onClick` |
| `StatusBadge` | `detail/index.tsx` | Pill with tone + dot/icon; single source of status → colour |
| `MetaChip` | `detail/index.tsx` | Neutral chip for versions, ids, dates |
| `SectionHeader` | `detail/index.tsx` | Drawer-scale eyebrow + title + subtitle + action |
| `EvidenceCard` | `detail/index.tsx` | Quoted passage + document label + page reference |
| `SourceRefCard` | `detail/index.tsx` | Source document card with page/version and an "open" action only when a real handler exists |
| `MetadataRow` / `MetadataList` | `detail/index.tsx` | Key/value rows on one shared surface |
| `VisualFlow` | `detail/index.tsx` | Ordered vertical flow container |
| `FlowStep` | `detail/index.tsx` | One node: numbered icon circle, drawn connector + arrowhead, tone, title, body, action |
| `ComparisonPair` | `detail/index.tsx` | Side-by-side contradiction layout (conflicts) |
| `MetricChip` | `detail/index.tsx` | Compact KPI with meaning-coded tone |
| `ActionFooter` | `detail/index.tsx` | Sticky footer with actions + explanatory note |
| `FooterButton` | `detail/index.tsx` | Primary / secondary / ghost action button |
| `TooltipInfo` | `detail/index.tsx` | Accessible Radix tooltip |
| **`StepTrail`** | `detail/index.tsx` | **Horizontal connected process strip** (`done` / `active` / `pending` / `error`) |
| `Timeline` | `motion/index.tsx` | Vertical timeline with animated connector, tone-coded nodes |
| `EmptyState` | `motion/index.tsx` | Illustrated empty state with optional action |
| `AnimatedProgress` / `RingProgress` / `AnimatedCounter` | `motion/index.tsx` | Animated data display used inside panels |

> `StepTrail` was added in this pass so a process can read as a single horizontal line (submission pipeline, simulation run, lifecycle). `VisualFlow` remains the vertical form used inside drawers.

---

## 3. Colour system

One palette across the whole product. Colour encodes **meaning**, never decoration. Blue and purple are not used in any live view.

| Token | Colour | Meaning | Where it appears |
| --- | --- | --- | --- |
| `brand` | Forest green | The entity itself / primary definition | Rule definition, headers, primary actions |
| `sage` | Sage green | Supporting evidence, successful / approved | Evidence, source passages, approved state |
| `olive` | Muted olive | Neutral context, secondary metadata | Category chips, neutral flow steps |
| `warn` | Amber | Pending, needs attention, upcoming expiry, **next step** | Review-required, recorded next step |
| `terracotta` | Terracotta | Warnings, significant change, exception variance | Enforcement, conflicts, exceptions |
| `danger` | Muted red | Violations, conflicts, rejections, errors | Violations, failed checks |
| `cream` / `neutral` | Warm cream | Inert metadata | Metadata lists, empty surfaces |
| `ink` / `muted` | Charcoal / grey | Main content / secondary text | Typography |

Saturation is used sparingly: soft background tints, 3px left rails, icon chips and small badges — not full-bleed colour blocks.

---

## 4. Screen-by-screen audit

Legend — **Drawer** = side detail panel; **Flow** = connected visual process; **Info** = tone-coded info/evidence cards; **Timeline** = activity timeline; **StepTrail** = horizontal process strip.

### Content Creator

| # | Screen | Detail panel | Visual process | Status |
| --- | --- | --- | --- | --- |
| 1 | Creator Overview (Dashboard) | — | **StepTrail lifecycle** + **activity Timeline** | ✅ Upgraded |
| 2 | New Content | — | **StepTrail** submission pipeline | ✅ Upgraded |
| 3 | My Submissions | Drawer + Flow + Info | Vertical flow of version/review | ✅ |
| 4 | AI Review | — | **StepTrail** 6-stage pipeline + 5 agent cards | ✅ Upgraded |
| 5 | Brand Guidelines | Drawer | Document metadata | ✅ |
| 6 | Exception Requests | Drawer + Timeline | Request → review → decision → expiry | ✅ |
| 7 | Sentinel Tasks | Drawer + Timeline | Alert → affected content → reassessment | ✅ |
| 8 | Notifications | Drawer | Category icons + read/unread | ✅ |
| 9 | Approved Content | Flow + Info | Approval history | ✅ |
| 10 | Creator Profile | Timeline | Account sections | ✅ |

### Brand Manager

| # | Screen | Detail panel | Visual process | Status |
| --- | --- | --- | --- | --- |
| 11 | Brand Manager Overview | Drawer + Timeline | Compliance + agent activity | ✅ |
| 12 | Review Queue | Drawer + Flow + Info | Submission → AI → evidence → decision | ✅ |
| 13 | All Submissions | Drawer + Info | Version + submission timeline | ✅ |
| 14 | Brand Guidelines | Drawer | Category colours + version history | ✅ |
| 15 | **Rules & Conflicts** | **Drawer + Flow + Info (flagship)** | Rule → Condition → Source → Enforcement → Next step | ✅ Upgraded |
| 16 | Exceptions | Drawer + Timeline | Pending → decision → expiry | ✅ |
| 17 | Rule Impact Sandbox | Flow (React Flow + **StepTrail**) | Current → Proposed → Impact → Affected → Result | ✅ Upgraded |
| 18 | Sentinel Monitoring | Drawer + Timeline | Rule change → affected content → reassessment | ✅ |
| 19 | Asset Library | Modal detail | Image grid + approval badges | ✅ |
| 20 | Analytics & Health | **Drill-down drawer** | Metric cards + charts + category drill-down | ✅ Upgraded |
| 21 | Audit History | Timeline | Action → entity → details → version → time | ✅ |

---

## 5. The flagship — Rules & Conflicts drawer

The right-side drawer was rebuilt around a single connected flow:

```
RULE DEFINITION   (forest green)
      ↓
CONDITION         (olive)
      ↓
SOURCE GUIDELINE  (sage · document + page + "Open the document")
      ↓
ENFORCEMENT       (terracotta · scope + priority chips)
      ↓
RECORDED NEXT STEP (amber)
```

- **Header:** soft circular icon, category eyebrow, title, description, `Active` badge, version chip, effective date, reviewed date, close.
- **At a glance:** sage `InfoCard` explaining why the rule matters.
- **Flow:** numbered icon circles joined by drawn connector lines ending in arrowheads; each step a distinct soft tint.
- **Stored record:** `MetadataRow` list (category, version, effective, scope, priority, status).
- **Sticky footer:** `View source`, `Test in sandbox`, `Close` + explanatory note. Actions appear only when the record supports them.
- **Conflicts:** rendered as a dedicated warning layout with `ComparisonPair` (Rule A vs Rule B, "contradicts") rather than a normal flow.

Verified visually: full flow, source card and sticky footer render without clipping.

---

## 6. What this pass changed

| Change | File |
| --- | --- |
| Added reusable horizontal `StepTrail` (+ `StepState`, `StepTrailItem`) to the shared kit | `src/v2/components/detail/index.tsx` |
| Added the 6-stage AI analysis pipeline above the Review Crew cards, state derived from stored artefacts | `src/v2/components/views/creator/AIReviewView.tsx` |
| Added the 5-step submission pipeline, state mirrored from the form | `src/v2/components/views/creator/NewContentView.tsx` |
| Added the 5-step simulation flow (current → proposed → impact → affected → result) | `src/v2/components/views/manager/RuleImpactSandboxView.tsx` |
| Added the submission lifecycle strip + recent-activity `Timeline` | `src/v2/components/views/creator/CreatorDashboardView.tsx` |
| Added a real drill-down `DetailDrawer` for findings-by-category (severity split + stored record) | `src/v2/components/views/manager/AnalyticsHealthView.tsx` |

All additions are **additive** — no routes, backend calls, role permissions, or existing buttons were changed. Every value displayed is read from the existing API/context; no evidence, counts or statuses are invented.

---

## 7. Verification

### 7.1 Static checks
- `npx tsc --noEmit` → **exit 0**
- `npx vite build` (fresh outDir) → **exit 0**, 2990 modules transformed

> Note: `npm run build` targeting the default `dist/` is blocked by the sandbox's bulk-delete guard when Vite empties `dist/images` (72 files > 50 threshold). This is an environment guard, not a code defect. Building to a fresh output directory succeeds.

### 7.2 Live 21-page sweep (`qa_run_check.mjs`, headless Chrome)

| Role | Page | Result |
| --- | --- | --- |
| Manager | Overview | PASS |
| Manager | Review Queue | PASS |
| Manager | All Submissions | PASS |
| Manager | Brand Guidelines | PASS |
| Manager | Rules & Conflicts | PASS |
| Manager | Exceptions | PASS |
| Manager | Rule Impact Sandbox | PASS |
| Manager | Sentinel Monitoring | PASS |
| Manager | Asset Library | PASS |
| Manager | Analytics & Health | PASS |
| Manager | Audit History | PASS |
| Manager | Notifications | PASS |
| Manager | Submission detail | PASS |
| Creator | Dashboard | PASS |
| Creator | New Content | PASS |
| Creator | My Submissions | PASS |
| Creator | AI Review | PASS |
| Creator | Brand Guidelines | PASS |
| Creator | Exception Requests | PASS |
| Creator | Sentinel Tasks | PASS |
| Creator | Notifications | PASS |
| Creator | Approved Content | PASS |
| Creator | Profile | PASS |

**23/23 checks pass · 0 failures · 0 console errors.**

### 7.3 Focused visual regression (screenshots)

| Screen | Check | Result |
| --- | --- | --- |
| Rules & Conflicts drawer | Flow, evidence, sticky footer | PASS |
| AI Review | Pipeline + agent cards | PASS |
| New Content | Submission pipeline | PASS |
| Rule Impact Sandbox | Simulation flow | PASS |
| Creator Dashboard | Lifecycle + activity timeline | PASS |
| Analytics & Health | Drill-down drawer | PASS |
| Asset Library | Image grid + detail modal | PASS |

---

## 8. Interaction map

| Element | Real action |
| --- | --- |
| Rule card "Open" / title | Opens the detail drawer for that rule |
| Flow step "Open the document" | Opens the stored guideline PDF in a modal |
| "View source" | Loads the real guideline file via `fetchGuidelineBlobUrl` |
| "Test in sandbox" | Closes the drawer and navigates to Rule Impact Sandbox |
| "Mark conflict as reviewed" / "Confirm rule" | Calls the context write handler, refreshes, toasts |
| Analytics category row | Opens the drill-down drawer for that stored category |
| Dashboard activity item | Card opens the related submission review |
| Sidebar items | Route navigation to the matching feature |

Every interactive element performs a real action; no decorative arrows or dead controls were added.

---

## 9. Accessibility & motion

- Every detail/motion component checks `useReducedMotion()` and renders its final state immediately when reduced motion is requested.
- Drawers close on backdrop click and Escape; the close button is labelled.
- Flows use semantic `<ol>` / `<li>`; `StepTrail` and `VisualFlow` accept an `aria-label`.
- Connectors and decorative icons are `aria-hidden`.
- Status is never conveyed by colour alone — each badge carries a text label.

---

## 10. Known notes

1. **Build output directory** — see §7.1. Use a non-existent outDir when verifying locally.
2. **Unused legacy files** — `src/v2/components/ui/StatCard.tsx` and `SharedComponents.tsx` still contain blue/purple tokens but are **not imported by any live view**. The rendered UI is entirely on the warm palette. They can be deleted in a cleanup pass.
3. **Asset Library** uses a modal rather than the side drawer for image detail (different shell, same tokens). This is intentional; the content is image-led rather than record-led.
4. **Analytics drill-down** covers findings-by-category (the densest stored breakdown). Other series remain chart-only until the API exposes per-point detail.

---

## 11. Final goal check

| Requirement | Status |
| --- | --- |
| Preserve all 21 pages and routes | ✅ |
| Preserve backend functionality and role permissions | ✅ |
| Use real database values only | ✅ |
| Reusable components instead of duplication | ✅ (shared detail kit) |
| Consistent colour system (no blue/purple) | ✅ |
| Connected arrows only where they explain a relationship | ✅ |
| Subtle, quick motion with reduced-motion support | ✅ |
| Responsive layouts | ✅ |
| Detail panels explain WHAT / WHY / EVIDENCE / NEXT / ACTION | ✅ |
