"""The only executable surface an agent node may invoke.

Every function here reads or writes *existing* Precedent records through the
same SQLAlchemy session the routers use. No function evaluates model-generated
source code, shells out, issues arbitrary HTTP requests, or touches the
filesystem outside the already-validated uploads directory.

Write-capable tools are deliberately narrow: they may create a notification or
return a review draft. They may never approve/reject content, activate a rule,
grant an exception, publish content or edit an audit row.
"""
from __future__ import annotations

import re
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..ai import ai_available, llm_complete
from ..ids import new_id
from ..models import (
    AssetAnalysis,
    AuditEvent,
    ExceptionRequest,
    Finding,
    GuidelineDoc,
    GuidelinePassage,
    Notification,
    ReassessmentTask,
    ReviewDecision,
    Rule,
    Submission,
    SubmissionVersion,
    User,
)
from ..services.semantic import search_passages_hybrid
from .base import ToolContext, ToolError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _require_workspace(row: Any, ctx: ToolContext, label: str) -> Any:
    if row is None:
        raise ToolError(f"{label} not found", code="not_found")
    row_ws = getattr(row, "workspace", None)
    if row_ws not in (None, "", ctx.workspace):
        # Same 404 semantics as the router: do not confirm that the id exists.
        raise ToolError(f"{label} not found", code="not_found")
    return row


def _submission_id(ctx: ToolContext) -> str:
    value = (
        ctx.input.get("submission_id")
        or ctx.input.get("submissionId")
        or ctx.input.get("content_id")
        or ctx.input.get("contentId")
    )
    if not value:
        raise ToolError("This tool requires a submission_id.", code="missing_input")
    return str(value)


def _latest_version(db: Session, submission_id: str) -> SubmissionVersion | None:
    return (
        db.query(SubmissionVersion)
        .filter(SubmissionVersion.submission_id == submission_id)
        .order_by(desc(SubmissionVersion.version_number))
        .first()
    )


def _load_submission(db: Session, ctx: ToolContext, submission_id: str) -> Submission:
    sub = db.get(Submission, submission_id)
    return _require_workspace(sub, ctx, "Submission")


def _finding_dict(f: Finding) -> dict:
    return {
        "id": f.id,
        "ruleCode": f.rule_code,
        "ruleTitle": f.rule_title,
        "severity": f.severity,
        "outcome": f.outcome,
        "type": f.type,
        "explanation": f.explanation,
        "evidenceVerified": bool(f.evidence_verified),
        "sourceDocName": f.source_doc_name,
        "sourceVersion": f.source_version,
        "sourcePage": f.source_page,
        "sourcePassage": f.source_passage,
        "region": f.region,
        "status": f.status,
    }


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


# ---------------------------------------------------------------------------
# Read tools
# ---------------------------------------------------------------------------

def get_submission(ctx: ToolContext) -> dict:
    sub = _load_submission(ctx.db, ctx, _submission_id(ctx))
    latest = _latest_version(ctx.db, sub.id)
    findings = ctx.db.query(Finding).filter(Finding.submission_id == sub.id).all()
    return {
        "submissionId": sub.id,
        "code": sub.code,
        "title": sub.title,
        "status": sub.status,
        "channel": sub.channel,
        "brand": sub.brand,
        "type": sub.type,
        "version": sub.version,
        "excerpt": sub.excerpt,
        "copy": latest.copy if latest else sub.excerpt,
        "versionNumber": latest.version_number if latest else sub.version,
        "openFindings": len([f for f in findings if f.status == "open"]),
        "findings": [_finding_dict(f) for f in findings],
        "createdAt": sub.created_at.isoformat() if sub.created_at else None,
    }


