# Precedent

**A Smarter Way to Manage Brand Rules and Approvals.**

AI-assisted brand governance and content approval platform. Marketing teams submit content, Precedent checks it
against structured brand rules and cites the exact guideline passage behind every finding, brand managers approve
specific content versions, scoped exceptions expire on their own schedule, and proposed rule changes can be simulated
against real stored content before anything is activated.

---

## Status — Phase 2 of 6 complete (frontend)

This repository currently contains **the complete frontend**, built strictly against the 11 reference screens.
The backend, database, document extraction, LLM integration and deployment are the next phases and are **not built
yet**. The table below is deliberately literal — nothing here claims to be finished that isn't.

| Area | State |
|---|---|
| 12 screens (login + 5 creator + 6 manager) | ✅ Built, responsive, shared design system |
| Design system (tokens, cards, tables, badges, modals, toasts, empty/loading/error states) | ✅ Built |
| Navigation, route guards, role separation | ✅ Built (client-side; server enforcement pending) |
| Deterministic rule engine (text + asset rules) | ✅ Working prototype in `src/lib/ruleEngine.ts` |
| Content submission → findings → version → decision → audit | ✅ Works end to end in the browser |
| Exception request → decision → expiry checks | ✅ Works end to end in the browser |
| Rule impact simulation | ✅ Works, evaluates real stored content |
| Audit trail + CSV export | ✅ Works |
| Persistence | ⚠️ In-memory + `sessionStorage` demo store — **not** PostgreSQL yet |
| Authentication | ⚠️ Frontend session only — **no** password hashing or tokens yet |
| Document upload / PDF+DOCX extraction | ⚠️ UI + metadata only — no PyMuPDF / python-docx yet |
| LLM-assisted rule extraction | ❌ Not built |

---

## Run it

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # typecheck + production build
npm run typecheck
```

### Demo accounts

Fictional accounts. Both use the password `precedent`.

| Role | Email | Lands on |
|---|---|---|
| Brand Manager | `david.kim@pureglow.co` | `/manager/overview` |
| Content Creator | `emily.carter@pureglow.co` | `/app/overview` |

The login screen has one-click buttons for both. The role comes from the resolved account record, never from a
field the browser can set, and each role is blocked from the other's routes.

---

## Screen inventory

Mapped 1:1 to the reference images.

| # | Reference | Route | File |
|---|---|---|---|
| — | Login | `/login` | `src/pages/Login.tsx` |
| 1 | Content Team Overview | `/app/overview` | `src/pages/content/Overview.tsx` |
| 2 | New Content | `/app/new` | `src/pages/content/NewContent.tsx` |
| 3 | My Submissions | `/app/submissions` | `src/pages/content/Submissions.tsx` |
| 4 | Brand Guidelines (creator) | `/app/guidelines` | `src/pages/content/Guidelines.tsx` |
| 5 | Review & Feedback | `/app/feedback/:id?` | `src/pages/content/Feedback.tsx` |
| 6 | Brand Manager Overview | `/manager/overview` | `src/pages/manager/Overview.tsx` |
| 7 | Review Queue | `/manager/queue/:id?` | `src/pages/manager/Queue.tsx` |
| 8 | Guidelines & Rules | `/manager/guidelines` | `src/pages/manager/GuidelinesRules.tsx` |
| 9 | Exceptions | `/manager/exceptions` | `src/pages/manager/Exceptions.tsx` |
| 10 | Rule Impact Sandbox | `/manager/sandbox` | `src/pages/manager/Sandbox.tsx` |
| 11 | Audit History | `/manager/audit` | `src/pages/manager/Audit.tsx` |

### Deliberate deviation from the references

Reference image 8 shows an **Upload Document** button on the creator's Brand Guidelines page. The creator view here
is read-only and shows a "Read-only access" chip instead, because the brief states creators must not be granted
policy-management permissions. Upload lives on the manager's Guidelines & Rules page.

---

## Architecture

```
src/
  components/
    layout/Shell.tsx        Sidebar, topbar, page header, rail helpers, route layout
    ui/                     Button, Badge, Card, Field, Table, Misc (Avatar/Donut/Tabs/Modal), Toast
  context/
    AuthContext.tsx         Session, login, logout, role guard
    DataContext.tsx         Working set + all mutations (mirrors the future API surface)
  hooks/useApiData.ts       Loading / error / refetch primitive
  lib/
    types.ts                Domain types — the backend contract
    selectors.ts            Every dashboard metric is DERIVED here, never hardcoded
    ruleEngine.ts           Deterministic rule evaluation (text + asset facts)
    demo-data.ts            ⚠️ Isolated fictional dataset
    utils.ts                Dates, formatting, cn()
  services/
    api.ts                  The single seam where mock data becomes real API calls
    demoStore.ts            ⚠️ Temporary sessionStorage stand-in for PostgreSQL
  pages/                    One file per screen
