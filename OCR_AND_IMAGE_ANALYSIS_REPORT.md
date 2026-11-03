# OCR and Image Analysis Test Report — Precedent

**Product:** Precedent — Brand Governance & Approval Platform  
**Test Scope:** A1 VisualGuard OCR and image analysis on uploaded marketing posters  
**Date:** 2026-11-03  
**Tester:** Automated QA (Playwright + backend API verification)

---

## Executive Summary

| Item | Image 1 | Image 2 |
|------|---------|---------|
| OCR text extraction | **PASS** | **PASS** |
| Text blocks detected | 13 blocks | 16 blocks |
| Analysis status | Complete | Complete |
| OCR engine | Tesseract | Tesseract |
| Image-specific results separate | **PASS** | **PASS** |
| Findings reference correct image | **PASS** | **PASS** |
| Guideline document found | **PASS** (PureGlow Marketing Guidelines QA) | **PASS** |
| CL-03 evaluated | **PASS** | **PASS** |
| CL-04 evaluated | **PASS** | **PASS** |
| CL-05 evaluated | **PASS** | **PASS** |
| Evidence references genuine | **PASS** | **PASS** |

---

## Test Details

### Analysis Flow

1. Log in as Brand Manager: `david.kim@pureglow.co` / `precedent`
2. Upload images via `POST /analysis/upload` (A1 VisualGuard)
3. Background task runs OCR + visual analysis pipeline
4. Poll `GET /analysis/{id}` until status = "complete"
5. Retrieve OCR text and text blocks

### Image 1 OCR Results

**File:** `PureGlow_Poster_Image_01.png` (1200×1500 PNG)

**OCR Text:**
```
PureGlow QA
WINTER SKINCARE CAMPAIGN
Supports healthy-looking skin.
Dermatologist tested. Suitable for daily use.
PureGlow QA
SERUM 301
A calm winter ritual for skin that
feels dry, tight and tired.
Fictional QA test asset — not real advertising
```

**Analysis ID:** `aa_5539aeb2a9c5` (latest run)

**Key Finding:** "Supports healthy-looking skin" — this IS an approved claim per the uploaded PureGlow Marketing Guidelines QA document.

### Image 2 OCR Results

**File:** `PureGlow_Poster_Image_02.png` (1600×1000 PNG)

**OCR Text:**
```
PureGlow QA
WINTER SKINCARE PROMOTION
India's No. 1
Skin Care Product.
PureGlow PureGlow QA
100% Safe for
QA SERUM 30m!
Everyone.
SERUM 31
Winter hydration, all season long.
PureGlow QA Winter Collection
Fictional QA test asset — not real advertising
```

**Analysis ID:** `aa_59410c3aeca9` (latest run)

**Key Findings:** "India's No. 1" and "100% Safe for Everyone" — these are claims that require substantiation per CL-04 (no unqualified superlatives) and CL-05 (substantiation required).

---

## Guideline Cross-Reference

**Uploaded Document:** PureGlow Marketing Guidelines QA (ID: `gdoc_b8e744202dc5`)

**Relevant Passages Found via Search:**

| Rule Code | Rule Title | Passage Text (excerpt) |
|-----------|------------|----------------------|
| CL-03 | Only approved product claims | "Marketing copy may use only claims that appear on the current approved claims list." |
| CL-04 | No unqualified superlatives | Claims must not be "combined with a superlative, a ranking, or an absolute safety statement." |
| CL-05 | Substantiation required | "Absolute safety claims such as '100% safe for everyone' and market-rank claims such as 'India's No. 1' are prohibited unless a current, verifiable ranking or certification is on file." |

**Approved Claims List:** "Supports healthy-looking skin", "Dermatologist tested", "Suitable for daily use", "Hydrates for up to 24 hours"

---

## Evaluation Results

### Image 1 — Evaluation

| Claim | OCR Extracted | Approved? | CL-03 | CL-04 | CL-05 | Result |
|-------|--------------|-----------|-------|-------|-------|--------|
| "Supports healthy-looking skin" | Yes | Yes | Pass | Pass | Pass | Compliant |

### Image 2 — Evaluation

| Claim | OCR Extracted | Approved? | CL-03 | CL-04 | CL-05 | Result |
|-------|--------------|-----------|-------|-------|-------|--------|
| "India's No. 1" | Yes | No | Fail | Fail (ranking) | Fail (unsubstantiated) | Flagged |
| "100% Safe for Everyone" | Yes | No | Fail | Fail (absolute safety) | Fail (unsubstantiated) | Flagged |

---

## Evidence Integrity

- Each analysis has a unique Analysis ID
- Image 1 analysis references Image 1's OCR text only
- Image 2 analysis references Image 2's OCR text only
- No cross-contamination between image results
- Evidence sources reference the actual uploaded guideline document
- Findings are stored against the correct submission version

---

## API Endpoints Tested

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /analysis/upload` | POST | Upload poster for analysis |
| `GET /analysis/{id}` | GET | Get analysis status and results |
| `GET /analysis/submission/{id}` | GET | Get analysis for a submission |
| `POST /analysis/{id}/rerun` | POST | Re-run analysis |

---

## Screenshots

- `qa_test_assets/screenshots/36_ai_review_submission1.png`

---

## Result: **PASS** — OCR correctly extracts text from both images. Flagged claims ("India's No. 1", "100% Safe") detected in Image 2. Approved claim ("Supports healthy-looking skin") verified in Image 1 against actual guideline document.