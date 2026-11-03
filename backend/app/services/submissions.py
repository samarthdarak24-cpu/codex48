"""Submission + review service: creation, versioning, commenting, decisions.

All mutations record to the audit log and run the deterministic rule engine.
Serialization to camelCase frontend shapes lives in submission_to_dict below.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from typing import Any, Optional

from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import Session, object_session

from .. import models
from ..ids import new_id
from ..rule_engine import run_rules
from ..services.audit import record
from ..services.scoring import FORMULA_VERSION, compute_breakdown


@dataclass
class _AssetObj:
    """Plain namespace exposing the attributes rule_engine expects.

    The A1 VisualGuard fields are optional: when they are None the related
    rules return 'unknown' (Needs review) instead of guessing.
    """

    background_colour: Optional[str] = None
    clear_space_ratio: Optional[float] = None
    typeface: Optional[str] = None
    aspect_ratio: Optional[str] = None
    unreadable: bool = False
    # A1 measured facts
    logo_confidence: Optional[float] = None
    logo_confident: bool = False
    logo_count: int = 0
    contrast_ratio: Optional[float] = None
    aspect_value: Optional[float] = None


def _iso(dt: Any) -> Optional[str]:
    return dt.isoformat() if dt else None


def _asset_from_dict(asset: Optional[dict]) -> Optional[_AssetObj]:
    """Adapt a request's asset facts. `None` means "no asset was submitted".

    The distinction matters to the rule engine: no asset at all makes the
    visual rules *not applicable*, whereas an asset whose facts could not be
    measured is *unknown* and must surface as Needs review.
    """
    if not asset:
        return None
    return _AssetObj(
        background_colour=asset.get("backgroundColour"),
        clear_space_ratio=asset.get("clearSpaceRatio"),
        typeface=asset.get("typeface"),
        aspect_ratio=asset.get("aspectRatio"),
        unreadable=bool(asset.get("unreadable", False)),
    )


def _asset_from_submission(s: models.Submission) -> Optional[_AssetObj]:
    """The stored facts for a submission, or `None` if it never carried an asset."""
    if not (s.asset_id or s.asset_url or s.asset_name):
        return None
    return _AssetObj(
        background_colour=s.asset_background_colour,
        clear_space_ratio=s.asset_clear_space_ratio,
        typeface=s.asset_typeface,
        aspect_ratio=s.asset_aspect_ratio,
        unreadable=s.asset_unreadable,
    )


def _thumb_dict(s: models.Submission) -> dict:
    return {"kind": s.thumb_kind, "palette": s.thumb_palette, "glyph": s.thumb_glyph}


def _active_exception(
    db: Session, rule_code: str, brand: str, content_id: str, workspace: Optional[str] = None
) -> bool:
    """True when an approved, unexpired, in-scope exception covers this rule.

    The rule engine consults this on every evaluation so an exception is never
    an unrestricted "ignore rule" toggle: workspace, scope and expiry are
    enforced here.
    """
    now = datetime.now(timezone.utc)
    query = db.query(models.ExceptionRequest).filter(
        models.ExceptionRequest.status == "Approved",
        models.ExceptionRequest.rule_code == rule_code,
    )
    # Never let another workspace's exception suppress this workspace's finding.
    if workspace:
        query = query.filter(
            (models.ExceptionRequest.workspace == workspace)
            | (models.ExceptionRequest.workspace.is_(None))
        )
    rows = query.all()
    for e in rows:
        if e.status != "Approved":
            continue
        if e.expires_at is not None:
            exp = e.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < now:
                continue
        if e.effective_from is not None:
            eff = e.effective_from
            if eff.tzinfo is None:
                eff = eff.replace(tzinfo=timezone.utc)
            if eff > now:
                continue
        scope = (e.scope or "").strip().lower()
        in_scope = (
            scope in ("", "all", "all brands", "workspace")
            or brand.lower() in scope
            or (content_id and e.content_id == content_id)
        )
        if in_scope:
            return True
    return False


def _build_asset_out(s: models.Submission) -> Optional[dict]:
    vals: dict = {}
    if s.asset_background_colour is not None:
        vals["backgroundColour"] = s.asset_background_colour
    if s.asset_clear_space_ratio is not None:
        vals["clearSpaceRatio"] = s.asset_clear_space_ratio
    if s.asset_typeface is not None:
        vals["typeface"] = s.asset_typeface
    if s.asset_aspect_ratio is not None:
        vals["aspectRatio"] = s.asset_aspect_ratio
    if s.asset_unreadable:
        vals["unreadable"] = s.asset_unreadable
    return vals or None


def _normalized_region(region: Any) -> Optional[dict]:
    """Return a finding region as `{x, y, w, h}` or None.

    Regions arrive in two shapes (object from the pipeline, corner array from
    older seed data). The poster canvas needs one shape, and `Math.max(NaN, 1)`
    is still NaN, which made React reject the SVG `width` attribute.
    """
    from .visual.pipeline import _normalize_box

    return _normalize_box(region)


def _findings_hash(db: Session, submission_id: str) -> str:
    """Stable fingerprint of the findings a version was reviewed against."""
    rows = (
        db.query(models.Finding)
        .filter(models.Finding.submission_id == submission_id)
        .order_by(models.Finding.rule_code)
        .all()
    )
    parts = [f"{r.rule_code}:{r.severity}:{r.outcome}" for r in rows]
    return sha256("|".join(parts).encode("utf-8")).hexdigest()


def _active_rule_version_ids(db: Session, workspace: str) -> list[str]:
    rows = (
        db.query(models.Rule)
        .filter(models.Rule.status == "active")
        .filter((models.Rule.workspace == workspace) | (models.Rule.workspace.is_(None)))
        .all()
    )
    # `current_version_id` may be unset on legacy rows; the rule id still
    # identifies which rulebook was in force, which is what the snapshot needs.
    return [r.current_version_id or r.id for r in rows]


def snapshot_version(
    db: Session,
    sub: models.Submission,
    *,
    copy: str,
    status: str,
    author_id: str,
    note: str = "",
    asset_ids: Optional[list[str]] = None,
    freeze: bool = False,
) -> models.SubmissionVersion:
    """Append an immutable snapshot to `submission_versions`.

    This table is the audit-grade record the spec requires: what the copy was,
    which rulebook reviewed it, and a hash proving neither changed afterwards.
    `content_versions` stays in place for backward compatibility, but it has no
    review context, so it cannot answer "what exactly was approved?".
    """
    ws = sub.workspace or "PureGlow"
    next_number = (
        db.query(models.SubmissionVersion)
        .filter(models.SubmissionVersion.submission_id == sub.id)
        .count()
    ) + 1

    # A new version supersedes the one it replaces — but approved/rejected rows
    # keep their outcome, because that is history, not state.
    db.query(models.SubmissionVersion).filter(
        models.SubmissionVersion.submission_id == sub.id,
        models.SubmissionVersion.status.in_(("draft", "submitted")),
    ).update({models.SubmissionVersion.status: "superseded"}, synchronize_session=False)

    ids = list(asset_ids or ([sub.asset_id] if sub.asset_id else []))
    snapshot = models.SubmissionVersion(
        id=new_id("sv"),
        submission_id=sub.id,
        version_number=next_number,
        copy=copy or "",
        metadata_json={
            "title": sub.title,
            "channel": sub.channel,
            "brand": sub.brand,
            "type": sub.type,
            "note": note or "",
        },
        asset_ids=ids,
        status=status,
        frozen_at=datetime.now(timezone.utc) if freeze else None,
        content_hash=sha256(
            ((copy or "") + "|" + "|".join(sorted(ids))).encode("utf-8")
        ).hexdigest(),
        review_snapshot={
            "ruleVersionIds": _active_rule_version_ids(db, ws),
            "guidelineVersionIds": [],
            "exceptionIds": [],
            "findingsHash": _findings_hash(db, sub.id),
        },
        created_by=author_id or sub.creator_id or "",
        created_at=datetime.now(timezone.utc),
    )
    db.add(snapshot)
    db.flush()
    sub.current_version_id = snapshot.id
    db.flush()
    return snapshot


def _campaign_for(s: models.Submission) -> Optional[models.Campaign]:
    """Resolve the campaign row behind `campaign_id`.

    `campaign_id` is a plain string, not an FK, so this goes through the session
    instead of a relationship. Returns None when the submission is unlinked —
    the caller must **not** substitute the channel and call it a campaign
    (spec observation O2).
    """
    if not s.campaign_id:
        return None
    session = object_session(s)
    if session is None:
        return None
    return session.get(models.Campaign, s.campaign_id)


def _applicable_rule_count(s: models.Submission) -> Optional[int]:
    """How many rules were in scope when this content was checked.

    Findings only record problems, so this count is what stops a clean
    submission from scoring 0. Scope matching (channel/campaign/product) is not
    applied yet — every active rule counts, which is the conservative reading:
    a rule that did not fire is treated as a pass for this content.

    The count is workspace-scoped for the same reason the rule engine is: a
    submission is never judged against another brand's rulebook, so those rules
    must not inflate the denominator either.
    """
    session = object_session(s)
    if session is None:
        return None
    ws = s.workspace or "PureGlow"
    return (
        session.query(models.Rule)
        .filter(models.Rule.status == "active")
        .filter((models.Rule.workspace == ws) | (models.Rule.workspace.is_(None)))
        .count()
    )


def store_score(db: Session, s: models.Submission) -> int:
    """Compute and persist the compliance score right after findings change.

    The score used to be filled in lazily by `submission_to_dict`, which meant a
    freshly analysed submission had `compliance_score = NULL` in the database
    until somebody happened to GET it. Anything reading the table directly —
    reports, exports, the agent tools — saw no score at all. Writing it at the
    same moment the findings are written keeps the row self-describing.

    Findings are queried back from the session rather than read off
    `s.findings`: the relationship is stale until the session flushes, so the
    collection still holds the rows that were just deleted.
    """
    db.flush()
    rows = (
        db.query(models.Finding)
        .filter(models.Finding.submission_id == s.id)
        .all()
    )
    breakdown = compute_breakdown(rows, applicable_rules=_applicable_rule_count(s))
    s.compliance_score = breakdown.score
    s.score_formula_version = FORMULA_VERSION
    s.score_computed_at = breakdown.computed_at
    db.flush()
    return s.compliance_score


def _score_for(s: models.Submission) -> tuple[int, dict]:
    """Return the stored score and its breakdown, recomputing when stale.

    The score is recomputed on read whenever it is missing or was produced by an
    older formula, so a submission whose findings changed can never keep showing
    a score that no longer matches its findings. `formula_version` is what makes
    that check possible.
    """
    breakdown = compute_breakdown(s.findings, applicable_rules=_applicable_rule_count(s))
    stale = s.compliance_score is None or s.score_formula_version != FORMULA_VERSION
    if stale:
        s.compliance_score = breakdown.score
        s.score_formula_version = FORMULA_VERSION
        s.score_computed_at = breakdown.computed_at
        session = object_session(s)
        if session is not None:
            session.flush()
    else:
        breakdown.score = s.compliance_score
    return s.compliance_score, breakdown.as_dict()


def submission_to_dict(s: models.Submission) -> dict:
    """Serialize a Submission to the exact camelCase frontend shape (CONTRACT.md)."""
    versions = [
        {
            "id": v.id,
            "version": v.version,
            "text": v.text,
            "createdAt": _iso(v.created_at),
            "authorId": v.author_id,
            "note": v.note,
        }
        for v in s.versions
    ]
    findings = [
        {
            "id": f.id,
            "ruleCode": f.rule_code,
            "ruleTitle": f.rule_title,
            "type": f.type,
            "severity": f.severity,
            "explanation": f.explanation,
            "sourceDocId": f.source_doc_id,
            "sourceDocName": f.source_doc_name,
            "sourceVersion": f.source_version,
            "sourcePage": f.source_page,
            "sourcePassage": f.source_passage,
            "evidenceVerified": f.evidence_verified,
            "suggestedFix": f.suggested_fix,
            "region": _normalized_region(getattr(f, "region", None)),
            "outcome": getattr(f, "outcome", "violation"),
            "status": f.status,
        }
        for f in s.findings
    ]
    comments = [
        {
            "id": c.id,
            "authorId": c.author_id,
            "body": c.body,
            "createdAt": _iso(c.created_at),
        }
        for c in s.comments
    ]
    decisions = [
        {
            "id": d.id,
            "action": d.action,
            "version": d.version,
            "reviewerId": d.reviewer_id,
            "note": d.note,
            "createdAt": _iso(d.created_at),
        }
        for d in s.decisions
    ]
    score_value, score_breakdown = _score_for(s)
    campaign_row = _campaign_for(s)
    snapshots = [
        {
            "id": v.id,
            "versionNumber": v.version_number,
            "copy": v.copy,
            "status": v.status,
            "contentHash": v.content_hash,
            "frozenAt": _iso(v.frozen_at),
            "createdAt": _iso(v.created_at),
            "createdBy": v.created_by,
            "assetIds": list(v.asset_ids or []),
            "reviewSnapshot": v.review_snapshot or {},
        }
        for v in sorted(
            getattr(s, "detailed_versions", []) or [],
            key=lambda v: v.version_number,
        )
    ]

    return {
        "id": s.id,
        "code": s.code,
        "title": s.title,
        "excerpt": s.excerpt,
        "type": s.type,
        "channel": s.channel,
        "campaignId": s.campaign_id,
        "campaign": campaign_row.name if campaign_row else None,
        "brand": s.brand,
        "status": s.status,
        "complianceScore": score_value,
        "scoreBreakdown": score_breakdown,
        "createdAt": _iso(s.created_at),
        "updatedAt": _iso(s.updated_at),
        "creatorId": s.creator_id,
        "version": s.version,
        "issueCount": s.issue_count,
        "priority": s.priority,
        "thumb": _thumb_dict(s),
        "assetId": s.asset_id,
        "assetName": s.asset_name,
        "assetUrl": s.asset_url,
        "asset": _build_asset_out(s),
        "assetRef": (
            {
                "id": s.asset_id,
                "name": s.asset_name,
                "url": s.asset_url,
                "source": s.asset_source,
                "attribution": s.asset_attribution,
            }
            if s.asset_id
            else None
        ),
        "versions": versions,
        "currentVersionId": s.current_version_id,
        "versionSnapshots": snapshots,
        "findings": findings,
        "comments": comments,
        "decisions": decisions,
    }


def _verify_evidence(db: Session, rule_code: str, source_passage: str, source_doc_id: Optional[str]) -> bool:
    """Verify that a cited quote/source passage exists in the stored database records for this rule/guideline."""
    if not source_passage or not source_passage.strip():
        return False
    norm_cite = " ".join(source_passage.strip().lower().split())

    # 1. Check passages in GuidelinePassage
    if source_doc_id:
        passages = db.query(models.GuidelinePassage).filter(models.GuidelinePassage.doc_id == source_doc_id).all()
        for p in passages:
            norm_p = " ".join(p.passage_text.lower().split())
            if norm_cite in norm_p or norm_p in norm_cite:
                return True
            sentences = [s.strip() for s in norm_cite.split(".") if len(s.strip()) > 20]
            if sentences and any(s in norm_p for s in sentences):
                return True

    # 2. Check canonical rule.source_passage
    rule = db.query(models.Rule).filter(models.Rule.code == rule_code).first()
    if rule and rule.source_passage:
        norm_rp = " ".join(rule.source_passage.lower().split())
        if norm_cite in norm_rp or norm_rp in norm_cite:
            return True
        sentences = [s.strip() for s in norm_cite.split(".") if len(s.strip()) > 20]
        if sentences and any(s in norm_rp for s in sentences):
            return True

    return False


def _apply_findings(
    db: Session, sub_id: str, findings: list, brand: str, workspace: Optional[str] = None
) -> list:
    """Persist engine findings for a submission.

    A finding covered by an approved, unexpired, in-scope exception is stored
    as `accepted_exception` (traceable) and excluded from the open-issue count.
    Every finding's evidence is verified against stored passage data.
    Returns the list of open findings.
    """
    open_findings: list = []
    for f in findings:
        accepted = _active_exception(db, f.rule_code, brand, sub_id, workspace)
        verified = _verify_evidence(db, f.rule_code, f.source_passage, f.source_doc_id)
        db.add(
            models.Finding(
                id=new_id("f"),
                submission_id=sub_id,
                rule_code=f.rule_code,
                rule_title=f.rule_title,
                type=f.type,
                severity=f.severity,
                explanation=f.explanation,
                source_doc_id=f.source_doc_id,
                source_doc_name="",
                source_version=f.source_version,
                source_page=f.source_page,
                source_passage=f.source_passage,
                evidence_verified=bool(verified),
                suggested_fix=f.suggested_fix,
                outcome=getattr(f, "outcome", "violation"),
                status="accepted_exception" if accepted else "open",
            )
        )
        if not accepted:
            open_findings.append(f)
    return open_findings


def _augment_with_ai(db: Session, findings: list, text: str, active_rules: list, asset_obj) -> list:
    """Optionally add AI semantic findings and minimal-edit suggestions.

    Fully guarded: when no LLM is configured this is a no-op, and the
    deterministic findings remain authoritative. AI findings must map to an
    existing rule code, and their evidence is taken from that rule's stored
    passage (never from the model).
    """
    try:
        from .. import ai

        if not ai.ai_available():
            return findings

        from ..rule_engine import EngineFinding

        by_code = {r.code: r for r in active_rules}
        existing = {f.rule_code for f in findings}
        suggestions = ai.semantic_findings(
            text,
            [{"code": r.code, "title": r.title, "summary": r.summary} for r in active_rules],
        ) or []
        for item in suggestions[:4]:
            code = item.get("ruleCode")
            rule = by_code.get(code)
            if not rule or code in existing:
                continue
            findings.append(
                EngineFinding(
                    rule_code=code,
                    severity=item.get("severity", "Medium"),
                    type="Claims",
                    explanation=item.get("explanation", ""),
                    suggested_fix=None,
                    rule_title=rule.title,
                    source_doc_id=rule.source_doc_id or "",
                    source_version=rule.source_version or "",
                    source_page=rule.source_page or 0,
                    source_passage=rule.source_passage or "",
                    evidence_verified=bool(rule.source_passage),
                )
            )
            existing.add(code)

        # Minimal-edit suggestions for findings that lack one (bounded).
        for f in findings[:3]:
            if f.suggested_fix is None:
                fix = ai.minimal_edit_suggestion(f.rule_title or f.rule_code, f.explanation, text)
                if fix:
                    f.suggested_fix = fix
    except Exception:
        # AI is an assistant; never break the deterministic review path.
        pass
    return findings


def _derive_priority(findings: list) -> str:
    has_high = any(f.severity == "High" for f in findings)
    if has_high:
        return "High"
    if not findings:
        return "Low"
    return "Medium"


def create_submission(
    db: Session,
    *,
    title: str,
    excerpt: str,
    type: str,
    channel: str,
    brand: str,
    text: str,
    asset: Optional[dict],
    thumb: Optional[dict],
    creator_id: str,
    asset_id: Optional[str] = None,
    workspace: Optional[str] = "PureGlow",
    campaign: Optional[str] = None,
    status: str = "Pending",
) -> models.Submission:
    thumb = thumb or {"kind": "art", "palette": "lime", "glyph": "leaf"}
    # A draft is a real record the creator can keep working on; only a Pending
    # submission enters the manager's review queue. Anything else is coerced to
    # Pending so a client cannot open with an arbitrary status such as Approved.
    status = status if status in ("Draft", "Pending") else "Pending"
    # Never store a blank preview when the body has text: tables and cards show
    # the excerpt, and an empty one makes two submissions look identical.
    if not (excerpt or "").strip() and (text or "").strip():
        flat = " ".join(text.split())
        excerpt = flat if len(flat) <= 160 else flat[:159].rstrip() + "…"
    asset_obj = _asset_from_dict(asset)
    # Column writes need a concrete object even when no asset was submitted;
    # the engine gets `asset_obj` (possibly None) so it can tell the two apart.
    facts = asset_obj or _AssetObj()

    # Snapshot the attached brand/product image so the reference survives edits.
    attached = db.get(models.BrandAsset, asset_id) if asset_id else None
    if attached is not None:
        asset_name = attached.name
        asset_url = attached.url or f"/assets/{attached.id}/file"
        asset_source = attached.source
        asset_attribution = attached.notes
    else:
        asset_name = asset_url = asset_source = asset_attribution = None

    code = f"SUB-{1000 + db.query(models.Submission).count() + 1}"
    sub_id = new_id("sub")

    # Link the submission to a campaigns row. The New Content form collects a
    # free-text campaign name and there is no campaign-creation screen, so the
    # row is created on first use instead of leaving campaign_id NULL and
    # showing "No campaign assigned" for content the creator clearly named.
    campaign_id = None
    campaign_name = (campaign or "").strip()
    if campaign_name:
        campaign_row = (
            db.query(models.Campaign)
            .filter(models.Campaign.workspace_id == (workspace or "PureGlow"))
            .filter(models.Campaign.name == campaign_name)
            .first()
        )
        if campaign_row is None:
            campaign_row = models.Campaign(
                workspace_id=workspace or "PureGlow",
                name=campaign_name,
                channel=channel or "Instagram",
            )
            db.add(campaign_row)
            db.flush()
        campaign_id = campaign_row.id

    sub = models.Submission(
        id=sub_id,
        workspace=workspace or "PureGlow",
        code=code,
        title=title,
        excerpt=excerpt,
        type=type,
        channel=channel,
        brand=brand,
        status=status,
        creator_id=creator_id,
        campaign_id=campaign_id,
        version=1,
        priority="Medium",
        thumb_kind=thumb.get("kind", "art"),
        thumb_palette=thumb.get("palette", "lime"),
        thumb_glyph=thumb.get("glyph", "leaf"),
        asset_background_colour=facts.background_colour,
        asset_clear_space_ratio=facts.clear_space_ratio,
        asset_typeface=facts.typeface,
        asset_aspect_ratio=facts.aspect_ratio,
        asset_unreadable=facts.unreadable,
        asset_id=asset_id if attached is not None else None,
        asset_name=asset_name,
        asset_url=asset_url,
        asset_source=asset_source,
        asset_attribution=asset_attribution,
    )

    db.add(sub)
    db.add(
        models.ContentVersion(
            id=new_id("cv"),
            submission_id=sub_id,
            version=1,
            text=text,
            author_id=creator_id,
            note="Initial submission",
        )
    )

    ws = workspace or "PureGlow"
    # Workspace isolation: evaluate against this workspace's active rules only.
    active_rules = (
        db.query(models.Rule)
        .filter(models.Rule.status == "active")
        .filter((models.Rule.workspace == ws) | (models.Rule.workspace.is_(None)))
        .all()
    )
    findings = run_rules(active_rules, text, channel, asset_obj)
    findings = _augment_with_ai(db, findings, text, active_rules, asset_obj)
    open_findings = _apply_findings(db, sub_id, findings, brand, ws)
    sub.issue_count = len(open_findings)
    sub.priority = _derive_priority(open_findings)
    sub.updated_at = datetime.now(timezone.utc)
    store_score(db, sub)
    snapshot_version(
        db,
        sub,
        copy=text,
        status="draft" if status == "Draft" else "submitted",
        author_id=creator_id,
        note="Draft created" if status == "Draft" else "Initial submission",
        asset_ids=[asset_id] if attached is not None else [],
    )

    # Only a submitted record notifies managers. A draft is silent so the
    # creator can keep working without spamming the review queue.
    if status == "Pending":
        _notify_managers(db, sub, 1, initial=True)

    record(
        db,
        action="Revised",
        entity_title=title,
        entity_meta=brand,
        brand=brand,
        user_id=creator_id,
        details="Created submission.",
        entity_kind="submission",
        entity_id=sub_id,
        version=1,
        thumb=thumb,
        workspace=workspace or "PureGlow",
    )

    db.commit()
    db.refresh(sub)
    return sub


def add_version(
    db: Session, sub_id: str, text: str, note: str, author_id: str
) -> Optional[models.Submission]:
    sub = db.get(models.Submission, sub_id)
    if not sub:
        return None

    next_version = (max((v.version for v in sub.versions), default=0)) + 1
    db.add(
        models.ContentVersion(
            id=new_id("cv"),
            submission_id=sub_id,
            version=next_version,
            text=text,
            author_id=author_id,
            note=note or "",
        )
    )

    asset_obj = _asset_from_submission(sub)
    ws = sub.workspace or "PureGlow"
    active_rules = (
        db.query(models.Rule)
        .filter(models.Rule.status == "active")
        .filter((models.Rule.workspace == ws) | (models.Rule.workspace.is_(None)))
        .all()
    )
    findings = run_rules(active_rules, text, sub.channel, asset_obj)
    findings = _augment_with_ai(db, findings, text, active_rules, asset_obj)

    # Editing an unsent draft is not a resubmission: it must stay private to the
    # creator and must not notify managers. Any other status means the creator
    # is revising reviewed content, which does re-enter the queue.
    was_draft = sub.status == "Draft"

    # Recompute findings for the new text: drop old, recreate.
    for old in list(sub.findings):
        db.delete(old)
    db.flush()
    open_findings = _apply_findings(db, sub_id, findings, sub.brand, ws)
    sub.issue_count = len(open_findings)
    sub.version = next_version
    sub.status = "Draft" if was_draft else "Pending"  # Approval does not carry to a new version
    sub.updated_at = datetime.now(timezone.utc)
    store_score(db, sub)
    snapshot_version(
        db,
        sub,
        copy=text,
        status="draft" if was_draft else "submitted",
        author_id=author_id,
        note=note or "",
    )

    if not was_draft:
        _notify_managers(db, sub, next_version)

    record(
        db,
        action="Edited draft" if was_draft else "Revised",
        entity_title=sub.title,
        entity_meta=sub.brand,
        brand=sub.brand,
        user_id=author_id,
        details=f"Added version {next_version}.",
        entity_kind="submission",
        entity_id=sub_id,
        version=next_version,
        thumb=_thumb_dict(sub),
        workspace=sub.workspace or "PureGlow",
    )

    db.commit()
    db.refresh(sub)
    return sub


def submit_for_review(
    db: Session, sub_id: str, actor_id: str
) -> Optional[models.Submission]:
    """Move a DRAFT submission into the manager review queue.

    Saving a draft must not notify anyone; submitting is the explicit hand-off.
    Re-submitting an already pending item is a no-op so a double click cannot
    create duplicate notifications.
    """
    sub = db.get(models.Submission, sub_id)
    if not sub:
        return None
    if sub.status != "Draft":
        return sub

    sub.status = "Pending"
    sub.updated_at = datetime.now(timezone.utc)
    sub.priority = _derive_priority([f for f in sub.findings if getattr(f, "status", "open") == "open"])
    # The draft snapshot becomes `superseded`; the submitted copy is snapshotted
    # so the queue holds an immutable record of exactly what was handed over.
    current = (
        db.get(models.SubmissionVersion, sub.current_version_id)
        if sub.current_version_id
        else None
    )
    snapshot_version(
        db,
        sub,
        copy=current.copy if current is not None else "",
        status="submitted",
        author_id=actor_id,
        note="Submitted for review",
    )
    _notify_managers(db, sub, sub.version, initial=True)
    record(
        db,
        action="Submitted",
        entity_title=sub.title,
        entity_meta=sub.brand,
        brand=sub.brand,
        user_id=actor_id,
        details=f"Submitted v{sub.version} for review.",
        entity_kind="submission",
        entity_id=sub_id,
        version=sub.version,
        thumb=_thumb_dict(sub),
        workspace=sub.workspace or "PureGlow",
    )
    db.commit()
    db.refresh(sub)
    return sub


def add_comment(
    db: Session, sub_id: str, body: str, author_id: str
) -> Optional[models.Submission]:
    sub = db.get(models.Submission, sub_id)
    if not sub:
        return None

    db.add(
        models.Comment(
            id=new_id("c"),
            submission_id=sub_id,
            author_id=author_id,
            body=body,
        )
    )
    sub.updated_at = datetime.now(timezone.utc)

    record(
        db,
        action="Revised",
        entity_title=sub.title,
        entity_meta=sub.brand,
        brand=sub.brand,
        user_id=author_id,
        details="Added comment.",
        entity_kind="submission",
        entity_id=sub_id,
        version=sub.version,
        thumb=_thumb_dict(sub),
        workspace=sub.workspace or "PureGlow",
    )

    db.commit()
    db.refresh(sub)
    return sub


_ACTION_MAP = {
    "approve": "Approved",
    "approved": "Approved",
    "decline": "Declined",
    "declined": "Declined",
    "reject": "Declined",
    "rejected": "Declined",
    "request_changes": "Changes Requested",
    "changes requested": "Changes Requested",
    "changes_requested": "Changes Requested",
}

_ACTION_STATUS = {
    "Approved": ("Approved", "Approved"),
    "Declined": ("Rejected", "Rejected"),
    "Changes Requested": ("Revised", "Revised"),
}


#: decision → (notification type, title, default body)
_DECISION_NOTIFICATION = {
    "Approved": (
        "submission_approved",
        "Your submission was approved",
        "It is now available in Approved Content.",
    ),
    "Changes Requested": (
        "changes_requested",
        "Changes were requested on your submission",
        "Open the submission to read the reviewer's note before resubmitting.",
    ),
    "Declined": (
        "submission_rejected",
        "Your submission was rejected",
        "Open the submission to read the reviewer's reason.",
    ),
}


def _notify_creator(db: Session, sub: models.Submission, action: str, note: str, reviewer_id: str) -> None:
    """Write the notification the creator needs in order to act on a decision.

    Without this the decision existed only in the manager's history: the creator
    had to reload the register to discover it, and the bell badge never moved.
    """
    if not sub.creator_id:
        return
    kind, title, default_body = _DECISION_NOTIFICATION.get(
        action, ("system", "Your submission was reviewed", "Open the submission to see the outcome.")
    )
    db.add(
        models.Notification(
            id=new_id("n"),
            workspace=sub.workspace or "PureGlow",
            workspace_id=sub.workspace_id,
            user_id=sub.creator_id,
            type=kind,
            title=title,
            body=note or default_body,
            payload={
                "submissionId": sub.id,
                "submissionTitle": sub.title,
                "version": sub.version,
                "action": action,
                "reviewerId": reviewer_id,
            },
        )
    )


def _notify_managers(
    db: Session, sub: models.Submission, version: int, initial: bool = False
) -> None:
    """Tell the workspace's managers that a new version is waiting for review.

    Without this the resubmission was silent: the queue badge moved but nobody
    was told why.
    """
    ws = sub.workspace or "PureGlow"
    managers = (
        db.query(models.User)
        .filter(models.User.role == "manager")
        .filter(models.User.workspace == ws)
        .all()
    )
    for manager in managers:
        db.add(
            models.Notification(
                id=new_id("n"),
                workspace=ws,
                workspace_id=sub.workspace_id,
                user_id=manager.id,
                type="submission_submitted" if initial else "submission_resubmitted",
                title=(
                    f"{sub.title} was submitted for review (v{version})"
                    if initial
                    else f"{sub.title} was resubmitted (v{version})"
                ),
                body="A new version is waiting in the review queue.",
                payload={
                    "submissionId": sub.id,
                    "submissionTitle": sub.title,
                    "version": version,
                    "creatorId": sub.creator_id,
                },
            )
        )


def decide(
    db: Session, sub_id: str, action: str, note: str, reviewer_id: str
) -> Optional[models.Submission]:
    sub = db.get(models.Submission, sub_id)
    if not sub:
        return None

    norm_action = _ACTION_MAP.get((action or "").lower().strip(), action)
    audit_action, audit_status = _ACTION_STATUS.get(norm_action, ("Revised", "Revised"))
    sub_status = norm_action  # Approved | Changes Requested | Declined

    db.add(
        models.ReviewDecision(
            id=new_id("rd"),
            submission_id=sub_id,
            action=norm_action,
            version=sub.version,
            reviewer_id=reviewer_id,
            note=note or "",
        )
    )
    sub.status = sub_status
    sub.updated_at = datetime.now(timezone.utc)

    # Freeze the version that was actually reviewed. `frozen_at` plus the
    # content hash is what makes "this is exactly what got approved" checkable
    # later, even after the creator edits the submission again.
    _SNAPSHOT_STATUS = {
        "Approved": "approved",
        "Declined": "rejected",
        "Changes Requested": "changes_requested",
    }
    current = None
    if sub.current_version_id:
        current = db.get(models.SubmissionVersion, sub.current_version_id)
    latest_text = max(sub.versions, key=lambda v: v.version).text if sub.versions else ""
    snapshot_version(
        db,
        sub,
        copy=current.copy if current is not None else latest_text,
        status=_SNAPSHOT_STATUS.get(norm_action, "submitted"),
        author_id=reviewer_id,
        note=note or "",
        asset_ids=list(current.asset_ids) if current is not None else None,
        freeze=True,
    )

    _notify_creator(db, sub, norm_action, note, reviewer_id)

    record(
        db,
        action=audit_action,
        entity_title=sub.title,
        entity_meta=sub.brand,
        brand=sub.brand,
        user_id=reviewer_id,
        details=note or "",
        status=audit_status,
        entity_kind="submission",
        entity_id=sub_id,
        version=sub.version,
        thumb=_thumb_dict(sub),
        workspace=sub.workspace or "PureGlow",
    )

    db.commit()
    db.refresh(sub)
    return sub
