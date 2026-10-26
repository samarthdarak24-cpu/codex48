# Precedent — Implementation Audit

> Produced before building the backend, as the master prompt's strongest recommendation.
> Scope: inspect the existing repository, state what is real, what is missing, and the
> exact execution plan for the missing functionality.

## 1. What already exists (verified)

| Area | State | Evidence |
|---|---|---|
| Frontend (12 screens) | ✅ Complete | `src/pages/**`, `src/components/**` |
| Design system | ✅ Complete | `tailwind.config.js`, `src/index.css`, `src/components/ui/**` |
| Deterministic rule engine (client) | ✅ Prototype | `src/lib/ruleEngine.ts` |
| End-to-end UI workflow | ✅ Works in browser | Playwright checks pass, `vite build` clean |
| Marketing site | ✅ Complete | `src/pages/marketing/Home.tsx` |
| **Backend / API** | ❌ **None** | No `backend/`; only `services/api.ts` mock + `services/demoStore.ts` |
| **Database** | ❌ None | No SQLAlchemy / Alembic / Postgres |
| **Auth** | ⚠️ Frontend-only | `AuthContext` session, plaintext demo passwords |
| **Document extraction** | ⚠️ UI only | No PyMuPDF / python-docx |
| **AI layer** | ❌ None | No LLM calls anywhere |
| **Product-image management** | ❌ None | No asset library / upload / approval |

## 2. The contract is already specified

`src/lib/types.ts` defines every entity the database needs. It is treated as the
schema. The backend maps it 1:1:

- `User`, `GuidelineDoc`, `Rule`, `ApprovedClaim`
- `Submission` → + `ContentVersion[]`, `Finding[]`, `Comment[]`, `ReviewDecision[]`, `AssetFacts`
- `ExceptionRequest`, `Simulation`, `AuditEvent`, `BrandAsset` (new, for image mgmt)

`src/services/api.ts` already exposes the exact read surface the UI consumes
(`submissions`, `submission(id)`, `guidelines`, `rules`, `claims`, `exceptions`,
`simulations`, `audit`, `team`) plus `authApi.login`. The wiring rule is preserved:
**only `services/api.ts` changes; no component imports demo data.**

## 3. Environment constraints & decisions

| Constraint | Finding | Decision |
|---|---|---|
| PostgreSQL / pgvector | Not installed in this sandbox | Build dialect-agnostic SQLAlchemy; default `DATABASE_URL=sqlite:///./precedent.db` so it runs + verifies now. Postgres/pgvector is a 1-line env switch. `pgvector` is an optional, guarded enhancement — never fabricated. |
| LLM API key | None in env | `app/ai.py` reads `LLM_API_KEY`/`LLM_BASE_URL`; **degrades gracefully** to `None` when unset. Deterministic rule engine stays the sole source of truth. No invented content. |
| Visual identity ("no blue/purple") | Existing chrome uses blue `#2F6FED` + grape `#8B5CF6` | Preserve existing app chrome (already built). New backend-generated outputs (PDF/email/asset reports) and any new surfaces use green/forest/ivory. No *new* blue/purple introduced. |

## 4. Architecture

```
backend/
  app/
    main.py            FastAPI app, CORS, router wiring, seed-on-empty
    config.py          pydantic-settings (DATABASE_URL, secret, LLM, uploads, CORS)
    db.py              engine, SessionLocal, Base, get_db, init_db
    ids.py             new_id(prefix)
    models.py          SQLAlchemy models (1:1 with types.ts)
    schemas.py         auth + common Pydantic
    security.py        Argon2 hashing + JWT
    deps.py            get_current_user, require_manager (RBAC)
    rule_engine.py     Python port of src/lib/ruleEngine.ts (deterministic)
    ai.py              configurable LLM client, graceful degrade
    services/
      audit.py         record() helper (all modules call it)
      <domain>.py      submissions, documents, rules, claims, exceptions, simulation, assets
    routers/
      <domain>.py      REST endpoints
  alembic/             migrations (env.py wired to settings)
  seed.py              fictional demo data mirroring src/lib/demo-data.ts
  tests/               pytest: engine, auth, RBAC, exceptions, simulation, conflicts, audit
  requirements.txt
```

**Conventions**
- Request bodies: snake_case JSON. Responses: camelCase JSON matching `types.ts`.
- Auth: `Authorization: Bearer <jwt>`. Two roles (`creator`, `manager`); manager-only
  routes raise 403 for creators. Role resolved server-side from the user record.
- Every mutation writes an `AuditEvent`. Approvals bind to the exact submission
  version. Exceptions enforce scope + expiry (expired → cannot be approved).
- Simulation never activates a rule; it only compares against stored content.

## 5. The 8 core features (backend-backed)

1. Brand Guideline Library — `GET/POST /guidelines`, PDF/DOCX upload + extraction.
2. Evidence-Linked Review — findings cite the rule's stored `sourcePassage`.
3. Minimal-Edit Suggestions — deterministic `suggestedFix` from the rule engine.
4. Version-Based Approvals — `POST /submissions/:id/versions` + decide on a version.
5. Exception Rulings — create/decide with scope + expiry enforcement.
6. Rule Conflict Detection — `GET /rules/conflicts` (port of `detectConflicts`).
7. Rule Impact Sandbox — `POST /simulations` over stored content.
8. Audit Log + Guideline Health — `GET /audit`, derived health metrics.
+ Brand/Product Image Management — `GET/POST /assets`, upload to `uploads/`, approve.

## 6. Execution order

1. Foundation (this audit + config/db/models/schemas/security/deps/rule_engine/ai/audit).
2. Parallel agents: auth/team, submissions+review, guidelines+documents,
   rules+conflicts, claims, exceptions, simulations, audit-read, assets, seed, pytest,
   frontend wiring.
3. Integrate, run (SQLite), pass pytest, Playwright e2e against the real backend.
4. Update README.

## 7. Honesty guarantees

- Nothing is fabricated: when no LLM key is set, AI features return "not configured".
- Citations always resolve to a stored `sourcePassage`.
- Empty database → honest zero states (selectors derive every metric).
- The frontend's "Fictional demo workspace" label is preserved for seed data.