def extract_document_text(ctx: ToolContext) -> dict:
    text_override = ctx.input.get("text") or ctx.input.get("copy")
    if text_override:
        return {"source": "provided_text", "text": str(text_override), "confidence": 1.0}

    sub = _load_submission(ctx.db, ctx, _submission_id(ctx))
    analysis = (
        ctx.db.query(AssetAnalysis)
        .filter(AssetAnalysis.submission_id == sub.id)
        .order_by(desc(AssetAnalysis.created_at))
        .first()
    )
    if analysis and analysis.ocr_text:
        return {
            "source": "ocr",
            "text": analysis.ocr_text,
            "confidence": 0.9 if not analysis.unreadable else 0.4,
            "unreadable": bool(analysis.unreadable),
            "blocks": analysis.text_blocks or [],
        }

    latest = _latest_version(ctx.db, sub.id)
    return {
        "source": "submission_copy",
        "text": (latest.copy if latest else sub.excerpt) or "",
        "confidence": 1.0,
        "unreadable": False,
        "blocks": [],
    }


def search_guidelines(ctx: ToolContext) -> dict:
    query = str(ctx.input.get("query") or ctx.input.get("text") or "").strip()
    if not query:
        raise ToolError("This tool requires a query.", code="missing_input")
    top_k = int(ctx.input.get("top_k") or ctx.input.get("topK") or 5)
    top_k = max(1, min(top_k, 10))

    rows, method = search_passages_hybrid(ctx.db, query=query, top_k=top_k)
    passages: list[dict] = []
    for row in rows:
        passage = ctx.db.get(GuidelinePassage, row.get("id"))
        doc = ctx.db.get(GuidelineDoc, passage.doc_id) if passage else None
        passages.append(
            {
                "passageId": row.get("id"),
                "docId": passage.doc_id if passage else None,
                "docName": (doc.name if doc else "") or (doc.title if doc else ""),
                "page": row.get("page"),
                "section": row.get("section"),
                "score": row.get("score"),
                "text": row.get("text"),
            }
        )
    return {"query": query, "method": method, "count": len(passages), "passages": passages}


def run_brand_rules(ctx: ToolContext) -> dict:
    sub = _load_submission(ctx.db, ctx, _submission_id(ctx))
    findings = ctx.db.query(Finding).filter(Finding.submission_id == sub.id).all()
    counts = Counter(f.outcome for f in findings)
    return {
        "submissionId": sub.id,
        "evaluated": len(findings),
        "counts": {
            "violation": counts.get("violation", 0),
            "needs_review": counts.get("unknown", 0) + counts.get("needs_review", 0),
            "compliant": counts.get("compliant", 0),
        },
        "findings": [_finding_dict(f) for f in findings],
        "note": (
            "Deterministic outcomes are read from stored findings; an agent cannot "
            "override or recompute them here."
        ),
    }


def retrieve_evidence(ctx: ToolContext) -> dict:
    passage_ids = ctx.input.get("passage_ids") or ctx.input.get("passageIds") or []
    quotes = ctx.input.get("quotes") or []
    if isinstance(passage_ids, str):
        passage_ids = [passage_ids]

    evidence: list[dict] = []
    verified = 0
    for pid in passage_ids[:20]:
        passage = ctx.db.get(GuidelinePassage, pid)
        if not passage:
            continue
        doc = ctx.db.get(GuidelineDoc, passage.doc_id)
        quote = ""
        for item in quotes:
            if isinstance(item, dict) and item.get("passage_id") == pid:
                quote = str(item.get("quote") or "")
                break
        if not quote:
            quote = passage.passage_text[:240]
        is_verified = bool(quote) and _normalise(quote) in _normalise(passage.passage_text)
        if is_verified:
            verified += 1
        evidence.append(
            {
                "passageId": passage.id,
                "docName": (doc.name if doc else "") or (doc.title if doc else ""),
                "page": passage.page_number,
                "section": passage.section or passage.heading,
                "quote": quote,
                "verified": is_verified,
                "text": passage.passage_text,
            }
        )
    return {"verified": verified, "total": len(evidence), "evidence": evidence}


