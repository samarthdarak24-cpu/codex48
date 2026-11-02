# Precedent Design System

The single reference for colour, type, spacing and motion in the v2 interface.
Everything below is implemented in `tailwind.config.js`, `src/index.css` and
`src/v2/components/motion/index.tsx` — this document describes what exists, not
what is planned.

---

## 1. Colour

Warm editorial palette. No blue, no purple, anywhere.

| Token | Hex | Use |
| --- | --- | --- |
| `brand-500` / `brand-600` | `#244C3A` family | Primary actions, active nav, focus rings |
| `sage-500` | `#A8B7A0` family | Approved / passed states, secondary accent |
| `olive-*` | olive scale | Advisory AI content, neutral informational panels |
| `terracotta-500` | `#C77B5A` family | "Needs changes", soft warnings |
| `warn-*` (amber) | `#D9A441` family | Pending, caution, review-needed |
| `danger-500` | red family | Rejections, violations, destructive actions |
| `cream-50/100` | `#F8F7F2` / `#F1EFE6` | Page and card surfaces |
| `ink` / `ink-900` | `#272B27` family | Primary text, dark chips |
| `muted` / `muted-light` | `#85877F` family | Secondary text, placeholders |
| `line` / `line-strong` | border scale | Card borders, dividers |

Rules of thumb:

- Forest green is the only primary action colour. Never use danger for a
  primary button.
- Terracotta and amber are for attention, never decoration.
- Status colour mapping is fixed: approved → sage, pending → amber,
  needs-changes → terracotta, rejected → danger, in-review → brand.

---

## 2. Typography

| Role | Class pattern |
| --- | --- |
| Page title | `text-3xl font-semibold tracking-[-0.02em] text-ink` |
| Eyebrow | `text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600` |
| Section heading | `text-sm font-semibold text-ink` |
| Card title | `text-xs font-semibold text-ink` |
| Body | `text-xs leading-relaxed text-ink-600` |
| Meta | `text-2xs text-muted` |
| Numeric | `tabular-nums` always, so counters do not jitter |

One `h1` per rendered screen. Manager views define several `h1`s but they sit in
mutually exclusive early returns (role guard, loading, main), so only one is
ever in the DOM.

---

## 3. Motion principles

- **Easing**: every animation uses `EASE = [0.22, 1, 0.36, 1]` (soft decelerate).
  No bounce, no spring overshoot on layout.
- **Durations**: `fast 0.22s`, `base 0.4s`, `slow 0.7s`. Entrances 0.3–0.5s.
  Hover/tap feedback 0.15–0.25s.
- **Distance**: entrances move 8–16px. Page transition is `y: 10`. Hover lift is
  `-6px` (medium) / `-10px` (high). Tap is `scale: 0.97`.
- **Stagger**: 0.04–0.08s per child, capped so a 20-item list does not take 2s.
- **Only** `transform` and `opacity` are animated. Never animate layout
  properties (width/height/top/left) except through motion's `layout` prop.
- **Reduced motion**: every component calls `useReducedMotion()` and renders its
  final state directly — the animated wrapper is not mounted at all. `index.css`
  additionally forces animation/transition duration to `0.001ms` globally under
  `prefers-reduced-motion: reduce`.

---

## 4. Component library

All exported from `src/v2/components/motion/index.tsx`.

### Structure and entrances

| Component | Props | Notes |
| --- | --- | --- |
| `PageTransition` | `children, className` | Fade + 10px lift on mount. Wrap every view. |
| `Reveal` | `children, delay?, className` | Viewport-triggered fade + lift, fires once. |
| `ScrollReveal` | `children, delay?, direction?: 'up'\|'down'\|'left'\|'right', className` | Directional scroll reveal. |
| `Stagger` | `children, className` | Orchestrates children timing. |
| `StaggerItem` | `children, className` | Child of `Stagger`. |
| `LayoutTransition` | `mode: 'grid'\|'list', children, className` | Animates layout swaps between grid and list. |

### Surfaces

| Component | Props | Notes |
| --- | --- | --- |
| `AnimatedCard` | `children, className, interactive?, onClick?, delay?, style?` | Card with entrance; `interactive` adds cursor + hover lift. |
| `HoverLiftCard` | `children, className, onClick?, elevation?: 'medium'\|'high', delay?, style?` | Stronger lift (-6 / -10px). Self-animates on mount. |
| `ImageHoverEffect` | `children, className` | Clips and zooms its child to 1.05 on frame hover. |

