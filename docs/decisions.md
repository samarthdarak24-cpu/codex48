# PRECEDENT — ARCHITECTURAL & PRODUCT DECISIONS (`docs/decisions.md`)

**Date:** 2026-11-02  
**Reference Document:** `PRECEDENT_MASTER.md` Part 15  
**Product:** Precedent — AI-Assisted Brand Governance & Content Approval Platform  

---

## 1. LLM Provider Adapter & Fallback Mode
- **Decision:** Support pluggable LLM providers via a unified backend adapter (`anthropic`, `openai`, `gemini`). When `LLM_PROVIDER=none` or when API keys are absent, the application gracefully operates in **Degraded / Deterministic Fallback Mode**:
  - Deterministic Rule Engine continues running with full precision.
  - VisualGuard OCR, color palette matching, and logo detection continue running.
  - Semantic retrieval searches guideline passages via hybrid keyword + vector indexing.
  - Precedent Assistant status shows `degraded` (amber status dot) and provides verified retrieval answers with an explicit banner: *"AI explanation in retrieval-only mode — deterministic findings shown"*.

---

## 2. Campaign Selection vs Content Label (Resolution of Observation O5)
- **Observation O5:** Creator "New Content" had both a free-text "Campaign name" and a dropdown "Campaign".
- **Decision:** The dropdown `campaign_id` (e.g. "Summer 2026") is the authoritative database foreign key. The free-text input is standardized as **"Content Label / Campaign Note"**, allowing creators to specify internal asset identifiers (e.g., "Instagram Glow Serum Launch v2") while preserving relational integrity with `campaigns.id`.

---

## 3. Compliance Scoring Formula (Resolution of Observation O4)
- **Formula:** Severity-weighted compliance index:
  $$\text{score} = \operatorname{round}\left(100 \times \left(1 - \frac{\sum \text{weight}(\text{violations}) + 0.5 \times \sum \text{weight}(\text{unknown})}{\sum \text{weight}(\text{applicable rules})}\right)\right)$$
- **Weights:**
  - `Critical`: 5.0
  - `Major`: 3.0
  - `Minor`: 1.0
  - `Unknown / Needs Human Review`: 0.5 (penalty weight)
- **Persistence:** Stored on `submission_versions.compliance_score`, with `formula_version="v1.0-severity-weighted"` and `computed_at`. UI rings display this stored value and allow clicking to reveal the exact violations/unknown breakdown.

---

## 4. Immutable Approval Snapshots & Cryptographic Verification
- **Decision:** In accordance with Part 15, no external blockchain dependency is introduced. Instead, each approval creates a SHA-256 hashed immutable snapshot in `approval_decisions` containing:
  - Exact `submission_version_id`
  - Canonical hash of active rule versions at time of sign-off
  - Canonical hash of active guideline passages at time of sign-off
  - Manager user ID, role, and decision timestamp (UTC)
  Any modification to the underlying content or rules produces a new version, preserving the prior snapshot permanently.

---

## 5. Notification Transport
- **Decision:** In-app notification center powered by `GET /api/v1/notifications` with client-side 30-second background polling and real-time badge aggregation via `GET /api/v1/nav/counts`.

---

## 6. Workspace Scoping & Multi-Tenancy
- **Decision:** The demo environment defaults to `PureGlow` (Brand Manager David Kim, Creator Emily Carter), but all queries, tool executions, and assistant contexts are strictly scoped to `workspace_id`. Cross-workspace requests automatically return HTTP 403 Forbidden / 404 Not Found.