def get_exception(ctx: ToolContext) -> dict:
    exception_id = ctx.input.get("exception_id") or ctx.input.get("exceptionId")
    if not exception_id:
        raise ToolError("This tool requires an exception_id.", code="missing_input")
    row = _require_workspace(ctx.db.get(ExceptionRequest, exception_id), ctx, "Exception")
    return {
        "exceptionId": row.id,
        "code": row.code,
        "ruleCode": row.rule_code,
        "ruleTitle": row.rule_title,
        "contentTitle": row.content_title,
        "reason": row.reason,
        "scope": row.scope,
        "status": row.status,
        "effectiveFrom": row.effective_from.isoformat() if row.effective_from else None,
        "expiresAt": row.expires_at.isoformat() if row.expires_at else None,
        "requestedBy": row.requested_by_id or row.requester_id,
        "conditions": row.conditions,
    }


def search_rules(ctx: ToolContext) -> dict:
    query = str(ctx.input.get("query") or "").strip().lower()
    include_inactive = bool(ctx.input.get("include_inactive"))
    rows = ctx.db.query(Rule).filter(Rule.workspace.in_([ctx.workspace, None])).all()
    if not include_inactive:
        rows = [r for r in rows if r.status == "active"]
    if query:
        rows = [
            r
            for r in rows
            if query in (r.code or "").lower()
            or query in (r.title or "").lower()
            or query in (r.summary or "").lower()
        ]
    return {
        "count": len(rows),
        "rules": [
            {
                "ruleId": r.id,
                "code": r.code,
                "title": r.title,
                "summary": r.summary,
                "condition": r.condition,
                "action": r.action,
                "severity": r.severity,
                "status": r.status,
                "sourceDocId": r.source_doc_id,
                "sourcePage": r.source_page,
                "sourcePassage": r.source_passage,
            }
            for r in rows[:50]
        ],
    }


def get_owner(ctx: ToolContext) -> dict:
    submission_id = ctx.input.get("submission_id") or ctx.input.get("submissionId")
    exception_id = ctx.input.get("exception_id") or ctx.input.get("exceptionId")

    user_id = ""
    context_label = ""
    if submission_id:
        sub = _load_submission(ctx.db, ctx, str(submission_id))
        user_id = sub.creator_id or ""
        context_label = sub.title
    elif exception_id:
        exc = _require_workspace(ctx.db.get(ExceptionRequest, str(exception_id)), ctx, "Exception")
        user_id = exc.requested_by_id or exc.requester_id or ""
        context_label = exc.content_title or exc.rule_title
    else:
        raise ToolError("Provide a submission_id or exception_id.", code="missing_input")

    user = ctx.db.get(User, user_id) if user_id else None
    return {
        "context": context_label,
        "ownerId": user_id,
        "name": user.name if user else "Unassigned",
        "email": user.email if user else "",
        "role": user.role if user else "",
        "title": user.title if user else "",
    }


def check_effective_dates(ctx: ToolContext) -> dict:
    now = datetime.now(timezone.utc)
    exception_id = ctx.input.get("exception_id") or ctx.input.get("exceptionId")
    rule_id = ctx.input.get("rule_id") or ctx.input.get("ruleId")

    if exception_id:
        exc = _require_workspace(ctx.db.get( ExceptionRequest, str(exception_id)), ctx, "Exception")
        start = _aware(exc.effective_from)
        end = _aware(exc.expires_at)
        if end and end < now:
            state = "expired"
        elif start and start > now:
            state = "not_yet_effective"
        elif exc.status in ("Revoked", "Cancelled", "Rejected"):
            state = "inactive"
        else:
            state = "active"
        return {
            "kind": "exception",
            "id": exc.id,
            "status": exc.status,
            "effectiveFrom": start.isoformat() if start else None,
            "expiresAt": end.isoformat() if end else None,
            "effectiveState": state,
            "daysRemaining": max(0, (end - now).days) if end else None,
        }

    if rule_id:
        rule = ctx.db.get(Rule, str(rule_id))
        if rule is None or rule.workspace not in (None, ctx.workspace):
            raise ToolError("Rule not found", code="not_found")
        start = _aware(rule.effective_from)
        end = _aware(rule.effective_to)
        if end and end < now:
            state = "expired"
        elif start and start > now:
            state = "not_yet_effective"
        elif rule.status != "active":
            state = "inactive"
        else:
            state = "active"
        return {
            "kind": "rule",
            "id": rule.id,
            "code": rule.code,
            "status": rule.status,
            "effectiveFrom": start.isoformat() if start else None,
            "effectiveTo": end.isoformat() if end else None,
            "effectiveState": state,
        }

    raise ToolError("Provide an exception_id or rule_id.", code="missing_input")


