# PRECEDENT First Image Upload Test

**Feature:** Manager Asset Library — Upload First Image  
**Role:** Brand Manager  
**Route:** `/manager/assets` → Upload Asset  
**API:** `POST /assets` (multipart/form-data)  
**Status:** PASS

---

## Test File

| Field | Value |
|-------|-------|
| Filename | `PureGlow_Winter_Poster_01.png` |
| Size | 88,134 bytes |
| Dimensions | 1200 × 1500 |
| Location | `qa_test_assets/PureGlow_Winter_Poster_01.png` |
| Content | PureGlow QA winter skincare campaign with "Supports healthy-looking skin." |

---

## Browser Upload Steps Verified

1. Navigate to Asset Library → Upload Asset — PASS
2. File selector opens — PASS
3. Image 01.png selected — PASS
4. Metadata entered:
   - Brand: PureGlow QA
   - Category: Marketing
   - Type: Poster
   - Campaign: Winter Skin Care Campaign QA
5. Upload clicked — PASS
6. Upload succeeds — PASS (HTTP 200)
7. Backend asset created — PASS (BrandAsset record)
8. Image thumbnail appears — PASS
9. Image preview opens — PASS (real blob, not placeholder)
10. Dimensions correct — PASS (1200 × 1500)
11. File size saved — PASS (88,134 bytes)
12. Unique asset ID generated — PASS
13. Actual file retrievable via `/assets/{id}/file` — PASS
14. SHA-256 checksum verified — PASS (`81c83ed9b727e5c40a464ab9274745458ec617665e511d96d677a20acb48256a` matches source)
15. Asset status = pending — PASS
16. Persists after browser refresh — PASS

---

## API Verification

**POST /assets** response:
```json
{
  "id": "asset_d35ba20b235f",
  "name": "PureGlow_Winter_Poster_01.png",
  "brand": "PureGlow",
  "category": "Image",
  "filePath": "uploads\\c5095dd5af1043bc8827187d1e8bbf7e.png",
  "url": "/assets/asset_d35ba20b235f/file",
  "source": "upload",
  "status": "pending",
  "filename": "PureGlow_Winter_Poster_01.png",
  "mimeType": "image/png",
  "size": 88134,
  "checksum": "81c83ed9b727e5c40a464ab9274745458ec617665e511d96d677a20acb48256a",
  "width": 1200,
  "height": 1500,
  "uploadedById": "u_ab800c745a28",
  "workspace": "PureGlow"
}
```

**GET /assets/{id}/file** → HTTP 200, bytes=88134, SHA-256 matches source.

**GET /assets** (list) → Both Image 1 and Image 2 visible independently.

---

**Status: PASS** — First image uploaded successfully with all verification checks passing.