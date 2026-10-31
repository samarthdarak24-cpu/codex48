# Security

Scope: `backend/app/` and `src/`. Every statement is traceable to a file and line in this
repository. Controls that exist only in intent are marked **not implemented**.

Verification vocabulary: **code** = confirmed by reading the implementation; **test** =
asserted by a test that exists in `backend/tests/` (read, not executed, for this document);
**not implemented** = no code path provides it.

## 1. Threat model

Assets: credentials and Argon2 hashes; JWT bearer tokens; unreleased submission copy;
guideline documents and extracted passages; uploaded posters and brand assets; the audit
trail; LLM provider credentials. Actors: an unauthenticated internet client; an
authenticated `creator`; a `manager` of a *different* workspace; a malicious or compromised
LLM provider; anyone with a copy of the repo.

| Threat | Mitigation in this codebase | Status |
| --- | --- | --- |
| Credential stuffing | Argon2 verification only; no lockout, throttle or CAPTCHA (`routers/auth.py:20`); failures audited | **not mitigated** |
| Username enumeration | Identical `401 "Invalid email or password"`; reset endpoint always returns success (`auth.py:37`, `:79`). Unknown emails return before hashing, so timing still differs | partial |
| IDOR / cross-workspace read | Per-query `ws == user.ws OR ws IS NULL` filters; ownership check on submissions (`submissions.py:74`). Several file endpoints check existence but not workspace (§9) | partial |
| Malicious upload | Extension allow-list, size cap, magic bytes, Pillow header parse, UUID filename (`analysis.py:56-83`). No AV, no re-encode | partial |
| Prompt injection into the LLM | Untrusted blocks fenced with a per-call nonce stripped from the input (`services/evidence.py:702-747`); output cannot become a finding without a machine-checked citation (`:614-671`) | partial |
| Exfiltration via AI provider | Emails, phone-like strings and 9+ digit runs redacted (`evidence.py:683`); per-workspace daily cap — Evidence path only (§5) | partial |
| Path traversal (SPA fallback) | `abspath` + `startswith(_DIST_DIR)` + `isfile` (`main.py:184-187`). String prefix, not `commonpath`; must also be a file | partial |
| Token theft via XSS | Token in memory + `sessionStorage` (`src/services/api.ts:52-69`); no `dangerouslySetInnerHTML`; **no CSP**, so any injected script can read it | partial |
| Token forgery | HS256 with `SECRET_KEY`, algorithm pinned on decode (`security.py:37`). Default key is a public placeholder (§6) | **unmitigated until rotated** |
| Token replay after logout | Stateless JWT; logout writes an audit row only (`auth.py:58`) | **not mitigated** |
| Upload memory exhaustion | Body read fully into memory *before* the size check (`analysis.py:60-64`) | **not mitigated** |
| Stored XSS via SVG | `.svg` accepted for brand assets and returned verbatim by `FileResponse` (`services/assets.py:80`) | **not mitigated** |

## 2. Authentication

- **Hashing.** `CryptContext(schemes=["argon2"], deprecated="auto")`, library defaults, no
  parameter tuning (`security.py:13`); `verify_password` returns `False` for a missing hash
  and swallows verifier exceptions (`:20-26`).
- **Token.** HS256 with `sub`, `role`, `exp` (`security.py:29-32`); lifetime
  `access_token_expire_minutes`, default 720 (12 h) (`config.py:18`). No `iat`, `nbf`,
  `jti`, `iss` or `aud`, hence no revocation list. Decode pins `["HS256"]`
  (`security.py:37`), so `alg: none` and RS256 confusion do not apply.
- **Authoritative role.** `get_current_user` re-loads the user by `sub` and returns the
  *database* role; the `role` claim is issued but never read (`deps.py:22-30`). Role changes
  apply immediately; a deleted user gets 401 (`:23-29`).
- **Client storage.** Module variable mirrored to `sessionStorage` (`precedent.session`,
  `api.ts:52-69`, `AuthContext.tsx:5`): per-tab, cleared on tab close, not `localStorage`,
  readable by any script on the origin. A stored session is validated against
  `GET /auth/me` before use (`AuthContext.tsx:25-62`); any non-login 401 clears it and
  dispatches `precedent:session-expired` (`api.ts:127-130`).
- **Logout and reset.** `POST /auth/logout` records an audit event but does not revoke the
  token — the client deletes it locally (`api.ts:225-231`), so a token copied beforehand
  stays valid until `exp`. `POST /auth/request-reset` ignores its body and returns
  `{"sent": true}` (`auth.py:76-79`): no email, no token, no flow.

## 3. Authorisation / RBAC

Two roles, `creator` and `manager`, stored as free text with no enum or check constraint
(`models.py:35`). Two dependencies implement all enforcement: `get_current_user` (bearer
token required, else 401 — `deps.py:13`) and `require_manager` (403 for any non-manager,
plus a `Security Event` audit row — `deps.py:33-53`; if that audit write fails the exception
is swallowed, so a blocked attempt can go unlogged).

