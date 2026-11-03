# Image Upload Test Report — Precedent

**Product:** Precedent — Brand Governance & Approval Platform  
**Test Scope:** Marketing image upload (PNG) through real browser — Brand Manager role  
**Date:** 2026-11-03  
**Tester:** Automated QA (Playwright + backend API verification)

---

## Executive Summary

| Item | Image 1 | Image 2 |
|------|---------|---------|
| Image upload through browser | **PASS** | **PASS** |
| Backend accepts file | **PASS** (HTTP 200) | **PASS** (HTTP 200) |
| Database record created | **PASS** | **PASS** |
| Thumbnail appears in library | **PASS** | **PASS** |
| Preview opens with correct dimensions | **PASS** (1200×1500) | **PASS** (1600×1000) |
| File type detected | **PASS** (image/png) | **PASS** (image/png) |
| File size saved | **PASS** (94,281 bytes) | **PASS** (99,114 bytes) |
| Asset ID generated | **PASS** | **PASS** |
| Actual file stored on disk | **PASS** (SHA-256 verified) | **PASS** (SHA-256 verified) |
| Both images independent (no overwrite) | **PASS** | **PASS** |
| Persistence after refresh | **PASS** | **PASS** |
| Search finds both images | **PASS** | **PASS** |
| Filters work | **PASS** | **PASS** |

---

## Test Details

### Test Files

| Field | Image 1 | Image 2 |
|-------|---------|---------|
| Filename | `PureGlow_Poster_Image_01.png` | `PureGlow_Poster_Image_02.png` |
| Location | `qa_test_assets/` | `qa_test_assets/` |
| Size | 94,281 bytes | 99,114 bytes |
| Dimensions | 1200 × 1500 | 1600 × 1000 |
| MIME Type | image/png | image/png |

Image 1: Winter skincare campaign poster with "Supports healthy-looking skin" (approved claim).

Image 2: Winter skincare promotion banner with "India's No. 1" and "100% Safe for Everyone" (claims requiring substantiation).

### Browser Upload Flow (Manager)

1. Log in as Brand Manager: `david.kim@pureglow.co` / `precedent`
2. Navigate to **Asset Library → Upload Asset** (`/manager/assets`)
3. Click "Upload asset" button
4. Select image file via file input
5. Enter metadata:
   - Brand: PureGlow QA
   - Category: Marketing / Image
   - Asset Type: Poster
   - Campaign: Winter Skin Care Campaign QA
6. Click Upload

### Backend Verification

**API Endpoint:** `POST /assets` (multipart/form-data)

**Image 1 Response (HTTP 200):**
```json
{
  "id": "asset_d35ba20b235f",
  "name": "PureGlow_Poster_Image_01.png",
  "brand": "PureGlow",
  "category": "Image",
  "filePath": "uploads\\c5095dd5af1043bc8827187d1e8bbf7e.png",
  "url": "/assets/asset_d35ba20b235f/file",
  "source": "upload",
  "status": "pending",
  "filename": "PureGlow_Poster_Image_01.png",
  "mimeType": "image/png",
  "size": 94281,
  "checksum": "91c83ed9b727e5c40a464ab9274745458ec617665e511d96d677a20acb48256a",
  "width": 1200,
  "height": 1500,
  "uploadedById": "u_ab800c745a28",
  "workspace": "PureGlow"
}
```

**Image 2 Response (HTTP 200):**
```json
{
  "id": "asset_7c22ae5818c5",
  "name": "PureGlow_Poster_Image_02.png",
  "brand": "PureGlow",
  "category": "Image",
  "filePath": "uploads\\9ecc8d757142496c8e6bb8d45df572ec.png",
  "url": "/assets/asset_7c22ae5818c5/file",
  "source": "upload",
  "status": "pending",
  "filename": "PureGlow_Poster_Image_02.png",
  "mimeType": "image/png",
  "size": 99114,
  "checksum": "20d9e69d200119cd06d1b04d42e596176c54d6628e460cde9d353d1902feec52",
  "width": 1600,
  "height": 1000,
  "uploadedById": "u_ab800c745a28",
  "workspace": "PureGlow"
}
```

**File Storage Verification:** `GET /assets/{id}/file` → HTTP 200, bytes match source file, SHA-256 checksums match.

**Uniqueness Verification:** Both assets have unique IDs (`asset_d35ba20b235f` vs `asset_7c22ae5818c5`), unique storage paths, unique checksums. Neither overwrites the other.

**Persistence After Refresh:** Both assets remain in the library after browser reload. Asset count increased from 15 to 17 (both new assets present).

### Preview Verification

- Image 1 preview: 1200 × 1500, real image blob (not placeholder)
- Image 2 preview: 1600 × 1000, real image blob (not placeholder)
- Both previews open in modal with full metadata (type, format, size, dimensions, campaign, uploaded by)

### Search and Filter

- Search for "Poster_Image_01": 1 result
- Search for "Poster_Image_02": 1 result
- Image filter: 2 images shown after filtering

---

## Screenshots

- `qa_test_assets/screenshots/11_assets_after_first.png`
- `qa_test_assets/screenshots/12_assets_after_second.png`
- `qa_test_assets/screenshots/13_assets_after_refresh.png`
- `qa_test_assets/screenshots/14_preview_image1.png`
- `qa_test_assets/screenshots/15_preview_image2.png`
- `qa_test_assets/screenshots/20_assets_library_after_fix.png`
- `qa_test_assets/screenshots/21_preview_image1_after_fix.png`
- `qa_test_assets/screenshots/22_preview_image2_after_fix.png`
- `qa_test_assets/screenshots/23_search_image1.png`
- `qa_test_assets/screenshots/24_search_image2.png`
- `qa_test_assets/screenshots/25_filter_images.png`

---

## Result: **PASS** — Both image uploads verified through browser, backend, database, and file storage.