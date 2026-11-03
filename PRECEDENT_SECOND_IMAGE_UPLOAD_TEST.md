# PRECEDENT Second Image Upload Test

**Feature:** Manager Asset Library — Upload Second Image Independently  
**Role:** Brand Manager  
**Route:** `/manager/assets` → Upload Asset  
**API:** `POST /assets` (multipart/form-data)  
**Status:** PASS

---

## Test File

| Field | Value |
|-------|-------|
| Filename | `PureGlow_Winter_Banner_02.png` |
| Size | 88,564 bytes |
| Dimensions | 1600 × 1000 |
| Location | `qa_test_assets/PureGlow_Winter_Banner_02.png` |
| Content | PureGlow QA winter banner with "India's No. 1 Skin Care Product." and "100% Safe for Everyone." |

---

## Browser Upload Steps Verified

1. Navigate to Asset Library → Upload Asset — PASS
2. File selector opens — PASS
3. Image 02.png selected — PASS
4. Metadata entered:
   - Brand: PureGlow QA
   - Category: Marketing
   - Type: Banner
   - Campaign: Winter Skin Care Campaign QA
5. Upload clicked — PASS
6. Upload succeeds — PASS (HTTP 200)
7. Second asset created independently — PASS (unique ID)
8. Image 01.png still exists in library — PASS
9. Image 02.png has different asset ID — PASS
10. Both thumbnails display — PASS
11. Both previews open — PASS
12. Both remain after browser refresh — PASS
13. Neither image overwrites the other — PASS
14. Unique checksums for each — PASS

---

## API Verification

**POST /assets (Image 2)** response:
```json
{
  "id": "asset_7c22ae5818c5",
  "name": "PureGlow_Winter_Banner_02.png",
  "brand": "PureGlow",
  "category": "Image",
  "filePath": "uploads\\9ecc8d757142496c8e6bb8d45df572ec.png",
  "url": "/assets/asset_7c22ae5818c5/file",
  "source": "upload",
  "status": "pending",
  "filename": "PureGlow_Winter_Banner_02.png",
  "mimeType": "image/png",
  "size": 88564,
  "checksum": "e2d9e69d200119cd06d1b04d42e596176c54d6628e460cde9d353d1902feec52",
  "width": 1600,
  "height": 1000,
  "uploadedById": "u_ab800c745a28",
  "workspace": "PureGlow"
}
```

**Key verification:**
- Image 1 ID: `asset_d35ba20b235f` 
- Image 2 ID: `asset_7c22ae5818c5`
- Different checksums: `81c83ed9...` vs `e2d9e69d...`
- Different file paths on disk
- Both visible in asset library grid
- Both have independent preview URLs

---

**Status: PASS** — Second image uploaded independently, both assets verified with unique IDs and checksums.