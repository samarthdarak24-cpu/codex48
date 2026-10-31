# Roadmap

Ordered by "what would actually help next", not by what is fun to build. Anything
not shipped is marked **future** — nothing below is a promise that code exists.

Legend: ✅ shipped in this build · 🟡 partial · ⬜ not built (future)

---

## Near term — the next two weeks of work

| # | Item | State | Why it matters |
|---|---|---|---|
| 1 | **PostgreSQL + `pgvector` as the default deployment** (migration, ANN index, connection pooling) | 🟡 schema is portable, `USE_PGVECTOR` flag exists, no ANN index or pooled deployment has been run | SQLite is a demo convenience; a real workspace needs concurrent writes and vector search at scale |
| 2 | **Verified Docker run** (`docker compose up` on a clean machine, healthcheck green, seed documented) | 🟡 image written, never executed here | The deployment path is the one thing a reviewer cannot take on trust |
| 3 | **Object storage for uploads** (S3-compatible, signed URLs, lifecycle rules) | ⬜ | Local disk breaks the moment you run more than one replica |
| 4 | **Rate limiting and abuse controls** on `/auth/login`, `/analysis/upload`, `/evidence/review` | ⬜ | Currently only the AI daily call limit exists |
| 5 | **Accessibility audit** with a real screen reader, plus a published conformance statement | 🟡 AA patterns implemented, not audited | Cheap to do, expensive to skip |
| 6 | **Rule authoring for non-engineers** — a condition builder that maps onto engine implementations, or an explicit "this rule has no implementation yet" state | ⬜ | Today a new rule code needs a code change |
| 7 | **Bulk operations on the queue** — assign, tag, and snooze in addition to approve | ⬜ | Approve-only bulk is the thinnest slice that was useful |

---

## Medium term — the next quarter

| # | Item | State | Why it matters |
|---|---|---|---|
| 8 | **Multilingual policy authoring** — guideline documents and rules in Sinhala, Tamil, Devanagari; retrieval is already multilingual | ⬜ | The encoder handles it; the authoring and audit path does not |
| 9 | **Cross-script rule-code reconciliation** — detect where a policy expressed in another script diverges from the `BR-01`-style rule set | ⬜ | Known gap, documented in `LIMITATIONS.md` §5 |
| 10 | **Analytics that answer a question** — time-to-approval, rework rate, override trends by rule, false-positive review | 🟡 raw counts exist (`/audit/health`, AI Trust); no trend analysis | Governance teams need "which rule wastes the most reviewer time", not a pie chart |
| 11 | **Reviewer workload balancing** — assign by capacity, not by "whoever opens the queue" | ⬜ | The queue is currently first-come |
| 12 | **Diff-aware re-review** — when a creator submits v2, show only what changed and only re-run affected rules | 🟡 versions and findings are stored per version; the diff view is manual | Biggest single speed-up for the reviewer loop |
| 13 | **Larger / stronger embedding model** behind the same interface (e.g. `multilingual-e5-base`) with a benchmark harness | 🟡 interface is model-agnostic, only `e5-small` is bundled | Retrieval quality is the ceiling on AI usefulness |
| 14 | **Prompt and model A/B evaluation** — the `promptVersion` field exists, but there is no scoring harness | ⬜ | Without it, prompt changes are vibes |
| 15 | **Webhooks / Slack + email digests** for Sentinel tasks and overdue exceptions | ⬜ | In-app notifications require someone to be in the app |

---

## Long term — worth doing, not soon

| # | Item | State | Notes |
|---|---|---|---|
| 16 | **ProofPass** — a signed, portable compliance certificate per published asset | ⬜ | Needs a signing key and an external verification story; deliberately not started |
| 17 | **Red-Team Lab** — generate adversarial variants of an approved asset and check whether the rules catch them | ⬜ | High value, high cost; would need its own evaluation corpus |
| 18 | **Agent / MCP integrations** — let an assistant draft copy against the rule set and pre-check before submission | ⬜ | Requires the citation validator to be exposed as a tool contract first |
| 19 | **Real-time collaboration** on a submission (comments, presence, live findings) | ⬜ | Comments exist; presence and live updates do not |
| 20 | **Multi-tenant administration** — workspace creation, SSO (SAML/OIDC), per-workspace policy packs | 🟡 workspace column and RBAC exist; no admin surface, no SSO | Single workspace is seeded by script today |
| 21 | **On-premise model hosting for the reviewer LLM** so no content leaves the network | ⬜ | The provider seam is already OpenAI-compatible, so this is a deployment task |
| 22 | **Full audit export with cryptographic chaining** (append-only hash chain over `audit_events`) | 🟡 export exists (JSON/CSV), no tamper-evidence | The audit log is the product's credibility; hash chaining makes it provable |

---

## Explicitly out of scope

These were considered and rejected for this build, not forgotten:

- **Font-family detection from a raster image.** Unreliable at poster resolution;
  claiming it would be a lie the product cannot back up.
- **Automatic legal sign-off.** The engine cites the team's own stored passages.
  It does not interpret advertising law.
- **A mobile native app.** The responsive web app is the product.
- **Generating marketing copy for the team.** Precedent reviews; it does not
  ghost-write. Suggested fixes are minimal edits to the creator's own words.
