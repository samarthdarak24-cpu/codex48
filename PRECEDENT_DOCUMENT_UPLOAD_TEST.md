# PRECEDENT Document Upload Test

**Feature:** DOCX Guideline Document Upload  
**Role:** Brand Manager  
**Route:** `/manager/brand-guidelines`  
**API:** `POST /guidelines` (multipart/form-data)  
**Status:** PASS

---

## Test File

| Field | Value |
|-------|-------|
| Filename | `PureGlow_QA_Marketing_Guidelines.docx` |
| Size | 37,442 bytes |
| Location | `qa_test_assets/PureGlow_QA_Marketing_Guidelines.docx` |

Document contains 7 sections:
1. Brand Voice
2. Approved Product Claims ("Supports healthy-looking skin")
3. Restricted Claims ("India's No. 1", "100% Safe for Everyone", etc.)
4. Marketing Rules (CL-03, CL-04, CL-05)
5. Visual Branding
6. Social Media Guidelines
7. Evidence Requirements

---

## Browser Upload Steps Verified

1. File picker opens — PASS
2. File selected — PASS
3. File validation works — PASS (DOCX extension allowed, magic bytes PK verified)
4. Upload starts — PASS
5. Upload progress appears — PASS
6. Backend accepts DOCX — PASS (HTTP 200)
7. Database record created — PASS (GuidelineDoc record)
8. Document appears in list — PASS
9. Preview opens — PASS (via `/guidelines/{id}/file`)
10. Text extraction works — PASS (24 passages extracted)
11. All 7 sections retrievable — PASS
12. CL-03, CL-04, CL-05 searchable — PASS (search returns these passages)
13. Document version correct — PASS (1.0)
14. Refresh preserves document — PASS
15. Creator can access — PASS (visible_to_creators=true)

---

## API Verification

**POST /guidelines** response:
```json
{
  "id": "gdoc_b8e744202dc5",
  "name": "PureGlow Marketing Guidelines QA",
  "category": "Marketing Assets",
  "version": "1.0",
  "status": "active",
  "fileType": "DOCX",
  "fileSize": "37.2 KB",
  "pages": 4,
  "extractedPassages": 24,
  "visibleToCreators": true
}
```

**GET /guidelines/search?q=approved%20claims** → 9 results including CL-03, CL-04, CL-05 passages from uploaded document.

**GET /guidelines/{id}/file** → HTTP 200, SHA-256: `04579f767bf6d450b762244fa972a1b13c776e89f55d1cb88b487d609add9fea` (matches source)

**GET /guidelines/{id}/passages** → 24 passages, HTTP 200.

---

**Status: PASS** — All document upload verification checks passed.