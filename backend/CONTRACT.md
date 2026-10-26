# Precedent — Backend API Contract (single source of truth)

All routers are mounted on the FastAPI app at root paths (no `/api` prefix).
CORS allows the Vite dev origin (`http://127.0.0.1:5173`). Auth: `Authorization: Bearer <jwt>`.

## Global conventions
- **Request bodies**: snake_case JSON.
- **Responses**: camelCase JSON, matching `src/lib/types.ts` exactly (field names + nested shapes).
- **Auth**: every protected route uses `Depends(get_current_user)` from `app/deps.py`.
  Manager-only routes additionally use `Depends(require_manager)`.
- **RBAC**: creators see only their own submissions and only `visible_to_creators` guidelines;
  they may submit content, comment, and request exceptions. Managers may decide, manage
  guidelines/rules/claims/exceptions/simulations, and approve assets.
- **Audit**: every mutation calls `app.services.audit.record(db, ...)`.
- **Determinism**: never fabricate. AI helpers in `app/ai.py` return `None` when unconfigured;
  fall back to deterministic behaviour. Citations always come from a stored `sourcePassage`.
- **Do NOT modify** `app/config.py`, `db.py`, `models.py`, `schemas.py`, `security.py`,
  `deps.py`, `rule_engine.py`, `ai.py`, `ids.py`, `services/audit.py`. Only create your own
  `app/routers/<domain>.py` and `app/services/<domain>.py` (and any small helper in your module).

## Endpoints

### Auth  (app/routers/auth.py)
- `POST /auth/login`  body `{email, password}` -> `{token, user}` (UserOut camelCase)
- `POST /auth/request-reset` body `{email}` -> `{sent: bool}`
- `GET  /auth/me` -> UserOut  (auth)

### Team  (app/routers/team.py)
- `GET /team` -> `UserOut[]`  (auth)

### Submissions + Review  (app/routers/submissions.py, app/services/submissions.py)
- `GET  /submissions` -> `Submission[]` (creator sees own only; manager sees all)
- `GET  /submissions/{id}` -> `Submission` (creator: own only)
- `POST /submissions`  body:
  `{title, excerpt, type, channel, brand, text, asset?:{backgroundColour?,clearSpaceRatio?,typeface?,aspectRatio?,unreadable?}, thumb?:{kind,palette,glyph}}`
  -> `Submission`. On create: make a `ContentVersion` v1 with `text`, run
  `app.rule_engine.run_rules(active_rules, text, channel, asset_obj)` to build `Finding`s,
  set `issue_count`, derive `priority` (High if any High-severity finding else Medium/Low),
  status `Pending`. Record audit `Revised`/`Login`? Use action `Revised` with entityKind `submission`.
- `POST /submissions/{id}/versions` body `{text, note}` -> `Submission`. Adds `ContentVersion`,
  re-runs rules, updates `findings`, `version`, `issue_count`, `updated_at`. Owner or manager.
- `POST /submissions/{id}/comments` body `{body}` -> `Submission`. Adds `Comment`. Auth.
- `POST /submissions/{id}/decide` body `{action:"Approved"|"Changes Requested"|"Declined", note}` -> `Submission`.
  **Manager only.** Sets status, adds `ReviewDecision` (with current `version`), records audit
  `Approved`/`Rejected`/`Exception`? Use `Approved`(action Approved), `Rejected`(Declined), `Revised`(Changes Requested).

`Submission` response shape (camelCase) must include:
`id, code, title, excerpt, type, channel, brand, status, createdAt, updatedAt, creatorId,
version, issueCount, priority, thumb:{kind,palette,glyph}, asset?{...},
versions:[{id,version,text,createdAt,authorId,note}],
findings:[{id,ruleCode,ruleTitle,type,severity,explanation,sourceDocId,sourceDocName,
sourceVersion,sourcePage,sourcePassage,evidenceVerified,suggestedFix:{original,proposed,rationale}|null,status}],
comments:[{id,authorId,body,createdAt}],
decisions:[{id,action,version,reviewerId,note,createdAt}]`

Datetimes serialized as ISO strings.

### Guidelines + Documents  (app/routers/guidelines.py, app/services/documents.py)
- `GET  /guidelines` -> `GuidelineDoc[]` (creators: `visible_to_creators=true` only)
- `POST /guidelines`  multipart form: `file` (PDF/DOCX), `name`, `description`, `category`, `brand`,
  `visible_to_creators` (bool, default true). **Manager only.** Save file to `settings.uploads_dir`,
  extract text: PDF via `fitz` (PyMuPDF) — `doc.page_count` for pages, join page texts; DOCX via
  `python-docx` — join paragraph texts. Approximate `extracted_passages` as `max(1, len(text)//1200)`.
  Status `processing` then `active`. Optionally call `app.ai.suggest_rules_from_text(text)`; include
  `suggestedRules` (list, possibly empty) in the response. `file_size` as human string.
  Return `GuidelineDoc` (camelCase: id,name,description,category,version,status,updatedAt,fileType,
  fileSize,pages,ownerId,extractedPassages,visibleToCreators).
- `PATCH /guidelines/{id}/status` body `{status}` -> `GuidelineDoc`. Manager only.
- `GET /guidelines/{id}/file` -> `FileResponse`. Auth.

### Rules + Conflicts  (app/routers/rules.py, app/services/rules.py)
- `GET  /rules` -> `Rule[]` (camelCase: id,code,title,summary,subject,condition,action,scope,
  priority,status,sourceDocId,sourceVersion,sourcePassage,sourcePage,effectiveFrom,effectiveTo,
  overridesThisQuarter)
