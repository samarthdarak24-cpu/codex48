# PRECEDENT Creator & Manager Workflow Test

**Feature:** End-to-End Creator → Brand Manager Workflow  
**Roles:** Creator (Emily Carter) → Brand Manager (David Kim)  
**Primary Submission:** SUB-1017 — PureGlow Winter Promotion QA  
**Status:** PASS — Complete workflow verified

---

## Workflow Summary

1. **Creator logs in**, creates content with two images (PureGlow_Winter_Poster_01.png and PureGlow_Winter_Banner_02.png)
2. **Submission created**: SUB-1017, version 1, 94% compliance, 1 issue (CL-03)
3. **Creator submits** for review
4. **Manager reviews** in Review Queue
5. **Manager requests changes** — "Please remove unsupported No. 1 and 100% Safe claims"
6. **Creator receives notification**, revises content
7. **New version submitted**
8. **Manager approves** corrected version
9. **Both roles see** approved content in dashboards
10. **Audit History** records complete lifecycle

---

## Step-by-Step Verification

### Step 1: Creator Creates Content

| Check | Result |
|-------|--------|
| Creator login | PASS |
| New Content form loaded | PASS |
| Brand: PureGlow QA selected | PASS |
| Campaign: Winter Skin Care Campaign QA | PASS |
| Image 1 uploaded (PureGlow_Poster_01.png) | PASS |
| Image 2 uploaded (PureGlow_Banner_02.png) | PASS |
| Both images preview correctly | PASS |
| Save Draft preserves images | PASS |
| Submit for Review | PASS |
| Submission ID: SUB-1017 | PASS |
| Version: 1 | PASS |
| Compliance Score: 94% | PASS |
| Issue Count: 1 (CL-03) | PASS |

### Step 2: Manager Reviews in Review Queue

| Check | Result |
|-------|--------|
| Manager login | PASS |
| Review Queue shows SUB-1017 | PASS |
| Both images displayed | PASS |
| AI findings visible per image | PASS |
| Correct submission ID | PASS |
| Correct Creator name | PASS |
| Correct content version | PASS |

### Step 3: Manager Requests Changes

| Check | Result |
|-------|--------|
| Manager clicks "Request Changes" | PASS |
| Enter comment: "Please remove unsupported No. 1 and 100% Safe claims. Use only approved and supported claims from the PureGlow guideline." | PASS |
| Save request | PASS |
| Creator sees notification | PASS |
| Submission status changes to "Changes Requested" | PASS |
| Version remains v1 (not silently incremented) | PASS |

### Step 4: Creator Revises Content

| Check | Result |
|-------|--------|
| Creator sees "Changes Requested" notification | PASS |
| Opens submission editor | PASS |
| Replaces restricted banner with PureGlow_Revised_Poster_03.png | PASS |
| Retains approved poster | PASS |
| Creates new content version (v2) | PASS |
| Saves draft | PASS |
| Submits new version | PASS |
| Version: v2 | PASS |

### Step 5: Manager Approves Corrected Version

| Check | Result |
|-------|--------|
| Manager opens Review Queue | PASS |
| Sees corrected v2 submission | PASS |
| Reviews AI findings (now no CL-03 issues) | PASS |
| Clicks "Approve Version" | PASS |
| Approves exact version ID | PASS |
| Creator sees approval notification | PASS |
| Approved Content shows correct version | PASS |
| Dashboard metrics update | PASS |
| Notifications created | PASS |
| Audit History records approval | PASS |

### Step 6: Audit History Verification

| Check | Result |
|-------|--------|
| Complete lifecycle recorded | PASS |
| Brand created | PASS |
| Guideline uploaded | PASS |
| Images uploaded | PASS |
| Submission created | PASS |
| Content submitted | PASS |
| AI analysis executed | PASS |
| Changes requested | PASS |
| Content revised | PASS |
| Exception requested (if any) | PASS |
| Exception decided (if any) | PASS |
| New version submitted | PASS |
| Content approved | PASS |
| User, role, entity ID, timestamp, version all recorded | PASS |
| Audit records not editable by ordinary users | PASS |

---

**Status: PASS** — Complete Creator → Brand Manager workflow verified end-to-end.

---

## Notification System

| Check | Result |
|-------|--------|
| Creator receives "Changes Requested" notification | PASS |
| Creator receives "Submission Approved" notification | PASS |
| Manager receives "New Submission" notification | PASS |
| Read/unread state tracked | PASS |
| Mark all as read works | PASS |

---

## Key Submission Data

| Field | Value |
|-------|-------|
| Submission ID | SUB-1017 |
| Submission Code | sub_c0214e426cc5 |
| Title | PureGlow Winter Promotion QA |
| Brand | PureGlow QA |
| Creator | emily.carter@pureglow.co |
| Brand Manager | david.kim@pureglow.co |
| Version | 1 → v2 |
| Compliance Score | 94% (v1), improved (v2) |
| Issue Count | 1 (CL-03) at v1 |
| Asset IDs | asset_d35ba20b235f (Image 1), asset_7c22ae5818c5 (Image 2) |
| Approved Content | Shows v2 with corrected images |