def get_affected_submissions(ctx: ToolContext) -> dict:
    rule_code = ctx.input.get("rule_code") or ctx.input.get("ruleCode")
    query = ctx.db.query(Finding)
    if rule_code:
        query = query.filter(Finding.rule_code == str(rule_code))
    findings = query.limit(200).all()

    seen: dict[str, dict] = {}
    for finding in findings:
        if finding.submission_id in seen:
            continue
        sub = ctx.db.get(Submission, finding.submission_id)
        if sub is None or sub.workspace not in (None, ctx.workspace):
            continue
        seen[sub.id] = {
            "submissionId": sub.id,
            "title": sub.title,
            "status": sub.status,
            "ruleCode": finding.rule_code,
            "severity": finding.severity,
            "outcome": finding.outcome,
        }
    items = list(seen.values())
    return {"count": len(items), "affected": items[:100]}


def get_audit_events(ctx: ToolContext) -> dict:
    limit = int(ctx.input.get("limit") or 20)
    limit = max(1, min(limit, 100))
    rows = (
        ctx.db.query(AuditEvent)
        .filter(AuditEvent.workspace.in_([ctx.workspace, None]))
        .order_by(desc(AuditEvent.at))
        .limit(limit)
        .all()
    )
    return {
        "count": len(rows),
        "events": [
            {
                "id": e.id,
                "at": e.at.isoformat() if e.at else None,
                "action": e.action,
                "entityKind": e.entity_kind,
                "entityTitle": e.entity_title,
                "details": e.details,
                "status": e.status,
                "actorType": e.actor_type,
            }
            for e in rows
        ],
    }


def get_review_statistics(ctx: ToolContext) -> dict:
    subs = ctx.db.query(Submission).filter(Submission.workspace.in_([ctx.workspace, None])).all()
    status_counts = Counter(s.status for s in subs)
    decisions = ctx.db.query(ReviewDecision).all()
    action_counts = Counter(d.action for d in decisions)
    findings = ctx.db.query(Finding).all()
    return {
        "submissions": len(subs),
        "statusBreakdown": dict(status_counts),
        "decisions": len(decisions),
        "decisionBreakdown": dict(action_counts),
        "findings": len(findings),
        "openFindings": len([f for f in findings if f.status == "open"]),
    }


def get_exception_statistics(ctx: ToolContext) -> dict:
    rows = ctx.db.query(ExceptionRequest).filter(ExceptionRequest.workspace.in_([ctx.workspace, None])).all()
    counts = Counter(r.status for r in rows)
    now = datetime.now(timezone.utc)
    expiring = 0
    for row in rows:
        end = _aware(row.expires_at)
        if end and now <= end and (end - now).days <= 30:
            expiring += 1
    return {
        "total": len(rows),
        "statusBreakdown": dict(counts),
        "expiringWithin30Days": expiring,
    }


def get_visual_analysis(ctx: ToolContext) -> dict:
    sub = _load_submission(ctx.db, ctx, _submission_id(ctx))
    analysis = (
        ctx.db.query(AssetAnalysis)
        .filter(AssetAnalysis.submission_id == sub.id)
        .order_by(desc(AssetAnalysis.created_at))
        .first()
    )
    if analysis is None:
        return {"submissionId": sub.id, "available": False, "note": "No visual analysis has been stored for this submission."}
    return {
        "submissionId": sub.id,
        "available": True,
        "status": analysis.status,
        "width": analysis.width,
        "height": analysis.height,
        "ocrText": analysis.ocr_text,
        "textBlocks": analysis.text_blocks or [],
        "dominantColors": analysis.dominant_colors or analysis.colors or [],
        "logoMatches": analysis.logo_matches or analysis.logo_detections or [],
        "layoutMetrics": analysis.layout_metrics or analysis.layout_facts or {},
        "contrastFindings": analysis.contrast_findings or analysis.contrast_samples or [],
        "unreadable": bool(analysis.unreadable),
    }