```

### Two rules the codebase follows

1. **No hardcoded metrics.** Every number on every dashboard comes from `lib/selectors.ts`, computed from the
   records the service layer returned. Empty database → honest zero states, not fake numbers.
2. **One seam for data.** No component calls `fetch` or imports demo data. Swapping in the FastAPI backend means
   editing `services/api.ts` and deleting `services/demoStore.ts` — nothing else changes.

### The rule engine

`src/lib/ruleEngine.ts` is deterministic and dependency-free. It is the client mirror of what will become
`app/services/rule_engine.py`.

- **Text rules** (`CL-03`, `CL-04`, `CL-06`, `MK-02`, `PA-05`, `TV-02`) are evaluated with explicit, testable
  conditions — superlatives, regulated health language, discount claims without a window, urgency stacking,
  unapproved claim wording, missing disclosure.
- **Asset rules** (`BR-01`, `LO-02`, `TY-01`) read facts captured with the submission
  (`backgroundColour`, `clearSpaceRatio`, `typeface`, `aspectRatio`).
- When a rule **cannot** be evaluated from stored evidence, the result is `unknown` → surfaced as
  **Needs review**, never as a pass or a fail.

Every finding cites the `sourcePassage` stored on the rule record itself, so a displayed citation always exists in
the source data. Nothing is generated by a model.

### Simulation semantics

The sandbox compares the current rule set against a proposed rule set over **stored** content:

- A change that *adds* an allowed colour resolves the assets that were previously flagged.
- A change that *tightens* a rule leaves recorded violations standing.
- Assets whose properties could not be extracted are reported as **Needs Review**.
- A simulation **never** activates the proposed rule; activation is a separate manager action.
- With no stored content the result is an explicit empty state, not a fabricated percentage.

---

## What is intentionally not real yet

| Thing | Why | Where it gets fixed |
|---|---|---|
| `sessionStorage` demo store | No API exists yet; without it a reload would wipe the workflow you just demonstrated | Delete `services/demoStore.ts` when `services/api.ts` hits FastAPI |
| Password check in `authApi.login` | No backend to hash against | Argon2 + signed session tokens server-side |
| File upload | No parser wired | `POST /guidelines` with PyMuPDF / python-docx |
| Rule extraction suggestions | No LLM call yet | Backend service with citation verification |
| Every record | Fictional demo dataset, labelled in the sidebar | PostgreSQL + migrations |

The sidebar footer reads **"Fictional demo workspace · no customer data"** and the user menu has
**Reset demo data** so a reviewer can return to a clean seed at any time.

---

## Design system

| Token | Value |
|---|---|
| Canvas | `#F5F8FD` |
| Ink / heading | `#0F2138` |
| Muted text | `#6B7C93` |
| Border | `#E7EEF8` |
| Primary | `#2F6FED` |
| Success / Warn / Danger / Grape | `#10B981` / `#F0A32A` / `#EF4444` / `#8B5CF6` |
| Radius | 10 / 14 / 18 / 22 px |
| Font | Inter (400–800), tabular numerals for metrics |
| Icons | Lucide, 15px in nav, 1.9–2.2 stroke |

Shared components: `Button`, `Badge` (+ domain status/priority/impact variants), `Card`/`CardHeader`/`MetricCard`,
`Field`/`Input`/`Select`/`Textarea`/`SearchInput`/`Checkbox`, `DataTable`/`Pagination`/`EmptyState`,
`Avatar`/`Thumb`/`Donut`/`ProgressBar`/`Tabs`/`Skeleton`/`Modal`, `Toast`.

Accessibility: labelled inputs, `aria-invalid` + `role="alert"` on validation, focus-visible rings, keyboard-dismissible
modals, `prefers-reduced-motion` respected, tables with `scope="col"` headers.

Responsive: 3-column desktop → 2-column tablet → single column mobile, sidebar collapses to a drawer, and
secondary table columns drop out below `sm` / `md` / `lg` so no row is ever clipped.

---

## Next phases

1. **Backend** — FastAPI services for auth, workspaces, guidelines, rules, claims, submissions, review, exceptions,
   simulation, audit; every mutation transactional.
2. **Database** — PostgreSQL + Alembic migrations; the types in `lib/types.ts` are already the schema shape.
3. **Documents & AI** — PyMuPDF / python-docx extraction with page-level citations, LLM rule suggestions that must
   be confirmed by a human and must resolve to a real passage.
4. **Integration** — replace `services/api.ts` internals with real calls; delete `demoStore.ts`.
5. **Tests** — backend tests for permissions, versioning, exception scope/expiry, conflict detection, simulation
   reproducibility; Playwright for the end-to-end journey.
6. **Deployment** — environment config, health checks, CORS, secrets, README handover.

## Proposed Round 3 improvements

1. **Visual brand checking** — analyse posters and images directly (palette extraction, logo detection, type
   recognition) so colour and layout rules are evaluated from pixels rather than stored metadata.
2. **Retroactive impact alerts** — when a rule or approved claim changes, automatically surface previously approved
   content that is now non-compliant, with an owner and a remediation queue.
3. **Multi-brand workspaces** — isolated brand scopes, per-brand rule sets, cross-brand reporting, and integration
   with existing content workflows (CMS, DAM, ad platforms) so review happens where content is produced.
