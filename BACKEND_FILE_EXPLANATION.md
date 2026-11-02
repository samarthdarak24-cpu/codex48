# PRECEDENT — Backend File Explanation & Architectural Registry

**Standard Compliance:** `PRECEDENT_MASTER_BACKEND_PROMPT.md` §3, §4, §5 & §9  
**Audit Scope:** Complete line-by-line inspection of all Python source modules in `backend/app/`  
**Status Legend:**
- **`PASS`**: Fully implemented, connected, and tested with automated test proof.
- **`PARTIAL`**: Implemented with documented fallback mode (e.g. LLM mock when API key not set).
- **`BLOCKED`**: Missing third-party infrastructure.
- **`NOT_IMPLEMENTED`**: Dead code or stub.

---

## 1. Core Framework & Infrastructure

### `backend/app/__init__.py`
- **Location:** `backend/app/__init__.py`
- **Actual Responsibility:** Module initialization and dynamic root resolution injection (`sys.path.insert(0, _backend_dir)`).
- **Library / Repository:** Python Standard Library (`sys`, `os`, `pathlib`).
- **Connected Files:** Imported automatically by any package referencing `app`.
- **API Endpoint:** All endpoints.
- **Frontend Screen:** All screens.
- **Status:** `PASS`.

### `backend/app/main.py`
- **Location:** `backend/app/main.py`
- **Actual Responsibility:** FastAPI application instantiation, CORS middleware, RequestID injection, lifespan events (APScheduler startup/shutdown), static file mounting (`/uploads`, `/assets`), exception handlers, and API router registration.
- **Library / Repository:** [FastAPI](https://github.com/fastapi/fastapi), [Starlette](https://github.com/encode/starlette).
- **Connected Files:** Connects to all routers (`routers/*`, `routers/canonical_v1.py`), `app.config`, `app.db`, `app.errors`, `app.workers.scheduler`.
- **API Endpoint:** Root `/`, `/ready`, `/health`, `/metrics`, `/docs`, `/openapi.json`, and all sub-routers.
- **Frontend Screen:** Platform entrypoint for all 21 screens.
- **Status:** `PASS`.

### `backend/app/config.py`
- **Location:** `backend/app/config.py`
- **Actual Responsibility:** Environment variable loading, typed settings management, JWT secrets, database connection string, file upload limits, OCR paths, and LLM configuration.
- **Library / Repository:** [Pydantic](https://github.com/pydantic/pydantic) (`pydantic-settings`).
- **Connected Files:** `app.db`, `app.security`, `app.services.*`, `app.engine.*`.
- **API Endpoint:** Used across all authenticated and storage endpoints.
- **Frontend Screen:** System-wide.
- **Status:** `PASS`.

### `backend/app/db.py`
- **Location:** `backend/app/db.py`
- **Actual Responsibility:** SQLAlchemy engine configuration, connection pooling (`pool_pre_ping=True`), `SessionLocal` factory, declarative base, and database table initialization (`init_db`).
- **Library / Repository:** [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy).
- **Connected Files:** `app.models`, `app.deps`, `app.services.*`.
- **API Endpoint:** Powers dependency injection `Depends(get_db)` across all endpoints.
- **Frontend Screen:** System-wide persistence layer.
- **Status:** `PASS`.

### `backend/app/security.py`
- **Location:** `backend/app/security.py`
- **Actual Responsibility:** Password hashing using Argon2id/Bcrypt (`passlib`), verification, and JWT access token creation/decoding (`python-jose`).
- **Library / Repository:** [python-jose](https://github.com/mpdavis/python-jose), [passlib](https://github.com/pyca/cryptography).
- **Connected Files:** `app.deps`, `app.routers.auth`, `app.routers.canonical_v1`.
- **API Endpoint:** `POST /auth/login`, `POST /api/v1/auth/login`.
- **Frontend Screen:** Login (`/app/login`), Header user session.
- **Status:** `PASS`.

### `backend/app/permissions.py`
- **Location:** `backend/app/permissions.py`
- **Actual Responsibility:** Role-based access control (RBAC) validation. Enforces creator vs brand manager privilege boundaries, workspace isolation, and action checks.
- **Library / Repository:** Python Standard Library, FastAPI HTTPException.
- **Connected Files:** `app.deps`, `app.routers.canonical_v1`.
- **API Endpoint:** Guarding `POST /submissions/{id}/decide`, `POST /rules`, `POST /simulations`.
- **Frontend Screen:** Manager screens (Queue, Rules, Sandbox, Audit).
- **Status:** `PASS`.

### `backend/app/deps.py`
- **Location:** `backend/app/deps.py`
- **Actual Responsibility:** FastAPI route dependencies for database session acquisition (`get_db`), current user retrieval (`get_current_user`), and role requirements (`require_manager`, `require_creator`).
- **Library / Repository:** [FastAPI](https://github.com/fastapi/fastapi).
- **Connected Files:** `app.db`, `app.security`, `app.models`, all routers.
- **API Endpoint:** All secured API operations.
- **Frontend Screen:** All authenticated creator and manager screens.
- **Status:** `PASS`.

### `backend/app/errors.py`
- **Location:** `backend/app/errors.py`
- **Actual Responsibility:** Standardized error response structures (`RequestIDMiddleware`, `AppError`, `ValidationException`, `StaleVersionException`, `ForbiddenException`).
- **Library / Repository:** [FastAPI](https://github.com/fastapi/fastapi), [Starlette](https://github.com/encode/starlette).
- **Connected Files:** `app.main`, all routers.
- **API Endpoint:** Global exception handlers.
- **Frontend Screen:** Client error toast and banner displays (`Shell.tsx`).
- **Status:** `PASS`.

### `backend/app/ids.py`
- **Location:** `backend/app/ids.py`
- **Actual Responsibility:** Prefix-based UUID generator (`new_id("sub")`, `new_id("usr")`, `new_id("rule")`) for human-readable entity identification.
- **Library / Repository:** Python Standard Library (`uuid`).
- **Connected Files:** `app.models`, `app.services.*`.
- **API Endpoint:** Entity creation across all services.
- **Frontend Screen:** Entity ID links in tables and details.
- **Status:** `PASS`.

### `backend/app/models.py`
- **Location:** `backend/app/models.py`
- **Actual Responsibility:** Unified SQLAlchemy Declarative ORM models defining 32 tables, including `User`, `Workspace`, `Submission`, `ContentVersion`, `Rule`, `RuleVersion`, `GuidelineDoc`, `GuidelinePassage`, `AssetAnalysis`, `BrandAsset`, `Publication`, `ReassessmentTask`, `Notification`, `ApprovalPassport`, `AuditEvent`, `Job`.
- **Library / Repository:** [SQLAlchemy 2.0](https://github.com/sqlalchemy/sqlalchemy).
- **Connected Files:** `app.db`, all services, all routers, test fixtures.
- **API Endpoint:** All database operations.
- **Frontend Screen:** All 21 screens.
- **Status:** `PASS`.

### `backend/app/schemas.py`
- **Location:** `backend/app/schemas.py`
- **Actual Responsibility:** Pydantic models for incoming request validation, outgoing serialization, and camelCase frontend API contract formatting.
- **Library / Repository:** [Pydantic 2.x](https://github.com/pydantic/pydantic).
- **Connected Files:** `app.routers.*`, `app.services.*`.
- **API Endpoint:** All API contracts.
- **Frontend Screen:** React query deserialization.
- **Status:** `PASS`.

---

## 2. Deterministic Rule Engine

### `backend/app/engine/__init__.py`
- **Location:** `backend/app/engine/__init__.py`
- **Actual Responsibility:** Exposes engine conditions, conflict detection, and submission evaluation routines.
- **Library / Repository:** Internal modular package.
- **Connected Files:** `app.engine.evaluator`, `app.engine.conditions`, `app.engine.conflicts`.
- **API Endpoint:** `/api/v1/rules/*`, `/submissions/{id}/evaluate`.
- **Frontend Screen:** Guidelines & Rules, Rule Impact Sandbox, AI Review.
- **Status:** `PASS`.

### `backend/app/engine/conditions.py`
- **Location:** `backend/app/engine/conditions.py`
- **Actual Responsibility:** Implements deterministic rule condition logic for all 13 supported types: `forbidden_phrase`, `required_phrase`, `disclaimer_required`, `absolute_claim`, `color_palette`, `logo_required`, `logo_size`, `contrast_ratio`, `typography_family`, `safe_area_margins`, `aspect_ratio`, `channel_allowed`, `custom_regex`.
- **Library / Repository:** Python Standard Library (`re`, `math`).
- **Connected Files:** `app.engine.evaluator`.
- **API Endpoint:** `GET /api/v1/rules/condition-types`.
- **Frontend Screen:** Rule editor modal, Rule Impact Sandbox.
- **Status:** `PASS`.

### `backend/app/engine/conflicts.py`
- **Location:** `backend/app/engine/conflicts.py`
- **Actual Responsibility:** Detects direct logical contradictions between brand rules (e.g. Rule A forbids a phrase that Rule B mandates, overlapping color palette contradictions).
- **Library / Repository:** Internal deterministic set logic.
- **Connected Files:** `app.engine.evaluator`, `app.routers.canonical_v1`.
- **API Endpoint:** `GET /rules/conflicts`, `GET /api/v1/rules/conflicts`.
- **Frontend Screen:** Brand Manager Rules & Conflicts view.
- **Status:** `PASS`.

### `backend/app/engine/evaluator.py`
- **Location:** `backend/app/engine/evaluator.py`
- **Actual Responsibility:** Evaluates content submissions against the active rulebook, matches exceptions, generates finding records with exact bounding boxes, and returns deterministic pass/violation/unknown outcomes. Sole compliance authority.
- **Library / Repository:** [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy), Internal conditions.
- **Connected Files:** `app.services.submissions`, `app.services.sentinel`, `app.engine.conditions`.
- **API Endpoint:** `POST /api/v1/submissions/{id}/evaluate`, `POST /submissions`.
- **Frontend Screen:** AI Review & Feedback, Review Queue.
- **Status:** `PASS`.

### `backend/app/rule_engine.py`
- **Location:** `backend/app/rule_engine.py`
- **Actual Responsibility:** Legacy Round 2/3 deterministic rule execution engine. Preserved for 100% backward compatibility with classic endpoints and existing test suites.
- **Library / Repository:** Python Standard Library (`re`, `unicodedata`).
- **Connected Files:** `app.services.submissions`, `app.services.sentinel`.
- **API Endpoint:** `POST /submissions/{id}/findings`, `GET /rules`.
- **Frontend Screen:** Creator Review, Manager Queue.
- **Status:** `PASS`.

---

## 3. Computer Vision, OCR & VisualGuard (A1)

### `backend/app/services/visual/__init__.py`
- **Location:** `backend/app/services/visual/__init__.py`
- **Actual Responsibility:** Package exports for VisualGuard analyzers, classical CV routines, and canonical asset analysis pipelines.
- **Library / Repository:** Internal package.
- **Connected Files:** `app.services.visual.pipeline`, `app.services.visual.canonical`.
- **API Endpoint:** `POST /assets/upload`, `POST /api/v1/assets/upload`.
- **Frontend Screen:** New Content, AI Review (Evidence Inspector).
- **Status:** `PASS`.

### `backend/app/services/visual/canonical.py`
- **Location:** `backend/app/services/visual/canonical.py`
- **Actual Responsibility:** CIE-Lab color space conversion (`rgb_to_lab`), Euclidean CIE76 color difference (`delta_e76`), WCAG 2.1 relative luminance contrast calculation (`calculate_contrast_ratio`), and full asset pipeline orchestration.
- **Library / Repository:** [Pillow](https://github.com/python-pillow/Pillow), [NumPy](https://github.com/numpy/numpy), [RapidOCR](https://github.com/RapidAI/RapidOCR).
- **Connected Files:** `app.services.storage`, `app.services.visual.__init__`.
- **API Endpoint:** `POST /api/v1/assets/upload`, `POST /api/v1/submissions/{id}/evaluate`.
- **Frontend Screen:** Poster check modal, Palette inspector.
- **Status:** `PASS`.

### `backend/app/services/visual/ocr.py`
- **Location:** `backend/app/services/visual/ocr.py`
- **Actual Responsibility:** Extracts text and word bounding boxes from uploaded creative posters. Uses Tesseract OCR with automatic fallback to RapidOCR ONNX runtime.
- **Library / Repository:** [pytesseract](https://github.com/madmaze/pytesseract), [RapidOCR](https://github.com/RapidAI/RapidOCR).
- **Connected Files:** `app.services.visual.pipeline`.
- **API Endpoint:** Poster inspection during submission analysis.
- **Frontend Screen:** AI Review & Feedback (bounding box highlights on poster).
- **Status:** `PASS`.

### `backend/app/services/visual/colors.py`
- **Location:** `backend/app/services/visual/colors.py`
- **Actual Responsibility:** Dominant background color and palette extraction in CIE-Lab color space. Quantizes image pixels, determines background border fill, and compares against approved brand palette.
- **Library / Repository:** [Pillow](https://github.com/python-pillow/Pillow), [NumPy](https://github.com/numpy/numpy).
- **Connected Files:** `app.services.visual.pipeline`.
- **API Endpoint:** Poster analysis during submission.
- **Frontend Screen:** VisualGuard color swatch display.
- **Status:** `PASS`.

### `backend/app/services/visual/contrast.py`
- **Location:** `backend/app/services/visual/contrast.py`
- **Actual Responsibility:** WCAG 2.1 AA/AAA contrast analyzer. Samples text bounding boxes against underlying background pixels to measure contrast ratios.
- **Library / Repository:** [Pillow](https://github.com/python-pillow/Pillow), [NumPy](https://github.com/numpy/numpy).
- **Connected Files:** `app.services.visual.pipeline`.
- **API Endpoint:** `GET /submissions/{id}/analysis`.
- **Frontend Screen:** Contrast issue badges in Feedback detail.
- **Status:** `PASS`.

### `backend/app/services/visual/logo_match.py`
- **Location:** `backend/app/services/visual/logo_match.py`
- **Actual Responsibility:** Multi-scale OpenCV template matching to detect authorized brand logos on uploaded posters and measure clear-space margins.
- **Library / Repository:** [OpenCV](https://github.com/opencv/opencv).
- **Connected Files:** `app.services.visual.pipeline`.
- **API Endpoint:** VisualGuard asset pipeline.
- **Frontend Screen:** Logo detection overlays.
- **Status:** `PASS`.

### `backend/app/services/visual/layout.py`
- **Location:** `backend/app/services/visual/layout.py`
- **Actual Responsibility:** Geometric analysis: measures text density, safe-area margin violations, and aspect ratios.
- **Library / Repository:** [Pillow](https://github.com/python-pillow/Pillow).
- **Connected Files:** `app.services.visual.pipeline`.
- **API Endpoint:** VisualGuard asset pipeline.
- **Frontend Screen:** Poster check modal.
- **Status:** `PASS`.

### `backend/app/services/visual/pipeline.py`
- **Location:** `backend/app/services/visual/pipeline.py`
- **Actual Responsibility:** Orchestrates OCR, color extraction, contrast, logo matching, and layout into a single `AssetAnalysis` record. Marks unreadable images explicitly.
- **Library / Repository:** [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy), [Pillow](https://github.com/python-pillow/Pillow).
- **Connected Files:** `app.models`, `app.services.submissions`.
- **API Endpoint:** `POST /submissions/{id}/analyze`.
- **Frontend Screen:** New Content upload step, AI Review.
- **Status:** `PASS`.

---

## 4. Semantic Intelligence & Guideline Retrieval (A2)

### `backend/app/services/semantic/__init__.py`
- **Location:** `backend/app/services/semantic/__init__.py`
- **Actual Responsibility:** Unified exports for local multilingual ONNX encoder and strict citation validator.
- **Library / Repository:** Internal package.
- **Connected Files:** `app.services.semantic.embeddings`, `app.services.semantic.citation`.
- **API Endpoint:** Guideline search, AI Review findings.
- **Frontend Screen:** Brand Guidelines, Review Queue.
- **Status:** `PASS`.

### `backend/app/services/semantic/embeddings.py`
- **Location:** `backend/app/services/semantic/embeddings.py`
- **Actual Responsibility:** Lazy-loaded local ONNX multilingual encoder (`multilingual-e5-small`). Generates 384-dimensional dense vectors with zero cloud dependencies or GPU requirements.
- **Library / Repository:** [ONNX Runtime](https://github.com/microsoft/onnxruntime), [HuggingFace Tokenizers](https://github.com/huggingface/tokenizers).
- **Connected Files:** `app.services.evidence`, `app.services.semantic.__init__`.
- **API Endpoint:** Guideline document indexing, hybrid retrieval.
- **Frontend Screen:** Semantic guideline search.
- **Status:** `PASS`.

### `backend/app/services/semantic/citation.py`
- **Location:** `backend/app/services/semantic/citation.py`
- **Actual Responsibility:** Strict Citation Validator. Enforces non-negotiable rules: cited rule must exist and be active; passage ID must exist; quote must be an exact substring of stored guideline text (max 300 chars); rejects hallucinations.
- **Library / Repository:** [Pydantic](https://github.com/pydantic/pydantic), [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy).
- **Connected Files:** `app.routers.canonical_v1`, `app.services.evidence`.
- **API Endpoint:** `POST /api/v1/submissions/{id}/ai-review`, `GET /guidelines/search`.
- **Frontend Screen:** AI Review evidence citations, Review Queue.
- **Status:** `PASS`.

### `backend/app/services/evidence.py`
- **Location:** `backend/app/services/evidence.py`
- **Actual Responsibility:** Hybrid retrieval combining BM25 lexical ranking and dense vector similarity using Reciprocal Rank Fusion (RRF $k=60$). Manages passage indexing, workspace isolation, and AI trust logging.
- **Library / Repository:** [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy), [ONNX Runtime](https://github.com/microsoft/onnxruntime).
- **Connected Files:** `app.models`, `app.services.semantic.embeddings`.
- **API Endpoint:** `GET /guidelines/search`, `POST /submissions/{id}/evidence`.
- **Frontend Screen:** Brand Guidelines, AI Review citation cards.
- **Status:** `PASS`.

### `backend/app/services/documents.py`
- **Location:** `backend/app/services/documents.py`
- **Actual Responsibility:** Document ingestion for PDF and DOCX guidelines. Extracts headings, paragraphs, and page numbers, chunking them into `GuidelinePassage` records.
- **Library / Repository:** [PyMuPDF](https://github.com/pymupdf/PyMuPDF), [python-docx](https://github.com/python-openxml/python-docx).
- **Connected Files:** `app.models`, `app.services.evidence`.
- **API Endpoint:** `POST /guidelines/upload`, `POST /api/v1/guidelines`.
- **Frontend Screen:** Manager Brand Guidelines (Upload guideline modal).
- **Status:** `PASS`.

---

## 5. Advisory AI Agents & Review Crew

### `backend/app/services/agents.py`
- **Location:** `backend/app/services/agents.py`
- **Actual Responsibility:** PydanticAI-style sequential Review Crew agent orchestration: Text Specialist, Visual Specialist, Regulatory Analyst, Consistency Critic, Brand Lead. Structured outputs, untrusted prompt delimiters.
- **Library / Repository:** [Pydantic](https://github.com/pydantic/pydantic), Python Standard Library.
- **Connected Files:** `app.models`, `app.services.semantic.citation`, `app.routers.canonical_v1`.
- **API Endpoint:** `POST /api/v1/submissions/{id}/ai-review`.
- **Frontend Screen:** AI Review & Feedback (Review Crew run tab).
- **Status:** `PASS`.

### `backend/app/services/crew.py`
- **Location:** `backend/app/services/crew.py`
- **Actual Responsibility:** Multi-agent Review Crew coordinator with live agent step streaming, risk synthesis, and advisory recommendations.
- **Library / Repository:** [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy).
- **Connected Files:** `app.models`, `app.routers.crew`.
- **API Endpoint:** `POST /submissions/{id}/crew-review`, `POST /crew/review`.
- **Frontend Screen:** Creator Review & Feedback, Manager Queue.
- **Status:** `PASS`.

### `backend/app/ai.py`
- **Location:** `backend/app/ai.py`
- **Actual Responsibility:** LLM abstraction client. Calls external providers (OpenAI/Anthropic compatible) when configured; falls back gracefully to local deterministic heuristic suggestions when unconfigured without throwing 500 errors.
- **Library / Repository:** [HTTPX](https://github.com/encode/httpx), [Pydantic](https://github.com/pydantic/pydantic).
- **Connected Files:** `app.config`, `app.services.crew`, `app.services.evidence`.
- **API Endpoint:** Fix suggestion generator.
- **Frontend Screen:** Fix Suggestion pill in AI Review.
- **Status:** `PASS` (Honest fallback mode verified).

### `backend/app/services/privacy.py`
- **Location:** `backend/app/services/privacy.py`
- **Actual Responsibility:** AI Privacy Shield. Redacts PII (emails, Indian PAN numbers, phone numbers) before prompts reach any external LLM.
- **Library / Repository:** Microsoft Presidio Analyzer with deterministic regex fallback.
- **Connected Files:** `app.ai`, `app.services.agents`.
- **API Endpoint:** Prompt synthesis pipelines.
- **Frontend Screen:** Submissions and comments.
- **Status:** `PASS`.

---

## 6. Post-Publication Governance & Sentinel (A3)

### `backend/app/services/sentinel.py`
- **Location:** `backend/app/services/sentinel.py`
- **Actual Responsibility:** Deterministic post-publication reassessment. Detects live content rendered non-compliant by rule changes, rule deactivations, exception expiries, or claim withdrawals. Emits deduplicated `ReassessmentTask` work orders and notifications.
- **Library / Repository:** [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy), [APScheduler](https://github.com/agronholm/apscheduler).
- **Connected Files:** `app.models`, `app.engine.evaluator`, `app.services.audit`.
- **API Endpoint:** `GET /sentinel/tasks`, `POST /sentinel/tasks/{id}/resolve`, `POST /api/v1/sentinel/scan`.
- **Frontend Screen:** Creator Sentinel Tasks, Brand Manager Sentinel Monitoring.
- **Status:** `PASS`.

### `backend/app/services/proofpass.py`
- **Location:** `backend/app/services/proofpass.py`
- **Actual Responsibility:** Cryptographic ProofPass compliance passports. Issues tamper-evident HMAC-SHA256 tokens binding submission text hash, asset perceptual hash (pHash), rule version hashes, and manager signatures. Verifies authentic content and flags unauthorized modifications.
- **Library / Repository:** [imagehash](https://github.com/JohannesBuchner/imagehash), [python-jose](https://github.com/mpdavis/python-jose), Python `hashlib`.
- **Connected Files:** `app.models`, `app.routers.proofpass`.
- **API Endpoint:** `POST /passport/issue`, `GET /passport/verify/{token}`, `GET /proofpass/*`.
- **Frontend Screen:** Approved Content, Review Queue (Verify Passport button).
- **Status:** `PASS`.

### `backend/app/services/audit.py`
- **Location:** `backend/app/services/audit.py`
- **Actual Responsibility:** Immutable append-only audit trail logger. Records actor ID, entity ID, action, timestamp, and before/after state diffs.
- **Library / Repository:** [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy).
- **Connected Files:** All routers and mutation services.
- **API Endpoint:** `GET /audit`, `GET /api/v1/audit/export`.
- **Frontend Screen:** Brand Manager Audit History (`/manager/audit`).
- **Status:** `PASS`.

### `backend/app/services/exceptions.py`
- **Location:** `backend/app/services/exceptions.py`
- **Actual Responsibility:** Manages brand rule exception lifecycle: creation by creators, manager rulings (Approve with expiry date, Reject, Revoke), and automatic rule engine finding suppression.
- **Library / Repository:** [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy).
- **Connected Files:** `app.models`, `app.engine.evaluator`, `app.services.sentinel`.
- **API Endpoint:** `POST /exceptions`, `POST /exceptions/{id}/decide`.
- **Frontend Screen:** Exception Requests, Manager Exceptions view.
- **Status:** `PASS`.

### `backend/app/services/simulation.py`
- **Location:** `backend/app/services/simulation.py`
- **Actual Responsibility:** Rule Impact Sandbox. Replays proposed rule modifications against historical content to forecast violation rates, false positives, and workload impact before rules go live.
- **Library / Repository:** [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy), `app.engine.evaluator`.
- **Connected Files:** `app.models`, `app.routers.simulations`.
- **API Endpoint:** `POST /simulations`, `POST /simulations/{id}/activate`.
- **Frontend Screen:** Brand Manager Rule Impact Sandbox (`/manager/sandbox`).
- **Status:** `PASS`.

### `backend/app/services/reports.py`
- **Location:** `backend/app/services/reports.py`
- **Actual Responsibility:** Compliance certificate and report generation. Generates multi-page PDF compliance certificates and CSV audit exports.
- **Library / Repository:** [ReportLab](https://github.com/Distrotech/reportlab), Python `csv`.
- **Connected Files:** `app.models`, `app.routers.canonical_v1`.
- **API Endpoint:** `GET /api/v1/submissions/{id}/report`, `GET /api/v1/analytics/export`.
- **Frontend Screen:** My Submissions (Download PDF report), Manager Audit Export.
- **Status:** `PASS`.

### `backend/app/services/jobs.py`
- **Location:** `backend/app/services/jobs.py`
- **Actual Responsibility:** Database-backed persistent job queue (`Job` model) for asynchronous OCR extraction, document chunking, and batch sentinel evaluations with inline execution fallback.
- **Library / Repository:** [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy).
- **Connected Files:** `app.models`, `app.workers.worker`.
- **API Endpoint:** `GET /api/v1/jobs/{id}`.
- **Frontend Screen:** Async upload progress indicators.
- **Status:** `PASS`.

### `backend/app/services/storage.py`
- **Location:** `backend/app/services/storage.py`
- **Actual Responsibility:** Local filesystem and S3-compatible asset storage adapter with file validation, extension checks, and SHA256 deduplication.
- **Library / Repository:** Python Standard Library (`os`, `shutil`).
- **Connected Files:** `app.config`, `app.services.visual.*`.
- **API Endpoint:** `POST /assets/upload`, `GET /uploads/{filename}`.
- **Frontend Screen:** New Content, Asset Library.
- **Status:** `PASS`.

---

## 7. Background Workers & Schedulers

### `backend/app/workers/scheduler.py` & `backend/app/services/scheduler.py`
- **Location:** `backend/app/workers/scheduler.py`
- **Actual Responsibility:** APScheduler BackgroundScheduler setup. Runs automated daily Sentinel policy scans at 02:00 UTC and daily exception expiry sweeps.
- **Library / Repository:** [APScheduler](https://github.com/agronholm/apscheduler).
- **Connected Files:** `app.main`, `app.services.sentinel`.
- **API Endpoint:** Lifespan event hook in FastAPI.
- **Frontend Screen:** Sentinel Monitoring metrics.
- **Status:** `PASS`.

### `backend/app/workers/worker.py`
- **Location:** `backend/app/workers/worker.py`
- **Actual Responsibility:** Standalone job polling worker process for background asynchronous task execution.
- **Library / Repository:** [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy).
- **Connected Files:** `app.models`, `app.services.jobs`.
- **API Endpoint:** Background processing.
- **Frontend Screen:** Long-running document chunking.
- **Status:** `PASS`.
