# PRECEDENT Database Verification Report — Part 1: Document Upload Trace

**Feature:** End-to-End Trace — Browser → Frontend → API → Backend Service → Database  
**Status:** PASS — Document upload trace verified

---

## Trace Chain — Document Upload

### Browser → Frontend
- File selected via `<FileDrop>` in `BrandGuidelinesView.tsx`
- FormData constructed: `file`, `name`, `description`, `category`, `brand`, `visible_to_creators`
- No mock data — real File object from browser filesystem

### Frontend → Backend API
- **Endpoint:** `POST /guidelines`
- **Payload:** multipart/form-data
- **Headers:** `Authorization: Bearer <jwt>`
- **Response:** HTTP 200 with camelCase JSON

### FastAPI Router (`backend/app/routers/guidelines.py`)
- Route: `@router.post("")` under prefix `/guidelines`
- Calls `documents.validate_and_save_upload(file, uploads_dir)`

### Upload Service (`backend/app/services/documents.py`)
1. Validates extension (.docx allowed, line 34)
2. Validates magic bytes (PK header for DOCX, line 62-66)
3. Validates size (< 15 MB, line 46-50)
4. Saves to `backend/uploads/` with UUID filename (line 74-77)
5. Extracts text with python-docx (line 83-198)
   - Creates `GuidelineDoc` record with: name, description, category, version, status, file_type, file_size, pages, owner_id, extracted_passages, visible_to_creators, workspace, created_at, updated_at
   - Creates 24 `GuidelinePassage` records linked to doc_id

### Database Record — `guideline_docs` Table

| Field | Value |
|-------|-------|
| id | `gdoc_b8e744202dc5` |
| name | `PureGlow Marketing Guidelines QA` |
| description | `QA test upload — marketing brand guidelines for PureGlow QA.` |
| category | `Marketing Assets` |
| version | `1.0` |
| status | `active` |
| file_type | `DOCX` |
| file_size | `37.2 KB` |
| pages | `4` |
| owner_id | `u_ab800c745a28` |
| extracted_passages | `24` |
| visible_to_creators | `true` |
| workspace | `PureGlow` |