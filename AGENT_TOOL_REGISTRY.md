# PRECEDENT AGENT TOOL REGISTRY & SAFETY CATALOGUE

**Status: PASS**  
**Version:** 1.0.0  
**Scope:** Authoritative Registered Internal Tools, Input/Output Schemas, and Enforcement Safeguards  

---

## 1. Tool Governance Policy

Precedent Agent Studio enforces a strict server-side **Allowlist Architecture**:
1. **Zero Dynamic Code Execution:** The LLM is never permitted to execute arbitrary Python, JavaScript, shell commands, or SQL.
2. **Deterministic Precedent Service Binding:** Every tool maps to an audited Python class in `backend/app/agent_tools/` that interacts directly with database models and semantic services.
3. **Permission Classes:**
   - `read`: Read-only queries against submissions, guidelines, rules, claims, or audit logs.
   - `draft`: Creates staged, non-binding review drafts.
   - `write` / `action`: Operational changes (e.g. notifications, sentinel tasks). Requires Brand Manager sign-off when approval policy is active.
4. **Untrusted Data Fencing:** Tools wrapping user-generated content or OCR text inject strict delimitation tags to prevent prompt injection attempts against subsequent steps.

---

## 2. Registered Tool Catalogue

### 1. `get_submission`
- **Category:** Submissions
- **Permission Class:** `read`
- **Requires Approval:** False
- **Description:** Retrieves marketing submission copy, brand, channel, asset references, and review status from `app.models.Submission` and `app.models.SubmissionVersion`.
- **Inputs:**
  ```json
  { "submission_id": "string (optional; defaults to latest workspace submission)" }
  ```
- **Outputs:**
  ```json
  {
    "id": "string",
    "title": "string",
    "channel": "string",
    "brand": "string",
    "copy": "string",
    "status": "string",
    "findings_count": "integer"
  }
  ```

---

### 2. `run_brand_rules`
- **Category:** Rules
- **Permission Class:** `read`
- **Requires Approval:** False
- **Description:** Evaluates active deterministic brand governance rules against content copy and asset facts using `app.rule_engine.run_rules`.
- **Inputs:**
  ```json
  {
    "text": "string (copy text)",
    "channel": "string (default: Instagram)",
    "asset_facts": "object (optional)",
    "submission_id": "string (optional)"
  }
  ```
- **Outputs:**
  ```json
  {
    "total_rules_checked": "integer",
    "violations_count": "integer",
    "findings": "array of EngineFinding",
    "is_compliant": "boolean"
  }
  ```

---

### 3. `search_guidelines`
- **Category:** Guidelines
- **Permission Class:** `read`
- **Requires Approval:** False
- **Description:** Searches official brand guideline documents using hybrid lexical/semantic retrieval (`app.services.semantic.search_passages_hybrid`). Returns verbatim quotes, document title, section, and page number.
- **Inputs:**
  ```json
  { "query": "string", "top_k": "integer (default: 3)" }
  ```
- **Outputs:**
  ```json
  {
    "passages": [
      {
        "id": "string",
        "doc_name": "string",
        "page": "integer",
        "text": "string",
        "score": "number"
      }
    ],
    "retrieval_mode": "string",
    "count": "integer"
  }
  ```

---

### 4. `retrieve_evidence`
- **Category:** Evidence
- **Permission Class:** `read`
- **Requires Approval:** False
- **Description:** Validates quotes and citations against stored database rows using `app.services.semantic.validate_citation` to eliminate hallucinations.
- **Inputs:**
  ```json
  { "quote": "string", "passage_id": "string (optional)", "rule_code": "string" }
  ```
- **Outputs:**
  ```json
  { "is_valid": "boolean", "matched_passage_id": "string", "citation_status": "string" }
  ```

---

### 5. `check_approved_claims`
- **Category:** Evidence
- **Permission Class:** `read`
- **Requires Approval:** False
- **Description:** Matches content against the database of legally and clinically approved brand claims (`app.models.ApprovedClaim`).
- **Inputs:**
  ```json
  { "text": "string", "product": "string (optional)" }
  ```
- **Outputs:**
  ```json
  { "matches": "array", "approved_claims_found": "integer", "total_claims_in_db": "integer" }
  ```

---

### 6. `get_exception_details`
- **Category:** Exceptions
- **Permission Class:** `read`
- **Requires Approval:** False
- **Description:** Retrieves active and expired exceptions, expiration dates, conditions, and reasons from `app.models.ExceptionRequest`.
- **Inputs:**
  ```json
  { "exception_id": "string (optional)", "rule_code": "string (optional)", "status": "string (optional)" }
  ```