### Feedback and status

| Component | Props | Notes |
| --- | --- | --- |
| `AnimatedBadge` | `children, tone?: Tone, variant?: 'solid'\|'soft', className` | Scale-in badge. |
| `StatusPill` | `status: 'approved'\|'pending'\|'rejected'\|'draft', className` | Fixed four-label pill. Do **not** use it for five-state enums — it would mislabel "Needs Changes" as "Pending". |
| `PulseDot` | `tone?: Tone` | Live/unread indicator. |
| `SuccessCheck` | `size?` | SVG check that draws itself. |
| `ProcessingSpinner` | `size?, tone?: Tone, className?` | Two concentric counter-rotating rings. |
| `Skeleton`, `SkeletonText`, `SkeletonCard` | `className`, `lines?` | Loading placeholders. |

### Interaction

| Component | Props | Notes |
| --- | --- | --- |
| `AnimatedButton` | `children, variant?: 'primary'\|'secondary', disabled?, onClick?, className?, type?` | Hover 1.02, tap 0.97. |
| `AnimatedTabs` | `tabs: {id,label}[], active, onChange(id), className?` | Sliding indicator, scoped per instance via `useId`. |
| `FilterPills` | `options: {id,label}[], selected: string[], onChange(selected), className?` | Multi-select by contract; single-select screens filter the toggled id out. |
| `AnimatedTooltip` | `content, children, placement?: 'top'\|'bottom'\|'left'\|'right'` | Hover tooltip. |
| `AnimatedModal` | `open, onClose, title, description?, maxWidth?, footer?, children` | Scale + overlay. |
| `AnimatedDrawer` | `open, onClose, title, subtitle?, width?, footer?, children` | Slide-in side panel. |

### Data and domain

| Component | Props | Notes |
| --- | --- | --- |
| `AnimatedCounter` | `value, duration?, decimals?, prefix?, suffix?, className?` | Tween to the real value; final frame always equals it. |
| `NumberTicker` | `value, duration?, className?` | Faster, more dramatic digit flip. |
| `AnimatedProgress` | `value, max, tone?, label?, showValue?, height?` | Animated bar. |
| `RingProgress` | `value, max, size?, stroke?, tone?, centerLabel?, centerSublabel?` | Animated ring. |
| `Sparkline` | `points: number[], width?, height?, tone?` | Draws via `pathLength`. Returns `null` under 2 points. |
| `BarSeries` | `data: {label,value}[], height?, tone?, formatValue?` | Bar chart. |
| `ChartContainer` | `children, className` | Frame for charts. |
| `SectionHeader` | `title, subtitle?, eyebrow?, actions?` | Standard panel heading. |
| `Timeline` | `items: TimelineItem[], className?` | Staggered entries with hover shift. |
| `AgentStatusCard` | `name, role, state: AgentState, detail, icon, index?` | AI crew card. |
| `EmptyState` | `icon, title, description, action?: {label, onClick}, className?` | The only empty state. |
| `ScanningEffect` | `active: boolean, children?, className?` | Sweeping gradient for AI processing. |
| `UploadAnimation` | `isDragging: boolean, children, onDrop?, className?` | Drop zone that scales to 1.02 while dragging. |

### Tone

`Tone = 'brand' | 'sage' | 'olive' | 'terracotta' | 'amber' | 'danger'`

---

## 5. Patterns

- **Filters**: `FilterPills` for chip rows, `AnimatedTabs` for a small fixed set
  of views (list/grid, date ranges).
- **Lists**: `Stagger` + `StaggerItem` for entrance, `HoverLiftCard` or
  `AnimatedCard interactive` for per-item hover.
- **Empty**: always `EmptyState` with an icon, a plain-language title and a
  description that says why it is empty. Never invent placeholder rows.
- **Loading**: skeletons shaped like the content, never a bare spinner.
- **Numbers**: `AnimatedCounter` for metrics, `NumberTicker` for a single hero
  number. Counters only ever animate to values that came from the API.

---

## 6. Verification

- `npm run typecheck` — zero errors.
- `npx vite build` — main bundle ~318 KB gzipped, CSS ~28 KB gzipped.
- `node scripts/verify_21_screens.mjs` — walks all 21 screens as both roles,
  records console/page errors and horizontal overflow, and writes 1920×1080
  screenshots to `docs/screenshots/`.
