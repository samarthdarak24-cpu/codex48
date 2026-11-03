# File Storage and Database Report — Precedent

**Product:** Precedent — Brand Governance & Approval Platform  
**Test Scope:** End-to-end trace: Browser → Frontend → Upload API → FastAPI Router → Upload Service → File Storage → Database Record → API Response → Frontend Preview  
**Date:** 2026-11-03  
**Tester:** Automated QA (Playwright + backend API verification)

---

## Executive Summary

| Item | Result |
|------|--------|
| Correct API endpoint used | **PASS** |
| Multipart payload correct | **PASS** |
| Response status correct | **PASS** (200) |
| Stored file location correct | **PASS** (`backend/uploads/`) |
| File size and MIME type correct | **PASS** |
| Unique record ID generated | **PASS** |
| Database persistence verified | **PASS** |
| Workspace and ownership correct | **PASS** (PureGlow workspace) |
| Access permissions enforced | **PASS** |
| Preview URL accessible | **PASS** |
| Stored file hash matches source | **PASS** |
| No orphan files from failed uploads | **PASS** |

---

## Trace Chain — Document Upload

### Browser → Frontend
- File selected via `<FileDrop>` component in `BrandGuidelinesView.tsx`
- File object passed to `api.uploadGuidelineFile(file, name, category, description)`
- FormData constructed with: file, name, description, category, brand, visible_to_creators

### Frontend → Backend API
- **Endpoint:** `POST /guidelines`
- **Payload:** multipart/form-data
- **Headers:** `Authorization: Bearer <jwt>`

### FastAPI Router (`backend/app/routers/guidelines.py`)
- Route: `@router.post("")` under prefix `/guidelines`
- Dependencies: `get_current_user` (auth)
- Calls `documents.validate_and_save_upload(file, uploads_dir)`

### Upload Service (`backend/app/services/documents.py`)
- Validates extension (.docx allowed)
- Validates magic bytes (PK header for DOCX)
- Validates size (< 15 MB)
- Saves to `uploads/` with UUID filename
- Extracts text and passages (python-docx)
- Creates `GuidelineDoc` + `GuidelinePassage` records

### Database Record
- Table: `guideline_docs`
- Fields: id, name, description, category, version, status, file_type, file_size, pages, owner_id, extracted_passages, visible_to_creators, workspace, created_at, updated_at
- Table: `guideline_passages`
- 24 passage records linked to doc_id

### API Response → Frontend Preview
- Response: HTTP 200 with camelCase JSON
- Preview via `GET /guidelines/{id}/file` → FileResponse
- SHA-256 verified: `04579f767bf6d450b762244fa972a1b13c776e89f55d1cb88b487d609add9fea`

---

## Trace Chain — Image Upload

### Browser → Frontend
- File selected via `react-dropzone` in `AssetLibraryView.tsx`
- File object passed to `api.uploadAsset(file, name, brand, category, notes)`
- FormData constructed with: file, name, brand, category, notes

### Frontend → Backend API
- **Endpoint:** `POST /assets`
- **Payload:** multipart/form-data
- **Headers:** `Authorization: Bearer <jwt>`

### FastAPI Router (`backend/app/routers/assets.py`)
- Route: `@router.post("")` under prefix `/assets`
- Dependencies: `get_current_user` (auth)
- Calls `assets.validate_and_save_upload(file, uploads_dir)`

### Upload Service (`backend/app/services/assets.py`)
- Validates extension (.png, .jpg, .jpeg, .webp, .gif allowed)
- Validates content type (including `application/octet-stream` fallback)
- Validates size (< 10 MB)
- Validates magic bytes (PNG, JPEG, WEBP, GIF headers)
- Fully decodes image with Pillow (rejects corrupted/truncated)
- Saves to `uploads/` with UUID filename
- Creates `BrandAsset` record

### Database Record — Image 1
- Table: `brand_assets`
- id: `asset_d35ba20b235f`
- name: `PureGlow_Poster_Image_01.png`
- brand: `PureGlow`
- category: `Image`
- storage_key: `c5095dd5af1043bc8827187d1e8bbf7e.png`
- file_path: `uploads\\c5095dd5af1043bc8827187d1e8bbf7e.png`
- mime_type: `image/png`
- size: 94281
- width: 1200
- height: 1500
- checksum: `91c83ed9b727e5c40a464ab9274745458ec617665e511d96d677a20acb48256a`
- status: `pending`
- uploaded_by_id: `u_ab800c745a28`
- workspace: `PureGlow`

### Database Record — Image 2
- id: `asset_7c22ae5818c5`
- name: `PureGlow_Poster_Image_02.png`
- brand: `PureGlow`
- category: `Image`
- width: 1600
- height: 1000
- size: 99114
- checksum: `20d9e69d200119cd06d1b04d42e596176c54d6628e460cde9d353d1902feec52`
- uploaded_by_id: `u_ab800c745a28`
- workspace: `PureGlow`

### File Storage Verification
- `GET /assets/{id}/file` → HTTP 200
- Content-Type: `application/octet-stream`
- Bytes match source file exactly
- SHA-256 checksums match source files

### Preview URL Accessibility
- Preview URL: `/assets/{id}/file` (token-protected)
- Returns actual image blob (not placeholder)
- Displayed in browser via `URL.createObjectURL(blob)`

---

## Trace Chain — Creator Submission with Image

### New Content View (`NewContentView.tsx`)
- Image uploaded via `api.uploadAsset(file, name, brand, category, notes)`
- Asset stored in library with notes "Uploaded from New Content (Winter Skin Care Campaign QA)"
- Submission created via `POST /submissions`
- Submission references asset via `assetId` field

### Submission Record
- id: `sub_c0214e426cc5`
- code: `SUB-1017`
- title: `PureGlow Multiple Image Upload QA`
- brand: `PureGlow`
- status: `Pending`
- creatorId: `u_580827ea45aa`
- version: 1
- assetId: `asset_c4431d92bae7`
- assetName: `PureGlow_Poster_Image_01`
- assetUrl: `/assets/asset_c4431d92bae7/file`

---

## Access Permissions

- Manager can upload and view all assets in workspace
- Creator can upload assets and view own workspace assets
- RBAC enforced via `require_workspace` dependency
- File download endpoint requires valid JWT token

---

## Result: **PASS** — Complete trace chain verified for all uploads. File hashes match, database records correct, preview URLs accessible.