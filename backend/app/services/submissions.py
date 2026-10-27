"""Submission + review service: creation, versioning, commenting, decisions.

All mutations record to the audit log and run the deterministic rule engine.
Serialization to camelCase frontend shapes lives in submission_to_dict below.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from .. import models
from ..ids import new_id
from ..rule_engine import run_rules
from ..services.audit import record


@dataclass
class _AssetObj:
    """Plain namespace exposing the attributes rule_engine expects."""

    background_colour: Optional[str] = None
    clear_space_ratio: Optional[float] = None
    typeface: Optional[str] = None
    aspect_ratio: Optional[str] = None
    unreadable: bool = False


def _iso(dt: Any) -> Optional[str]:
    return dt.isoformat() if dt else None


def _asset_from_dict(asset: Optional[dict]) -> _AssetObj:
    if not asset:
        return _AssetObj()
    return _AssetObj(
        background_colour=asset.get("backgroundColour"),
        clear_space_ratio=asset.get("clearSpaceRatio"),
        typeface=asset.get("typeface"),
        aspect_ratio=asset.get("aspectRatio"),
        unreadable=bool(asset.get("unreadable", False)),
    )


def _asset_from_submission(s: models.Submission) -> _AssetObj:
    return _AssetObj(
        background_colour=s.asset_background_colour,
        clear_space_ratio=s.asset_clear_space_ratio,
        typeface=s.asset_typeface,
        aspect_ratio=s.asset_aspect_ratio,
        unreadable=s.asset_unreadable,
    )


def _thumb_dict(s: models.Submission) -> dict:
    return {"kind": s.thumb_kind, "palette": s.thumb_palette, "glyph": s.thumb_glyph}


def _active_exception(db: Session, rule_code: str, brand: str, content_id: str) -> bool:
    """True when an approved, unexpired, in-scope exception covers this rule.

    The rule engine consults this on every evaluation so an exception is never
    an unrestricted "ignore rule" toggle: scope and expiry are enforced here.
    """
    now = datetime.now(timezone.utc)
    rows = (
        db.query(models.ExceptionRequest)
        .filter(
            models.ExceptionRequest.status == "Approved",
            models.ExceptionRequest.rule_code == rule_code,
        )
        .all()
    )
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
    return {
        "id": s.id,
        "code": s.code,
        "title": s.title,
        "excerpt": s.excerpt,
        "type": s.type,
        "channel": s.channel,
        "brand": s.brand,
        "status": s.status,
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


def _apply_findings(db: Session, sub_id: str, findings: list, brand: str) -> list:
    """Persist engine findings for a submission.

    A finding covered by an approved, unexpired, in-scope exception is stored
    as `accepted_exception` (traceable) and excluded from the open-issue count.
    Every finding's evidence is verified against stored passage data.
    Returns the list of open findings.
    """
    open_findings: list = []
    for f in findings:
        accepted = _active_exception(db, f.rule_code, brand, sub_id)
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
) -> models.Submission:
    thumb = thumb or {"kind": "art", "palette": "lime", "glyph": "leaf"}
    asset_obj = _asset_from_dict(asset)

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

    sub = models.Submission(
        id=sub_id,
        workspace=workspace or "PureGlow",
        code=code,
        title=title,
        excerpt=excerpt,
        type=type,
        channel=channel,
        brand=brand,
        status="Pending",
        creator_id=creator_id,
        version=1,
        priority="Medium",
        thumb_kind=thumb.get("kind", "art"),
        thumb_palette=thumb.get("palette", "lime"),
        thumb_glyph=thumb.get("glyph", "leaf"),
        asset_background_colour=asset_obj.background_colour,
        asset_clear_space_ratio=asset_obj.clear_space_ratio,
        asset_typeface=asset_obj.typeface,
        asset_aspect_ratio=asset_obj.aspect_ratio,
        asset_unreadable=asset_obj.unreadable,
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

    active_rules = db.query(models.Rule).filter_by(status="active").all()
    findings = run_rules(active_rules, text, channel, asset_obj)
    findings = _augment_with_ai(db, findings, text, active_rules, asset_obj)
    open_findings = _apply_findings(db, sub_id, findings, brand)
    sub.issue_count = len(open_findings)
    sub.priority = _derive_priority(open_findings)
    sub.updated_at = datetime.now(timezone.utc)

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
    active_rules = db.query(models.Rule).filter_by(status="active").all()
    findings = run_rules(active_rules, text, sub.channel, asset_obj)
    findings = _augment_with_ai(db, findings, text, active_rules, asset_obj)

    # Recompute findings for the new text: drop old, recreate.
    for old in list(sub.findings):
        db.delete(old)
    db.flush()
    open_findings = _apply_findings(db, sub_id, findings, sub.brand)
    sub.issue_count = len(open_findings)
    sub.version = next_version
    sub.status = "Pending"  # Approval does not carry to a new version
    sub.updated_at = datetime.now(timezone.utc)

    record(
        db,
        action="Revised",
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