| Capability | Creator | Manager | Enforced by |
| --- | --- | --- | --- |
| Login, `GET /auth/me` | yes | yes | `get_current_user` |
| List/read submissions | own only | all in workspace | `submissions.py:59-77` |
| Create submission, add version, comment | own only | any | `_is_owner_or_manager` (`:44`) |
| Decide (approve/reject) a submission | no | yes | `require_manager` (`:142`) |
| Read guidelines, rules, claims, exceptions, audit | yes | yes | `get_current_user` |
| Upload guideline, change its status | no | yes | `guidelines.py:72`, `:143` |
| Create/edit/confirm/reject/deactivate rule | no | yes | `rules.py:59-273` |
| Approve a claim | no | yes | `claims.py:61`, `:95` |
| Decide or revoke an exception | no | yes | `exceptions.py:156`, `:210` |
| Create or activate a simulation | no | yes | `simulations.py:42`, `:64` |
| Upload / approve a brand asset | upload: yes | approve only | `assets.py:54`, `:97` |
| Upload a poster for analysis | yes | yes | `analysis.py:53` |
| Run an AI semantic review | yes | yes | `evidence.py:65` |
| Sync embeddings, read AI trust summary | no | yes | `evidence.py:128`, `:153` |

**Second axis — workspace.** Scoping is applied per query, not centrally, and the sentinel
`NULL` value ("legacy/shared") is read inconsistently:

| Router | Scoping rule | Code |
| --- | --- | --- |
| submissions, assets | `ws == user.ws`, plus `NULL` **only** for `PureGlow` | `submissions.py:54-58`, `assets.py:33-37` |
| guidelines, rules, claims, team | `ws == user.ws OR NULL` — `NULL` visible to everyone | `guidelines.py:26-28` |
| evidence / retrieval | `ws == user.ws OR NULL` | `evidence.py:125-132` |

## 4. Upload validation

**Posters** (`analysis.py:56-83`), in execution order:

1. Extension allow-list `{.png, .jpg, .jpeg, .webp}` → 415.
2. Whole body read into memory; empty body → 400.
3. Size cap `10 * 1024 * 1024` → 413. Module constant, not `settings.max_upload_mb`, applied
   after the read.
4. Magic bytes: PNG signature, `FF D8 FF`, or `RIFF…WEBP` → 400.
5. Pillow `Image.open(...).size` forces a header parse before any record is created, so a
   forged or truncated file leaves no orphan submission (`:68-75`). Pillow's default
   decompression-bomb guard applies; images between 1× and 2× the pixel limit only warn.
6. Written as `uuid4().hex + ext`; the client filename is kept only as `asset_name`.

**Guideline documents** (`services/documents.py:26-80`): `.pdf/.docx/.doc/.txt`, 15 MB,
`%PDF` for PDF, `PK` for DOCX. `.doc` is accepted but validated as a DOCX zip. No page-count
or archive-expansion limit. **Brand assets** (`services/assets.py:44-95`):
`.png/.jpg/.jpeg/.webp/.svg/.gif`, MIME allow-list, 10 MB, magic bytes including `GIF8` and a
literal `<svg`/`<?xml` prefix test; no Pillow parse for raster assets, and SVG is stored and
returned verbatim.

**Not done anywhere:** no antivirus or YARA scan, no image re-encoding, no EXIF or metadata
stripping, no pixel-dimension limit, no streaming size enforcement.

## 5. AI data handling

The provider is any OpenAI-compatible `/v1/chat/completions` endpoint at `LLM_BASE_URL`,
authenticated with `Authorization: Bearer $LLM_API_KEY` (`ai.py:54-67`,
`evidence.py:764-780`).

**What leaves the machine on an Evidence review** (`evidence.py:942-1017`): up to 12
sentences of submission copy clipped to 400 characters each, with emails, phone-like
sequences and 9+ digit runs replaced by `[redacted]` (count stored on the call log); the
top-k retrieved guideline passages (default 5) per sentence, clipped to 700 characters, with
`passageId`, `ruleCode` and heading. Both blocks are wrapped in
`<<<BEGIN_UNTRUSTED_…:{nonce}>>>` fences, nonce = `secrets.token_hex(8)` per call and
stripped from the untrusted text, so an upload cannot close a fence. The structural defence
is the citation check: a claim whose quote does not match stored passage text is persisted
as `rejected` and never becomes a finding. `temperature: 0`, `max_tokens: 1200`, timeout
20 s, one retry; prompt and response text are **not** stored, only token counts, latency,
status and citation counters.

**No key configured.** `ai_available()` is false, helpers return `None`, the review records
`skipped / llm_not_configured` and the deterministic rule engine is the only source of
verdicts (`ai.py:45`, `evidence.py:985-994`).

**Daily limit.** `LLM_DAILY_CALL_LIMIT`, default 500, counted per workspace from `AiCallLog`
rows since UTC midnight, excluding `skipped` rows (`evidence.py:922-935`, `:973-983`).
Check-then-act is not atomic, so concurrent requests can overshoot.

