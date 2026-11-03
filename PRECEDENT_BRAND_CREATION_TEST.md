# PRECEDENT Brand Creation Test

**Feature:** Brand / Workspace Creation  
**Role:** Brand Manager  
**Route:** `/manager/overview` (no dedicated brand creation UI found)  
**Status:** PARTIAL

---

## Test Summary

The Precedent application uses a fixed workspace-based brand system. There is no dedicated brand creation UI in the 21 screens. The brand "PureGlow" is pre-configured as the default workspace brand.

## Verification

| Check | Result | Evidence |
|-------|--------|----------|
| Brand "PureGlow QA" exists in system | PARTIAL | "PureGlow" is the default brand in seed data |
| Brand appears in selection dropdowns | PARTIAL | Brand selector in New Content view shows "PureGlow" |
| Brand available to both roles | PASS | Both manager and creator see "PureGlow" as brand option |
| Brand persists after refresh | PASS | Verified through API calls across sessions |
| Workspace permissions correct | PASS | Manager sees all workspace assets; creator sees own workspace |

## Backend Verification

The `/team` endpoint returns workspace members. The brand "PureGlow" is embedded in:
- Asset records (`brand: "PureGlow"`)
- Guideline documents (`brand: "PureGlow"`)
- Submission records (`brand: "PureGlow"`)
- User workspaces (`workspace: "PureGlow"`)

## Limitation

No dedicated brand creation UI exists in the 21 screens. Brand is set at workspace level during system seeding. To create "PureGlow QA" as a distinct brand would require backend changes beyond the current UI scope.

**Workaround:** Used existing "PureGlow" brand with QA-tagged assets and documents for all testing.

---

**Status: PARTIAL** — Brand creation UI not implemented; existing "PureGlow" brand used for all QA testing.