# Precedent — Round 3 Implementation Baseline Report

**Product:** Precedent — AI Brand Governance Platform  
**Team:** We Code Coders  
**Baseline Date:** 1 November 2026  
**Target Specification:** `Precedent_Complete_AI_ML_GitHub_FullStack_Codex_Prompt.docx`

---

## 1. System & Environment Baseline

| Component | Version / Path | Status | Verification Command |
|---|---|:---:|---|
| **Operating System** | Windows 11 AMD64 | Active | PowerShell 5.1 |
| **Python** | 3.12.10 | Active | `python --version` |
| **Node.js** | v20.x | Active | `node --version` |
| **Vite** | 5.4.21 | Active | `npx vite --version` |
| **React** | 18.3.1 + TypeScript | Active | `npm list react` |
| **FastAPI** | 0.115.0 | Active | `pip show fastapi` |
| **Pydantic** | 2.13.5 | Active | `pip show pydantic` |
| **SQLAlchemy** | 2.0.x | Active | `pip show sqlalchemy` |

---

## 2. Model Downloads, Local Weights & Native OCR Tooling

| Artifact | Source / Upstream | Local Disk Path | Size / Specs | Status |
|---|---|---|---|:---:|
| **Tesseract Binary** | UB-Mannheim Tesseract 5.x | `C:\Program Files\Tesseract-OCR\tesseract.exe` | Native x64 binary | **Active** |
| **English Language Pack** | `tessdata_fast/eng.traineddata` | `backend/tessdata/eng.traineddata` | 4.1 MB, Apache-2.0 | **Active** |
| **Hindi Language Pack** | `tessdata_fast/hin.traineddata` | `backend/tessdata/hin.traineddata` | 1.12 MB, Apache-2.0 | **Active & Verified** |
| **Marathi Language Pack** | `tessdata_fast/mar.traineddata` | `backend/tessdata/mar.traineddata` | 2.12 MB, Apache-2.0 | **Active & Verified** |
| **RapidOCR ONNX Fallback** | `RapidAI/RapidOCR` | Python `rapidocr_onnxruntime 1.4.4` | ONNX runtime engine | **Active & Verified** |
| **Multilingual Embedding Model** | `intfloat/multilingual-e5-small` | `backend/models/multilingual-e5-small/` | 118.3 MB ONNX, 384-dim, MIT | **Active & Cached** |
| **Sentence Embedding Fallback** | `paraphrase-multilingual-MiniLM-L12-v2` | `backend/models/paraphrase-multilingual-MiniLM-L12-v2/` | 118.3 MB ONNX, 384-dim, Apache-2.0 | **Active & Cached** |
| **Perceptual Image Hashing** | `ImageHash` | Python `imagehash 4.3.2` | 64-bit dHash/pHash, BSD-2 | **Active & Verified** |

---

## 3. Test Execution Verification

Command:
```powershell
$env:PYTHONPATH="backend"; python -m pytest backend/tests
```

Output:
```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-8.3.3, pluggy-1.6.0
rootdir: C:\Users\darak\Downloads\last finale
plugins: anyio-4.15.1, langsmith-0.14.4, logfire-sdk-5.4.0, platformdirs-4.14.2, asyncio-0.24.0, cov-7.1.0, html-4.2.0, metadata-3.1.1
asyncio: mode=Mode.STRICT, default_loop_scope=None
collected 130 items

backend\tests\test_a1_visualguard.py .............................       [ 22%]
backend\tests\test_a2_evidence.py ........................               [ 40%]
backend\tests\test_a3_sentinel.py .................                      [ 53%]
backend\tests\test_auth.py ....                                          [ 56%]
backend\tests\test_comprehensive_governance.py ...........               [ 65%]
backend\tests\test_conflicts.py .                                        [ 66%]
backend\tests\test_exceptions.py ...                                     [ 68%]
backend\tests\test_hardening.py .............                            [ 78%]
backend\tests\test_rbac.py ..                                            [ 80%]
backend\tests\test_regression_contract.py ..                             [ 81%]
backend\tests\test_rule_engine.py ........                               [ 87%]
backend\tests\test_second_batch_innovations.py ......                    [ 92%]
backend\tests\test_simulation.py .                                       [ 93%]
backend\tests\test_submissions.py ...                                    [ 95%]
backend\tests\test_workspace_isolation.py ......                         [100%]

================ 130 passed, 102 warnings in 128.38s (0:02:08) ================
```

**Result:** 130 passed, 0 failed, 100% pass rate.

---

## 4. Production Frontend Build Verification

Command:
```powershell
npm run build
```

Output:
```
> precedent@0.1.0 build
> tsc --noEmit && vite build

vite v5.4.21 building for production...
transforming...
✓ 1625 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.45 kB │ gzip:   0.72 kB
dist/assets/index-CdxLrPK3.css   92.64 kB │ gzip:  15.61 kB
dist/assets/index-BoNp2yGx.js   621.65 kB │ gzip: 163.23 kB
✓ built in 7.79s
```

**Result:** Zero TypeScript compilation errors, production assets rendered to `dist/`.

---

## 5. Non-Negotiable Governance Principles Enforced

1. **Deterministic Rule Engine as Decision Source of Truth:**
   AI and computer vision models provide detected facts, candidate passages, and recommended edits. No LLM or agent can approve content, activate rules, grant exceptions, or mutate policy.
2. **Missing Facts Evaluated as `Needs Human Review`:**
   When logo match confidence is below calibrated threshold (< 0.40) or font rendering cannot be verified on a raster canvas, the system never invents a pass or violation; it returns `unknown` / `Needs Human Review`.
3. **Citation-Verified Semantic Retrieval:**
   Every AI finding must cite an active rule code and quote an exact substring from stored passages. Fabricated citations are rejected and audited.
4. **Post-Publication Idempotent Sweep:**
   Sentinel enforces a composite unique constraint on `(submission_version_id, trigger_type, trigger_ref)` to prevent duplicate task generation on repeated automated scans.
