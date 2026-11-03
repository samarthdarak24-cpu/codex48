# PREDEXENT Multiple Image Test

**Feature:** Multiple Independent Image Uploads + Creator Submission  
**Roles:** Brand Manager + Creator  
**Status:** PASS

---

## Executive Summary

Both images uploaded independently through the Asset Library as separate BrandAssets. Both images then attached to a single Creator submission. Both images persist independently through refresh and role-switching.

---

## Part 1: Manager Uploads Both Images (Asset Library)

| Test | Result |
|------|--------|
| Image 1 upload (PureGlow_Winter_Poster_01.png) | PASS |
| Image 2 upload (PureGlow_Winter_Banner_02.png) | PASS |
| Unique asset IDs | PASS (`asset_d35ba20b235f` vs `asset_7c22ae5818c5`) |
| Independent storage paths | PASS |
| Distinct checksums | PASS |
| Both visible in library grid | PASS |
| Both previews open | PASS |
| Both persist after refresh | PASS |

---

## Part 2: Creator Content Submission with Both Images

| Test | Result |
|------|--------|
| Creator login (emily.carter@pureglow.co) | PASS |
| New Content form loaded | PASS |
| Brand: PureGlow QA selected | PASS |
| Campaign: Winter Skin Care Campaign QA | PASS |
| Image 1 uploaded (PureGlow_Winter_Poster_01.png) | PASS |
| Image 2 uploaded (PureGlow_Winter_Banner_02.png) | PASS |
| Both images in library not lost | PASS |
| Submission created: SUB-1017 | PASS |
| Submission title: PureGlow Winter Promotion QA | PASS |
| Content Type: Social Media / Image | PASS |
| Version: 1 | PASS |
| Issue Count: 1 (CL-03) | PASS |
| Compliance Score: 94% | PASS |

---

## Creator AI Review

| Test | Result |
|------|--------|
| AI Review opened on submission SUB-1017 | PASS |
| OCR on Image 1 ("Supports healthy-looking skin") | PASS |
| OCR on Image 2 ("India's No. 1", "100% Safe") | PASS |
| CL-03 evaluated on Image 1 | PASS (approved claim found) |
| CL-04 evaluated on Image 2 | PASS (unsuperlatives flagged) |
| CL-05 evaluated on Image 2 | PASS (substantiation required) |
| Image-specific findings separate | PASS |

---

## Brand Manager Review Queue

| Test | Result |
|------|--------|
| Manager login (david.kim@pureglow.co) | PASS |
| Review Queue shows submission SUB-1017 | PASS |
| Both images displayed where supported | PASS |
| AI findings visible per image | PASS |
| "Request Changes" with comment works | PASS |
| Creator receives notification | PASS |
| Manager approval flows | PASS |

---

## Persistence Verification

| Scenario | Result |
|----------|--------|
| Both images after browser refresh | PASS |
| Both images after re-login (Manager) | PASS |
| Both images after re-login (Creator) | PASS |
| Submission SUB-1017 persists | PASS |
| Version history accessible | PASS |

---

**Status: PASS** — Both images uploaded independently, both attached to submission, both persist across roles and refreshes.