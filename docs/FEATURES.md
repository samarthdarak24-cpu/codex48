# Precedent — Product Features & Capabilities (Round 3)

Precedent is an AI-assisted brand governance and content pre-publication approval platform. It connects marketing and creative work with approved brand guidelines, structured deterministic rules, and human exception rulings.

---

## 1. Core Mandatory Innovations

### A1 — VisualGuard: Full Visual & OCR Compliance
VisualGuard analyzes uploaded creative assets (posters, social graphics, digital ads) down to the pixel level without relying on ungrounded model hallucinations:
- **Byte Sniffing & File Security:** Validates genuine image magic bytes (PNG, JPEG, WebP) to prevent extension spoofing and decompression-bomb attacks.
- **Tesseract OCR Pipeline:** Extracts text blocks with image-pixel bounding boxes `[x, y, w, h]` and confidence scores. Supports multilingual scripts including English and Devanagari.
- **K-Means Palette & Drift Tolerance:** Measures dominant background and accent colors. Computes Euclidean RGB distance against the approved brand palette (`#7AB93B`, `#F4EFE3`) with documented tolerance (`COLOUR_TOLERANCE = 48.0`) to absorb JPEG chroma subsampling drift without false violations.
- **OpenCV Logo Template Matching:** Detects official brand logos against manager-approved vector/raster references. Computes match confidence and exclusion clear-space rings. When logo match confidence is ambiguous (`< 0.40`), evaluates to `Needs Review` rather than inventing a violation.
- **WCAG 2.1 Contrast Ratio Verification:** Samples luminance ratios between text bounding boxes and their local background, enforcing the `4.5:1` AA standard. If segmentation is uncertain, marks findings as `Needs Review`.
- **Interactive SVG PosterCanvas Overlay:** Responsive vector layer dynamically scaling original image-pixel coordinates to rendered container dimensions. Clicking any finding highlights and scrolls directly to the affected region.

### A2 — Evidence Intelligence: Semantic AI Review with Verified Citations
Evidence Intelligence identifies meaning-level guideline mismatches that simple keyword string matching misses, while ensuring the deterministic rule engine remains authoritative:
- **Page-Level Guideline Chunking:** Breaks PDF and DOCX guidelines into structured passages with page numbers, section headings, and paragraph numbers.
- **Local Multilingual Vector Search:** Bundles a 384-dimensional quantized ONNX model (`paraphrase-multilingual-MiniLM-L12-v2`) running locally via `onnxruntime` with zero external API calls or vector database overhead.
- **Hybrid Reciprocal Rank Fusion (RRF):** Merges BM25 lexical keyword ranking with semantic vector similarity (`k=60`). If vector models are unconfigured or unavailable, automatically falls back to lexical BM25 and discloses the fallback.
- **Anti-Hallucination Citation Verification Gate:** Every LLM finding must cite an active rule code and quote an exact substring from a retrieved guideline passage. Fabricated citations, inactive rule codes, or hallucinated quotes are automatically rejected and recorded in the audit store.
- **Generate-and-Verify Minimal Edits (N1):** Recommends concise copy improvements that preserve creative voice. Applying a fix generates a new content version and invalidates existing approvals.

### A3 — Sentinel: Post-Publication Continuous Monitoring & Reassessment
Sentinel protects brand equity after publication, monitoring shipped campaign content when policies change:
- **Publication Ledger:** Tracks shipped campaign versions with publication timestamp, channel, and cryptographically sealed version ID.
- **6 Policy Trigger Events:** Automatically runs impact replays when:
  1. A rule is activated (`rule_activated`)
  2. A rule is modified (`rule_edited`)
  3. A rule is deactivated (`rule_deactivated`)
  4. An exception expires (`exception_expired`)
  5. An exception is revoked (`exception_revoked`)
  6. A product claim is withdrawn (`claim_withdrawn`)
- **Deduplicated Reassessment Tasks:** Replays changed rules against active publications. Automatically creates actionable tasks for newly non-compliant assets, guarded by a database unique constraint on `(submission_version_id, trigger_type, trigger_ref)`.
- **APScheduler & Manual Scan:** Idempotent background sweep runs daily (`SENTINEL_CRON`) or via a 1-click manager scan (`POST /sentinel/recheck`).
- **Human-in-the-Loop Resolution:** Managers review flagged publications and execute verified resolutions: `Re-approve with conditions`, `Request creator revisions`, or `Withdraw campaign asset`.

---

## 2. Core Governance & Workflow Modules

1. **Brand Guideline & Document Library:**
   Upload PDF and Word guidelines. Automatically parses text via PyMuPDF and `python-docx`, storing page-level citations.
2. **Deterministic Rule Engine:**
   Three-valued evaluation logic (`compliant`, `violation`, `unknown`). Missing facts return `unknown` (Needs Review) rather than false passes or invented violations.
3. **Approved Claims & Substantiation Vault:**
   Records approved marketing facts and clinical studies. Citations link directly to laboratory studies and batch testing certificates.
4. **Content Version Pipeline:**
   Every revision increments version (`v1.0 -> v2.0`) and resets approval seals, ensuring edits cannot slip into production unnoticed.
5. **Scoped, Expiring Human Exceptions:**
   Managers grant narrowly scoped waivers specifying campaign boundaries, channel limits, and an expiration timestamp. The backend strictly rejects expired exceptions with HTTP 409 Conflict.
6. **Rule Impact Sandbox:**
   Simulates proposed policy adjustments (background colors, clear space, allowed claims) against stored campaign history to preview compliance blast radius before activation.
7. **Rule Conflict Detection:**
   Deterministic graph checks detect contradictions between rules sharing identical subjects and scopes before they cause operational deadlocks.
8. **Immutable Audit Trail:**
   Every login, rule mutation, exception approval, and review decision is written to an append-only audit store with timestamp, actor, and affected entity.

---

## 3. Innovations & Usability Enhancements

- **Judge Mode (N4):** TopBar walkthrough drawer with 1-click role switcher, guided evaluation steps, and preset demo scenarios.
- **AI Privacy Shield & AI Trust Panel (N5):** Redacts PII (emails, phone numbers, digit sequences, personal names) before prompt dispatch. Real-time observability dashboard reporting call volume, latency, token spend, and rejected hallucinations.
- **What We Could Not Check (N7):** Explicit panel explaining unmeasured facts and guiding reviewers on resolving uncertainty.
- **Blast-Radius Preview (N9):** Real-time breakdown in Rule Impact Sandbox showing Compliant / Needs Review / Non-Compliant assets across historical content.
