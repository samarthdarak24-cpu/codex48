# PRECEDENT — Official GitHub Dependencies & Technical Reference Report

**Standard Compliance:** `PRECEDENT_MASTER_BACKEND_PROMPT.md` §2 & §4  
**Audit Scope:** 24 Official Technical Reference Repositories  

---

## 1. Backend & Database Repositories

| # | Official GitHub Repository | Package Name & Version | Status in Precedent | Architectural Role in Platform |
|---|---|---|---|---|
| **1** | [FastAPI](https://github.com/fastapi/fastapi) | `fastapi==0.115.4` | **ACTIVE** | Core web framework. Defines all RESTful API routes, dependency injection (`Depends`), lifespan hooks, OpenAPI schema generation, and asynchronous execution. |
| **2** | [Pydantic](https://github.com/pydantic/pydantic) | `pydantic==2.9.2` | **ACTIVE** | Strict request body validation, settings management (`pydantic-settings==2.6.0`), and JSON serialization schemas ensuring camelCase frontend contracts. |
| **3** | [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy) | `SQLAlchemy==2.0.36` | **ACTIVE** | Object-Relational Mapping (ORM) and SQL generation layer. Powers models across 32 database tables with declarative 2.0 mapped typing. |
| **4** | [Alembic](https://github.com/sqlalchemy/alembic) | `alembic==1.13.3` | **ACTIVE** | Safe database schema versioning, migration generation, and upgrade scripts (`alembic/versions/`). |
| **5** | [PostgreSQL](https://github.com/postgres/postgres) | `psycopg2-binary==2.9.10` | **ACTIVE / PRODUCTION** | Primary production relational database. SQLite with WAL mode is supported for local offline evaluation. |
| **6** | [pgvector](https://github.com/pgvector/pgvector) | `pgvector==0.3.6` | **OPTIONAL / COMPATIBLE** | Vector similarity extension for PostgreSQL. Used when deploying to cloud PostgreSQL; locally, Precedent utilizes an optimized in-memory cosine and RRF scoring pipeline. |

---

## 2. AI, OCR & Document Processing Repositories

| # | Official GitHub Repository | Package Name & Version | Status in Precedent | Architectural Role in Platform |
|---|---|---|---|---|
| **7** | [RapidOCR](https://github.com/RapidAI/RapidOCR) | `rapidocr-onnxruntime==1.4.3` | **ACTIVE (PRIMARY OCR)** | Fast, CPU-friendly OCR text and bounding-box extraction from uploaded creative posters without requiring external GPU servers or heavyweight native binaries. |
| **8** | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | `paddleocr` | **ALTERNATIVE / EVALUATED** | Tested alternative. RapidOCR was chosen as primary due to lower CPU memory footprint and direct ONNX runtime integration. |
| **9** | [OpenCV](https://github.com/opencv/opencv) | `opencv-python==4.10.0.84` | **ACTIVE** | Computer vision engine for multi-scale template matching to locate authorized brand logos, measure clear space, and calculate aspect ratios. |
| **10** | [Pillow](https://github.com/python-pillow/Pillow) | `Pillow==13.0.0` | **ACTIVE** | Image loading, EXIF orientation correction, CIE-Lab palette quantization, and pixel-level WCAG AA contrast sampling. |
| **11** | [PyMuPDF](https://github.com/pymupdf/PyMuPDF) | `PyMuPDF==1.24.13` (fitz) | **ACTIVE** | High-fidelity guideline document ingestion. Extracts clean text, headings, sections, and page numbers from PDF guidelines. |
| **12** | [python-docx](https://github.com/python-openxml/python-docx) | `python-docx==1.1.0` | **ACTIVE** | Microsoft Word (.docx) guideline document ingestion and structured passage extraction. |
| **13** | [FlagEmbedding / BGE](https://github.com/FlagOpen/FlagEmbedding) | `multilingual-e5-small` (ONNX) | **ACTIVE** | 384-dimensional dense semantic embedding model executed locally via ONNX Runtime for semantic guideline retrieval and evidence matching. |

---

## 3. Advisory AI Agents, Schedulers & Privacy

| # | Official GitHub Repository | Package Name & Version | Status in Precedent | Architectural Role in Platform |
|---|---|---|---|---|
| **14** | [PydanticAI](https://github.com/pydantic/pydantic-ai) | `pydantic-ai==0.0.14` | **ACTIVE** | Framework for the 5-agent advisory Review Crew (Text, Visual, Regulatory, Consistency, Lead). Enforces strict structured outputs and citation grounding. |
| **15** | [LangGraph](https://github.com/langchain-ai/langgraph) | `langgraph` | **ALTERNATIVE / NOT NEEDED** | Preserved architectural decision: Avoided duplicate agent frameworks. PydanticAI and standard FastAPI async pipelines fulfill all orchestration requirements cleanly. |
| **16** | [APScheduler](https://github.com/agronholm/apscheduler) | `APScheduler==3.10.4` | **ACTIVE** | Background cron scheduler for automated daily Sentinel policy reassessment (02:00 UTC) and daily exception expiry sweeps. |
| **17** | [Presidio](https://github.com/microsoft/presidio) | Regex Privacy Shield Fallback | **ACTIVE (FALLBACK)** | Redacts PII (emails, Indian PAN numbers, phone numbers) before prompts reach external models. Deterministic regex engine prevents crashes if heavy spaCy models are uninstalled. |
| **18** | [Ragas](https://github.com/vibrantlabsai/ragas) | Internal Faithfulness Metric | **ACTIVE (ADAPTED)** | Implements RAG faithfulness checking via `validate_citation`, verifying that every generated AI claim is an exact substring of stored brand guidelines. |

---

## 4. Frontend & Testing Repositories

| # | Official GitHub Repository | Package Name & Version | Status in Precedent | Architectural Role in Platform |
|---|---|---|---|---|
| **19** | [React](https://github.com/facebook/react) | `react==18.3.1`, `react-dom` | **ACTIVE** | Declarative component UI framework powering all 21 creator and manager platform views. |
| **20** | [Vite](https://github.com/vitejs/vite) | `vite==5.4.2` | **ACTIVE** | Lightning-fast frontend build tooling and HMR dev server. Production bundle compiles in ~11s. |
| **21** | [React Router](https://github.com/remix-run/react-router) | `react-router-dom==6.26.2` | **ACTIVE** | Single-page application client-side routing, route protection, role redirection, and history management. |
| **22** | [TanStack Query](https://github.com/TanStack/query) | `@tanstack/react-query==5.56.2` | **ACTIVE** | Server-state management, automated cache invalidation upon mutations, background refetching, and optimistic updates. |
| **23** | [Playwright](https://github.com/microsoft/playwright) | `@playwright/test==1.47.2` | **ACTIVE** | Automated browser end-to-end testing and visual regression inspection across desktop and mobile viewports (`qa_ui.mjs`). |
| **24** | [Lucide Icons](https://github.com/lucide-icons/lucide) | `lucide-react==0.441.0` | **ACTIVE** | Consistent, lightweight SVG iconography across all navigation, metric cards, status badges, and action buttons. |

---

## 5. Architectural Dependency Policy

Precedent strictly adheres to three dependency governance rules:
1. **Never Duplicate Frameworks**: We avoid mixing LangChain, LangGraph, and AutoGen simultaneously. PydanticAI is used exclusively for multi-agent advisory synthesis.
2. **Deterministic Sovereignty**: The Deterministic Rule Engine (OpenCV, Pillow, RapidOCR, RegExp) operates with zero model hallucination risk and remains the sole compliance authority. AI is strictly advisory.
3. **Graceful Offline Degradation**: When an external LLM API key is unconfigured, the application gracefully provides heuristic suggestions and flags `completed_without_ai` without throwing runtime 500 exceptions.