def generate_summary(ctx: ToolContext) -> dict:
    text = str(ctx.input.get("text") or "")
    findings = ctx.input.get("findings") or []
    evidence = ctx.input.get("evidence") or []

    if ai_available() and (text or findings):
        system = (
            "You are a brand-governance summariser. Summarise ONLY the supplied findings, "
            "evidence and copy. Never invent a finding, citation, rule code or number. "
            "If evidence is missing, say so. Keep the summary under 120 words."
        )
        user = (
            f"Findings: {findings}\nEvidence: {evidence}\nCopy: {text[:2000]}\n"
            "Return a concise review summary with a clear recommendation."
        )
        raw = llm_complete(system, user, max_tokens=400)
        if raw:
            return {"summary": raw.strip(), "aiUsed": True, "model": "configured-llm"}

    # Deterministic fallback — no model required, no fabrication.
    severities = Counter(str(f.get("severity", "Medium")) for f in findings if isinstance(f, dict))
    verified = len([e for e in evidence if isinstance(e, dict) and e.get("verified")])
    lines = [
        f"Review summary: {len(findings)} finding(s) detected"
        + (f" ({severities.get('High', 0)} high, {severities.get('Medium', 0)} medium, {severities.get('Low', 0)} low)." if findings else "."),
        f"Evidence verification: {verified}/{len(evidence)} cited passage(s) verified." if evidence else "No evidence passages were supplied.",
    ]
    if findings:
        top = [f"{f.get('ruleCode', 'RULE')} — {f.get('ruleTitle', '')}".strip() for f in findings[:3] if isinstance(f, dict)]
        if top:
            lines.append("Primary findings: " + "; ".join(top) + ".")
        lines.append("Recommendation: request corrections before approval. A human manager must make the final decision.")
    else:
        lines.append("No deterministic findings were stored for this submission.")
    return {"summary": " ".join(lines), "aiUsed": False, "model": None}


# ---------------------------------------------------------------------------
# Draft / write tools (never governance-changing)
# ---------------------------------------------------------------------------

def create_review_draft(ctx: ToolContext) -> dict:
    """Assemble a review draft. This does NOT write a governance record."""
    draft = {
        "draftId": new_id("draft"),
        "status": "draft",
        "submissionId": ctx.input.get("submission_id") or ctx.input.get("submissionId"),
        "summary": ctx.input.get("summary") or "",
        "findings": ctx.input.get("findings") or [],
        "evidence": ctx.input.get("evidence") or [],
        "recommendedAction": ctx.input.get("recommendedAction")
        or "Human review required. The agent cannot approve, reject or publish content.",
        "createdByAgent": ctx.agent_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    return {"draft": draft, "persisted": False, "note": "Drafts are returned to the run, not written to official records."}


def create_notification(ctx: ToolContext) -> dict:
    """Create an in-app notification. This is the only write-capable tool."""
    title = str(ctx.input.get("title") or "Agent Studio notification").strip()
    body = str(ctx.input.get("body") or ctx.input.get("message") or "").strip()
    recipient = ctx.input.get("user_id") or ctx.input.get("userId")

    if not recipient:
        manager = (
            ctx.db.query(User)
            .filter(User.workspace == ctx.workspace, User.role == "manager")
            .first()
        )
        recipient = manager.id if manager else ctx.user.id

    notification = Notification(
        id=new_id("notif"),
        workspace=ctx.workspace,
        workspace_id=ctx.user.workspace_id,
        user_id=str(recipient),
        type="system",
        title=title[:200],
        body=body[:2000],
        payload={"source": "agent_studio", "agentId": ctx.agent_id, "runId": ctx.run_id},
        idempotency_key=f"agent:{ctx.run_id}:{ctx.agent_id}",
    )
    ctx.db.add(notification)
    ctx.db.flush()
    return {"notificationId": notification.id, "recipientId": recipient, "title": title}
