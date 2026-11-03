# DOCUMENT UPLOAD TEST REPORT

- **Test Document:** `qa_test_assets/PureGlow_Marketing_Guidelines_QA.docx`
- **File Size:** ~37.3 KB
- **Category:** Marketing
- **Brand:** PureGlow QA
- **Upload Endpoint:** `POST /guidelines`
- **Status:** **PASS**

### Verified Capabilities:
1. File selection via native file picker: **PASS**
2. Text and passage extraction: **PASS** (Indexed sections, paragraphs, and headings)
3. Rule abstraction: **PASS** (Auto-extracted CL-03, CL-04, CL-05 with verbatim quotes)
4. Absence of unwanted reload: **PASS** (Stayed on page, modal closed cleanly, toast confirmation displayed)
5. Persistence across refresh: **PASS** (Re-fetched via `GET /guidelines` with status `active`)