- `POST /rules` body `{code,title,summary,subject,condition,action,scope,priority,sourceDocId,
  sourceVersion,sourcePassage,sourcePage,effectiveFrom?,effectiveTo?}` -> `Rule` with
  `status:"needs_confirmation"`. Manager only.
- `POST /rules/{id}/confirm` -> `Rule` with `status:"active"`. Manager only.
- `GET /rules/conflicts` -> `[{ruleA:Rule, ruleB:Rule, reason:string}]`. Auth.
  Implement deterministic conflict detection: two `active` rules conflict when they share the same
  `subject` AND `scope` but their `condition` text is contradictory (e.g. one requires a thing the
  other forbids), OR when one rule's `code` would override another's effect on the same attribute.
  Keep it simple and explainable; return the reason string.

### Claims  (app/routers/claims.py)
- `GET  /claims` -> `ApprovedClaim[]` (camelCase: id,text,product,source,scope,status,approvedAt,approvedBy)
- `POST /claims` body `{text,product,source,scope,status?}` -> `ApprovedClaim`. Manager only.

### Exceptions  (app/routers/exceptions.py, app/services/exceptions.py)
- `GET  /exceptions` -> `ExceptionRequest[]` (camelCase: id,code,contentId,contentTitle,contentMeta,
  thumb:{kind,palette,glyph},brand,ruleCode,ruleTitle,reason,scope,requestedById,decidedById,
  effectiveFrom,expiresAt,status,conditions,decidedAt)
- `POST /exceptions` body `{contentId,contentTitle,contentMeta,brand,ruleCode,ruleTitle,reason,scope,
  effectiveFrom,expiresAt,thumb:{kind,palette,glyph},conditions}` -> `ExceptionRequest`. Auth.
- `POST /exceptions/{id}/decide` body `{decision:"Approved"|"Rejected", conditions}` -> `ExceptionRequest`.
  **Manager only.** If `decision=="Approved"`: reject (409/400) when `expiresAt` is in the past OR
  `status=="Expired"` (expired exceptions cannot be approved). Else set `status`, `decidedById`,
  `decidedAt`, `conditions`; record audit `Exception`. Reject sets `Rejected`.

### Simulations  (app/routers/simulations.py, app/services/simulation.py)
- `GET  /simulations` -> `Simulation[]`
- `POST /simulations` body `{name, ruleId, changeType, currentValue, newValue}` -> `Simulation`.
  Manager only. Port `DataContext.runSimulation` logic:
  - Load the target `Rule` and ALL active rules + ALL submissions (with asset facts).
  - Build a *modified* rule set: apply `changeType` to the target rule:
      * `add_allowed_colour` (visual BR/IM): newValue is a hex; relaxed => previously-flagged
        background assets now pass.
      * `change_clear_space` (LO/SM): newValue is float; lowering min relaxes.
      * `change_typeface` (TY): newValue list; adding an approved typeface relaxes.
      * `change_text_condition`: textual change; re-evaluate.
  - For each submission, evaluate against the modified rule set. Compute per-item impact:
      `Compliant` (no findings), `Non-Compliant` (>=1 fail/High finding), `Needs Review`
      (only unknown/Medium-low findings or unreadable asset).
  - `totals`: {checked, compliant, needsReview, nonCompliant}.
  - `items`: [{submissionId,title,meta,thumb,type,currentStatus,impact,note}].
  - `insight`: 2–4 human-readable strings (e.g. "Relaxing BR-01 clears 3 previously flagged assets").
  - `status:"Completed"`. NEVER activate the rule. Optionally call `ai.explain_simulation`.
  Response `Simulation` camelCase: id,name,ruleId,ruleCode,changeType,currentValue,newValue,status,
  createdAt,createdById,items,insight,totals:{checked,compliant,needsReview,nonCompliant}.

### Audit  (app/routers/audit.py, app/services/audit_read.py or inline)
- `GET /audit?action=&brand=` -> `AuditEvent[]` (camelCase: id,at,action,entityTitle,entityMeta,
  thumb|null,brand,userId,details,status,entityKind,entityId,version?)
- `GET /audit/health` -> derived metrics object (port of `lib/selectors.ts`):
  `{guidelineStats:{total,active,processing,archived}, rulesByCategory:[{category,count}],
  expiringSoon:[ExceptionRequest...], mostOverridden:[{rule,count}], auditStats:{total,approved,rejected,...},
  auditBreakdown:[{action,count}]}`. Auth.

### Brand / Product Image Assets  (app/routers/assets.py, app/services/assets.py)
- `GET  /assets?brand=&status=` -> `BrandAsset[]` (camelCase: id,name,brand,category,filePath?,
  url?,source,sourceUrl?,status,width,height,notes,uploadedById,createdAt)
- `POST /assets` multipart: `file`, `name`, `brand`, `category`, `notes` -> `BrandAsset`
  (status `pending`). Auth. Save to uploads dir (secure: random filename, keep extension).
- `POST /assets/{id}/approve` -> `BrandAsset` (status `approved`). Manager only.
- `GET  /assets/{id}/file` -> `FileResponse`. Auth.
- `POST /assets/research` body `{query, brand}` -> `{configured:bool, results:[]}`. If
  `settings.image_source_api_url` is empty, return `{configured:false, results:[]}`. Otherwise
  call it with the key; on any error return configured:true, results:[] (never fabricate).

## Serialization helper
Build plain dicts with camelCase keys (do NOT rely on Pydantic response_model for nested shapes —
explicit dicts are simplest and match the frontend exactly). Return `JSONResponse` or just the dict
(FastAPI serializes datetimes to ISO). For `thumb` use `{kind, palette, glyph}`.
