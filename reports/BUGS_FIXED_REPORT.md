# BUGS FIXED REPORT

### Bug 1: Unintended Page Reload on Document Upload
- **Problem:** Clicking "Upload" in Manager Guidelines modal caused an unintended full page reload.
- **Root Cause:**
  1. `<Button>` in `src/components/ui/Button.tsx` lacked `type="button"`, defaulting to `type="submit"` which triggered browser form submissions.
  2. `submitUpload` in `src/pages/manager/GuidelinesRules.tsx` lacked a `catch (err)` block, allowing unhandled exceptions to crash the view.
- **Fix:** Added `type = 'button'` default to `Button.tsx` and wrapped `submitUpload` with structured try-catch-toast handling.

### Bug 2: Transient Session Loss on Page Refresh
- **Problem:** Refreshing the browser or accessing routes during server cold-start dropped the session and redirected to `/login`.
- **Root Cause:** In `AuthContext.tsx`, `authApi.me().catch()` dropped `sessionStorage` on any network hiccup or delay.
- **Fix:** Dual-mirrored session across `sessionStorage` and `localStorage`, and updated `AuthContext.tsx` to preserve active session on network latency, dropping only on explicit HTTP 401 Unauthorized.

### Bug 3: Guideline Document Rule Extraction Returning Empty
- **Problem:** Uploading `PureGlow_QA_Marketing_Brand_Guidelines` created passages but 0 linked rules.
- **Root Cause:** `POST /guidelines` didn't execute rule extraction, and database didn't have `models.Rule` records linked to `source_doc_id`.
- **Fix:** Implemented `extract_and_create_rules_for_doc` with AI and modal verb mining, added auto-extraction on upload, added on-demand endpoint `POST /guidelines/{id}/extract-rules`, and auto-healed documents with 0 rules in `list_guidelines`.

### Bug 4: Guideline Download Producing Short `.md` File
- **Problem:** Download button downloaded an arbitrary `.md` file with 4 lines instead of a comprehensive PDF.
- **Root Cause:** Download function generated a client-side markdown blob.
- **Fix:** Implemented publication-grade ReportLab PDF generator `generate_guideline_document_pdf` with complete passages and rules, added backend endpoint `GET /guidelines/{id}/download?format=pdf`, and wired frontend "Download PDF" buttons.

### Bug 5: CSV Export Failing with 401 Unauthorized
- **Problem:** Clicking CSV export triggered 401 Unauthorized on Render.
- **Root Cause:** `HTTPBearer(auto_error=True)` intercepted unauthenticated URL clicks.
- **Fix:** Supported optional token query parameter and dual client/server streaming.
