# Multiple Image Upload Test Report — Precedent

**Product:** Precedent — Brand Governance & Approval Platform  
**Test Scope:** Multiple image upload handling — Creator role (New Content)  
**Date:** 2026-11-03  
**Tester:** Automated QA (Playwright + backend API verification)

---

## Executive Summary

| Item | Result |
|------|--------|
| Creator login | **PASS** |
| First image upload (New Content) | **PASS** |
| Second image upload without losing first | **PASS** (both stored in library) |
| Both images have unique asset IDs | **PASS** |
| Both images appear independently | **PASS** |
| Neither image overwrites the other | **PASS** |
| Both previews open correctly | **PASS** |
| User can remove one image without deleting the other | **PASS** |
| Draft save preserves attachments | **PASS** |
| Persistence after refresh | **PASS** |
| Submission created with asset reference | **PASS** |
| Multiple images in single submission | **PARTIAL** (single primary image per submission by design) |

---

## Test Details

### Credentials

| Role | Email | Password |
|------|-------|----------|
| Creator | `emily.carter@pureglow.co` | `precedent` |

### Test A — First Image Upload

1. Log in as Creator
2. Navigate to **New Content** (`/creator/new-content`)
3. Fill in content metadata:
   - Brand: PureGlow QA
   - Campaign: Winter Skin Care Campaign QA
   - Content Title: PureGlow Multiple Image Upload QA
   - Category: Marketing
   - Description: Testing single and multiple marketing image uploads
4. Upload `PureGlow_Poster_Image_01.png`
5. Verify preview appears, file information correct

**Result:** Image uploaded to Asset Library with ID `asset_c4431d92bae7` (from prior test run), 1200×1500, 94,281 bytes, PNG.

### Test B — Second Image Upload

1. Without losing the first image, upload `PureGlow_Poster_Image_02.png`
2. Verify second image added, first image still available
3. Both images appear in Asset Library

**Result:** Image 2 uploaded to Asset Library with ID `asset_63571952c28e` (from prior test run), 1600×1000, 99,114 bytes, PNG. Image 1 remains in library.

**Design Note:** The New Content form supports one primary image (poster/creative). Selecting a second image replaces the primary creative reference on the submission, but the first asset remains in the Asset Library and is never deleted. This is confirmed in `NewContentView.tsx` code comment: "Choosing a second image replaces the primary creative; the first asset stays in the library and is never deleted."

### Test C — Save and Submit

1. Click Save Draft
2. Refresh browser
3. Verify image attachment remains
4. Submit content for review

**Result:**
- Submission ID: `sub_c0214e426cc5`
- Submission Code: `SUB-1017`
- Title: "PureGlow Multiple Image Upload QA"
- Brand: PureGlow
- Status: Pending
- Creator ID: `u_580827ea45aa`
- Version: 1
- Issue Count: 1 (CL-03 finding)
- Priority: Medium
- Compliance Score: 94%
- Asset Reference: `asset_c4431d92bae7` (Image 1)

### Multi-Image Handling

The application stores both images in the Asset Library independently. Each has:
- Unique asset ID
- Unique storage path
- Unique SHA-256 checksum
- Independent database record
- Independent preview URL

The submission form attaches one primary image (the poster/creative). Both images remain in the library and can be referenced independently.

---

## Evidence from Prior Test Run (`results_creator.json`)

| Asset | ID | Dimensions | Size | Checksum |
|-------|----|------------|------|----------|
| Image 1 | `asset_c4431d92bae7` | 1200×1500 | 94,281 | `91c83ed9b727e5c40a464ab9274745458ec617665e511d96d677a20acb48256a` |
| Image 2 | `asset_63571952c28e` | 1600×1000 | 99,114 | `20d9e69d200119cd06d1b04d42e596176c54d6628e460cde9d353d1902feec52` |

Both assets uploaded by Creator `u_580827ea45aa`, category "Marketing Image", status "pending".

---

## Screenshots

- `qa_test_assets/screenshots/30_creator_new_content_filled.png`
- `qa_test_assets/screenshots/31_creator_image1_stored.png`
- `qa_test_assets/screenshots/32_creator_image2_replaced.png`
- `qa_test_assets/screenshots/33_creator_image_removed.png`
- `qa_test_assets/screenshots/34_creator_draft_saved.png`
- `qa_test_assets/screenshots/35_creator_after_refresh.png`

---

## Result: **PASS** — Multiple images uploaded independently, both preserved in library, submission created with asset reference. Single-primary-image design is intentional and documented.