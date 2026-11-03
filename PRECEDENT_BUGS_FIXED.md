# PRECEDENT Bugs Fixed Report

**Product:** Precedent — AI-Assisted Brand Governance & Content Approval Platform  
**Date:** 2026-11-03  
**Tester:** Autonomous QA Agent

---

## Bug #1: Files with spaces or special characters in filename rejected (415)

### Symptoms
- Uploading `PureGlow Poster Image 01.png` → HTTP 415 "Unsupported content type 'application/octet-stream'"
- Uploading `PureGlow@Poster#Image$01.png` → HTTP 415 "Unsupported content type 'application/octet-stream'"
- Valid PNG files rejected solely due to filename characters

### Root Cause
**File:** `backend/app/services/assets.py`, line 70-75

The `validate_and_save_upload()` function checked the `content_type` header before the magic byte validation. Browsers send `application/octet-stream` as the content type when they don't recognize a file extension (which happens with spaces or special characters in filenames). Since `application/octet-stream` was not in `ALLOWED_MIME_TYPES`, valid image files were rejected before the magic byte check could validate them.

### Fix
**File:** `backend/app/services/assets.py`, line 24

Added `"application/octet-stream"` to `ALLOWED_MIME_TYPES` with a comment explaining that browsers send this for unrecognized extensions and that magic bytes provide the real validation.

**Before:**
```python
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
}
```

**After:**
```python
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/octet-stream",  # browsers send this for unrecognized extensions (spaces, special chars); magic bytes validate the real type
}
```

### Validation After Fix
| Test Case | Before | After |
|-----------|--------|-------|
| Filename with spaces | 415 ❌ | 200 ✅ |
| Filename with special chars | 415 ❌ | 200 ✅ |
| Invalid extension .exe | 415 ✅ | 415 ✅ |
| Corrupted image | 415 ⚠️ | 400 ✅ (proper error code) |
| Oversized file (11MB) | 415 ⚠️ | 413 ✅ (proper error code) |
| Empty file | 415 ⚠️ | 400 ✅ (proper error code) |
| No incomplete uploads appear as assets | ✅ | ✅ |

**Status: FIXED & RETESTED** — All upload validation now returns correct status codes.

---

## Bug #2: Incorrect HTTP status codes for validation errors (pre-fix)

### Symptoms
- Corrupted image returned 415 instead of 400
- Oversized file returned 415 instead of 413
- Empty file returned 415 instead of 400

### Root Cause
Same as Bug #1 — the content type check fired first for files where the browser couldn't determine the MIME type, short-circuiting before the more specific validation checks (size, emptiness, magic bytes) could run.

### Fix
Same fix as Bug #1 — allowing `application/octet-stream` lets the request pass the content type check and proceed to the proper validation pipeline where size, emptiness, and magic byte checks return the correct HTTP status codes.

---

## No Other Bugs Found

All other upload functionality verified working:
- Document upload (DOCX) — PASS
- Image upload (PNG) — PASS
- Multiple independent images — PASS
- OCR and image analysis — PASS
- Error handling for invalid files — PASS
- Persistence after refresh — PASS
- Cross-role visibility (Manager ↔ Creator) — PASS

**Status: NO OTHER BUGS**

---

## Summary

| Bug | File | Fix | Status |
|-----|------|-----|--------|
| Files with spaces/special chars rejected (415) | `backend/app/services/assets.py:24` | Added `"application/octet-stream"` to `ALLOWED_MIME_TYPES` | **FIXED & RETESTED** |
| Incorrect status codes (root cause same as Bug 1) | Same | Same fix | **FIXED & RETESTED** |

**Total bugs fixed: 1** (single root cause, one file changed, all retests passed).