**Outside the Evidence path there is no redaction and no cap.** `ai.suggest_rules_from_text`
sends up to 6 000 characters of extracted guideline text on every guideline upload
(`guidelines.py:117`); `ai.semantic_findings` sends up to 4 000 characters of copy plus rule
titles on every submission review (`services/submissions.py:310`);
`ai.minimal_edit_suggestion` sends 1 500 (`:339`); `ai.explain_conflict` sends rule text
(`rules.py:309`). None calls `_redact` or consults the daily limit.

## 6. Secrets

- Configuration is environment-driven via `pydantic-settings` with `env_file=".env"`
  (`config.py:12-13`).
- `SECRET_KEY` defaults to `"dev-secret-change-me"` (`config.py:17`) and the same value
  ships in `backend/.env.example`. With it, anyone can mint a token for any user id,
  including a manager's. **It must be rotated before any shared deployment.** No startup
  assertion checks that it differs from the default.
- Secrets in settings: `secret_key`, `llm_api_key`, `image_source_api_key`. None is returned
  by an endpoint; `/health` reports only `configured: true/false` and the model name
  (`main.py:120-127`). `/health` itself is unauthenticated and returns the database driver,
  storage status, OCR detail and error strings truncated to 200 characters (`:75-150`) — no
  credentials, but error text can carry filesystem or driver detail.
- Repository hygiene: `.gitignore` excludes `.env` and `.env.*` while keeping `.env.example`.
  `git ls-files` shows exactly one tracked env file, `backend/.env.example`, placeholders
  only.

## 7. Rate limiting

What exists: one control — the per-workspace AI daily call limit in §5 — covering only the
Evidence review path. What does not exist: any per-IP or per-account throttle on
`POST /auth/login`; any lockout, backoff or CAPTCHA after repeated failures; any throttle on
`/analysis/upload`, `/guidelines` or `/assets` beyond the per-request size cap; any global
request-rate middleware. `429` is mapped to a `rate_limited` code in `errors.py:84`, but
nothing raises it. Credential stuffing is unthrottled. This is a deliberate trade-off, not a
hidden control, and should not be described as "rate limited".

## 8. What was actually verified

Verified by reading the implementation: algorithm pinning, DB-authoritative role lookup and
401 for a deleted user (`security.py:35-39`, `deps.py:13-30`); `require_manager` returning
403 and writing a `Security Event` row (`deps.py:33-53`); Argon2 as the only scheme with no
plaintext password stored (`security.py:13-17`); the poster pipeline running extension →
read → size → magic → Pillow → UUID filename (`analysis.py:56-83`); the SPA fallback
refusing paths outside `dist` and non-files (`main.py:184-187`); CORS using an explicit
origin list, not `*`, with credentials allowed (`main.py:58-65`, `config.py:20`); unhandled
exceptions returning a generic body with a request id and no stack trace or path
(`errors.py:164-175`); AI redaction, nonce fencing and citation verification as described
(`evidence.py:614-747`); the daily cap enforced only in `semantic_review` (`:973`).

Asserted by tests present in the repository — `tests/test_auth.py` (login returns a token;
wrong password is 401; `/auth/me` works with a token and 401 without), `tests/test_rbac.py`
(creator gets 403 on `POST /rules`; manager gets 201), and
`tests/test_workspace_isolation.py` (six tests: `/team`, `/claims`, `/guidelines` and
`/rules` exclude another workspace, a claim is written into the caller's workspace, and a
foreign-workspace exception does not suppress a finding).

Not verified — no test, no execution evidence: rejection of a bad extension, oversize body,
forged magic bytes or corrupt image; the path-traversal guard under a crafted `full_path`;
token expiry, post-logout replay, or behaviour with a rotated `SECRET_KEY`; the redactor
itself (only the aggregation of `redaction_count` is tested, `tests/test_a2_evidence.py`);
concurrency behaviour of the daily cap. The suite was not executed while preparing this
document; the assertions above are read from source.

## 9. Known gaps / before production

1. **Rotate `SECRET_KEY`** and fail startup if it still equals the default.
2. **Throttle login** per IP and per account; add lockout.
3. **Add token revocation** (`jti` denylist, or short-lived tokens plus refresh) so logout
   invalidates a token.
4. **Close IDOR gaps.** These check existence but not workspace: `GET /analysis/{id}/file`,
   `POST /analysis/{id}/rerun`, `GET /assets/{id}/file`, `POST /assets/{id}/approve`,
   `GET /guidelines/{id}/file`, `PATCH /guidelines/{id}/status` (`analysis.py:176-207`,
   `assets.py:93-131`, `guidelines.py:138-178`).
5. **Drop SVG** from the asset allow-list, or serve uploads from a separate origin with
   `Content-Disposition: attachment`.
6. **Enforce upload size before reading** the body and stream to disk instead of `read()`.
7. **Route every LLM call through redaction and the daily cap**, not just Evidence review.
8. **Add security headers** — CSP, `X-Content-Type-Options`, HSTS under TLS. None are set.
9. **Add an AV scan or re-encode step** for images and documents; strip EXIF.
10. **Authenticate `/health`** or reduce it to a liveness probe.
11. **Implement password reset**, or remove the endpoint that pretends to.
12. **Centralise workspace scoping.** The `NULL`-is-global convention is applied differently
    per router — the most likely source of the next isolation bug.