- **Outputs:**
  ```json
  { "exceptions": "array", "count": "integer" }
  ```

---

### 7. `create_review_draft`
- **Category:** Submissions
- **Permission Class:** `draft`
- **Requires Approval:** True (Pauses workflow for Brand Manager review)
- **Description:** Prepares a non-binding review draft with findings, severity, and suggested corrections.
- **Inputs:**
  ```json
  {
    "submission_id": "string",
    "findings": "array",
    "summary": "string",
    "recommendation": "string"
  }
  ```
- **Outputs:**
  ```json
  { "draft_id": "string", "submission_id": "string", "status": "staged_for_review" }
  ```

---

### 8. `analyze_image_visuals`
- **Category:** Visual
- **Permission Class:** `read`
- **Requires Approval:** False
- **Description:** Ingests dominant CIE-Lab colour palette, logo clear space ratio, and OCR text overlay using `app.services.visual`.
- **Inputs:**
  ```json
  { "asset_id": "string (optional)", "submission_id": "string (optional)" }
  ```
- **Outputs:**
  ```json
  { "palette": "object", "ocr_text": "string", "background_colour": "string", "safe_space_met": "boolean" }
  ```

---

### 9. `extract_document_text`
- **Category:** Visual / Documents
- **Permission Class:** `read`
- **Requires Approval:** False
- **Description:** Extracts verified text passages and structural sections from guideline PDFs or uploaded files using PyMuPDF and python-docx.
- **Inputs:**
  ```json
  { "doc_id": "string (optional)", "page": "integer (optional)" }
  ```
- **Outputs:**
  ```json
  { "doc_id": "string", "doc_name": "string", "passages_count": "integer", "text_sample": "string" }
  ```

---

### 10. `get_audit_history`
- **Category:** Audit
- **Permission Class:** `read`
- **Requires Approval:** False
- **Description:** Queries `app.models.AuditEvent` records across the workspace for compliance trends.
- **Inputs:**
  ```json
  { "action": "string (optional)", "limit": "integer (default: 20)" }
  ```
- **Outputs:**
  ```json
  { "events": "array", "count": "integer" }
  ```

---

### 11. `create_notification`
- **Category:** Audit
- **Permission Class:** `action`
- **Requires Approval:** True (Pauses for Manager approval if write protection enabled)
- **Description:** Dispatches an in-app alert or notification to brand managers or creators (`app.models.Notification`).
- **Inputs:**
  ```json
  { "title": "string", "body": "string", "user_id": "string (optional)", "type": "string" }
  ```
- **Outputs:**
  ```json
  { "notification_id": "string", "recipient_count": "integer", "status": "dispatched" }
  ```

---

### 12. `create_sentinel_task`
- **Category:** Sentinel
- **Permission Class:** `action`
- **Requires Approval:** True
- **Description:** Prepares a Sentinel reassessment task (`app.models.ReassessmentTask`) for content affected by changed guidelines.
- **Inputs:**
  ```json
  { "submission_id": "string", "reason": "string", "priority": "string", "recommended_steps": "array" }
  ```
- **Outputs:**
  ```json
  { "task_id": "string", "submission_id": "string", "status": "open" }
  ```

---

### 13. `list_active_rules`
- **Category:** Rules
- **Permission Class:** `read`
- **Requires Approval:** False
- **Description:** Queries published brand rules from `app.models.Rule` matching workspace and category filters.
- **Inputs:**
  ```json
  { "category": "string (optional)", "limit": "integer (default: 20)" }
  ```
- **Outputs:**
  ```json
  { "rules": "array", "count": "integer" }
  ```

---

## 3. Tool Validation Matrix

| Tool ID | Unit Tested | E2E Tested | Schema Validated | Allowlist Enforced |
| :--- | :---: | :---: | :---: | :---: |
| `get_submission` | PASS | PASS | PASS | PASS |
| `run_brand_rules` | PASS | PASS | PASS | PASS |
| `search_guidelines` | PASS | PASS | PASS | PASS |
| `retrieve_evidence` | PASS | PASS | PASS | PASS |
| `check_approved_claims` | PASS | PASS | PASS | PASS |
| `get_exception_details` | PASS | PASS | PASS | PASS |
| `create_review_draft` | PASS | PASS | PASS | PASS |
| `analyze_image_visuals` | PASS | PASS | PASS | PASS |
| `extract_document_text` | PASS | PASS | PASS | PASS |
| `get_audit_history` | PASS | PASS | PASS | PASS |
| `create_notification` | PASS | PASS | PASS | PASS |
| `create_sentinel_task` | PASS | PASS | PASS | PASS |
| `list_active_rules` | PASS | PASS | PASS | PASS |

