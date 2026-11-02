"""A3 Sentinel — deterministic re-checks of content that is already live.

Content that was approved or published can silently stop being compliant when
a rule changes, an exception expires or is revoked, or an approved claim is
withdrawn. Sentinel detects exactly that and turns it into human work.

Design rules (blueprint 7.2):
  - Deterministic only. Every verdict comes from `rule_engine.run_rules` over
    stored text/asset facts. This module never imports `app.ai` and never
    guesses a violation.
  - Only live content is re-checked: a version is in scope when its submission
    is `Approved` or a `Publication` row with status `published` points at it.
    Drafts are never replayed.
  - Only NEW problems are reported. A finding the engine reproduces is compared
    against the submission's stored findings; anything already open (or still
    covered by an approved, unexpired, in-scope exception) is not "new".
  - One task per (version, trigger type, trigger ref). The DB unique constraint
    `uq_task_version_trigger` is the last line of defence; every insert also
    runs in a savepoint so one duplicate can never fail the batch.
  - Every trigger and every resolution writes an `AuditEvent` with
    `entity_kind="sentinel"`.

Honest limits, stated rather than hidden:
  - `Finding` rows are stored per submission, not per version. The baseline for
    "already known" is therefore the submission's stored `open` findings. This
    can only make Sentinel more conservative, never invent a problem.
  - `ApprovedClaim` has no expiry column, so `scan_expiring` can only scan
    exceptions. It reports `claimsExpiring: 0` instead of a made-up number.
  - Withdrawn claims are matched by normalised text containment: content that
    literally quotes the claim is flagged. Paraphrases are not guessed.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, object_session

from .. import models
from ..config import settings
from ..ids import new_id
from ..rule_engine import run_rules
from .audit import record
from .submissions import _active_exception, _asset_from_submission

log = logging.getLogger("precedent.sentinel")

# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    """SQLite hands back naive datetimes; treat stored values as UTC."""
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _iso(dt: Optional[datetime]) -> Optional[str]:
    value = _aware(dt)
    return value.isoformat() if value else None


def _norm(text: Optional[str]) -> str:
    return " ".join((text or "").lower().split())


def _ws(workspace: Optional[str]) -> str:
    return workspace or "PureGlow"


def _in_workspace(column, workspace: str):
    """Rows owned by this workspace, plus legacy rows with no workspace set."""
    return (column == workspace) | (column.is_(None))


def _short(text: Optional[str], limit: int = 200) -> str:
    value = " ".join((text or "").split())
    return value if len(value) <= limit else value[: limit - 1].rstrip() + "…"


# ---------------------------------------------------------------------------
# Publications
# ---------------------------------------------------------------------------


def create_publication(
    db: Session,
    *,
    submission_id: str,
    version_id: str,
    channel: str,
    user_id: str,
    workspace: str,
) -> models.Publication:
    """Record that a specific version of a submission went live.

    Publishing is the only way content enters Sentinel's published scope, so
    this validates that the version really belongs to the submission and that
    both live in the caller's workspace. Re-publishing the same version returns
    the existing `published` row instead of creating a duplicate.
    """
    ws = _ws(workspace)
    sub = db.get(models.Submission, submission_id)
    if sub is None:
        raise ValueError(f"Unknown submission: {submission_id}")
    if sub.workspace is not None and sub.workspace != ws:
        raise ValueError("Submission belongs to another workspace.")

    version = db.get(models.ContentVersion, version_id)
    if version is None:
        raise ValueError(f"Unknown content version: {version_id}")
    if version.submission_id != submission_id:
        raise ValueError("Content version does not belong to this submission.")

    existing = (
        db.query(models.Publication)
        .filter(
            models.Publication.submission_id == submission_id,
            models.Publication.submission_version_id == version_id,
            models.Publication.status == "published",
        )
        .first()
    )
    if existing is not None:
        return existing

    pub = models.Publication(
        id=new_id("pub"),
        workspace=ws,
        submission_id=submission_id,
        submission_version_id=version_id,
        channel=channel or sub.channel or "",
        published_at=_now(),
        published_by=user_id or "",
        status="published",
    )
    db.add(pub)

    record(
        db,
        action="Approved",
        entity_title=sub.title,
        entity_meta=sub.brand,
        brand=sub.brand,
        user_id=user_id or "",
        details=f"Published version {version.version} to {pub.channel or 'unspecified channel'}.",
        status="Approved",
        entity_kind="sentinel",
        entity_id=pub.id,
        version=version.version,
        workspace=ws,
    )

    db.commit()
    db.refresh(pub)
    return pub


def withdraw_publication(
    db: Session, *, publication_id: str, user_id: str
) -> Optional[models.Publication]:
    """Take a publication offline. Returns None when the id does not exist.

    Withdrawing is not a compliance verdict, so no reassessment task is created;
    the version simply leaves Sentinel's published scope.
    """
    pub = db.get(models.Publication, publication_id)
    if pub is None:
        return None
    if pub.status == "withdrawn":
        return pub

    ws = _ws(pub.workspace)
    sub = db.get(models.Submission, pub.submission_id)
    pub.status = "withdrawn"

    record(
        db,
        action="Revised",
        entity_title=sub.title if sub else pub.submission_id,
        entity_meta=sub.brand if sub else "",
        brand=sub.brand if sub else ws,
        user_id=user_id or "",
        details=f"Publication {pub.id} withdrawn; the version is no longer live.",
        status="Revised",
        entity_kind="sentinel",
        entity_id=pub.id,
        workspace=ws,
    )

    db.commit()
    db.refresh(pub)
    return pub


# ---------------------------------------------------------------------------
# Impact detection
# ---------------------------------------------------------------------------


def _active_rules(
    db: Session, workspace: str, rule_codes: Optional[list[str]] = None
) -> list[models.Rule]:
    """The CURRENT active rule set for this workspace, optionally narrowed."""
    rules = (
        db.query(models.Rule)
        .filter(models.Rule.status == "active")
        .filter(_in_workspace(models.Rule.workspace, workspace))
        .all()
    )
    # A caller may have flipped `status` on the ORM object without flushing yet;
    # honour that so a just-deactivated rule never re-flags live content.
    rules = [r for r in rules if (r.status or "active") == "active"]
    if rule_codes:
        wanted = {c for c in rule_codes if c}
        rules = [r for r in rules if r.code in wanted]
    return sorted(rules, key=lambda r: r.code or "")


def _scoped_versions(db: Session, workspace: str) -> list[tuple[models.Submission, models.ContentVersion]]:
    """(submission, version) pairs that are approved or published, never drafts.

    For an `Approved` submission the approved version is the one matching
    `submission.version`; every version named by a `published` Publication row
    is also in scope even when a newer draft version exists.
    """
    subs = (
        db.query(models.Submission)
        .filter(_in_workspace(models.Submission.workspace, workspace))
        .all()
    )
    if not subs:
        return []

    pubs = (
        db.query(models.Publication)
        .filter(models.Publication.status == "published")
        .filter(_in_workspace(models.Publication.workspace, workspace))
        .all()
    )
    published_version_ids = {p.submission_version_id for p in pubs if p.submission_version_id}
    published_without_version = {p.submission_id for p in pubs if not p.submission_version_id}

    scoped: list[tuple[models.Submission, models.ContentVersion]] = []
    seen: set[str] = set()
    for sub in subs:
        versions = list(sub.versions)
        if not versions:
            continue
        by_id = {v.id: v for v in versions}
        latest = next((v for v in versions if v.version == sub.version), None) or versions[-1]

        candidates: list[models.ContentVersion] = []
        if sub.status == "Approved":
            candidates.append(latest)
        for vid in published_version_ids:
            version = by_id.get(vid)
            if version is not None:
                candidates.append(version)
        if sub.id in published_without_version:
            candidates.append(latest)

        for version in candidates:
            if version.id in seen:
                continue
            seen.add(version.id)
            scoped.append((sub, version))

    scoped.sort(key=lambda pair: (pair[0].id, pair[1].version))
    return scoped


def _claim_rule_codes(rules: list[models.Rule]) -> list[str]:
    """Active rules that actually govern claims, by their own stored wording."""
    codes: list[str] = []
    for rule in rules:
        haystack = _norm(
            " ".join(
                [
                    rule.title or "",
                    rule.subject or "",
                    rule.summary or "",
                    rule.condition or "",
                    rule.action or "",
                ]
            )
        )
        if "claim" in haystack:
            codes.append(rule.code)
    return codes


def _find_affected(
    db: Session,
    *,
    workspace: str,
    rule_codes: Optional[list[str]] = None,
    claim_text: Optional[str] = None,
) -> list[dict]:
    """Internal impact finder; `find_affected` is the public, rule-only view.

    `claim_text` (used only by the claim-withdrawal trigger) adds versions whose
    text literally quotes a claim that is no longer approved.
    """
    ws = _ws(workspace)
    rules = _active_rules(db, ws, rule_codes)
    claim_codes = _claim_rule_codes(rules) if claim_text else []
    needle = _norm(claim_text)
    # A very short claim string would match almost any copy; require a phrase.
    claim_usable = bool(needle) and len(needle) >= 8

    affected: list[dict] = []
    for sub, version in _scoped_versions(db, ws):
        asset = _asset_from_submission(sub)
        replayed = run_rules(rules, version.text or "", sub.channel or "", asset)

        # Baseline: problems this submission already carries as open findings.
        baseline = {f.rule_code for f in sub.findings if (f.status or "") == "open"}

        new_codes: list[str] = []
        for finding in replayed:
            code = finding.rule_code
            if not code or code in baseline or code in new_codes:
                continue
            # A still-valid exception means this is not a new problem.
            if _active_exception(db, code, sub.brand, sub.id, ws):
                continue
            new_codes.append(code)

        if claim_usable and needle in _norm(version.text):
            for code in claim_codes:
                if code not in baseline and code not in new_codes:
                    new_codes.append(code)

        if not new_codes:
            continue

        affected.append(
            {
                "submissionId": sub.id,
                "versionId": version.id,
                "submissionTitle": sub.title,
                "creatorId": sub.creator_id,
                "newRuleCodes": new_codes,
                "channel": sub.channel or "",
            }
        )

    return affected


def find_affected(
    db: Session, *, workspace: str, rule_codes: Optional[list[str]] = None
) -> list[dict]:
    """Replay the current rule set against every approved/published version.

    Returns one dict per affected version:
    `{"submissionId","versionId","submissionTitle","creatorId","newRuleCodes","channel"}`.
    A version appears only when the replay produces a finding that is neither
    already stored as open for its submission nor covered by an active
    exception — so pre-existing problems are never re-reported.

    An empty list is a real answer: it means nothing live in this workspace is
    newly non-compliant.
    """
    return _find_affected(db, workspace=workspace, rule_codes=rule_codes)


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------


def notify(
    db: Session, *, user_id: str, workspace: str, type_: str, title: str, payload: dict
) -> models.Notification:
    """Create one notification row. The caller owns the commit."""
    notification = models.Notification(
        id=new_id("n"),
        workspace=_ws(workspace),
        user_id=user_id or "",
        type=type_ or "system",
        title=title or "",
        payload=payload or {},
    )
    db.add(notification)
    db.flush()
    return notification


def _manager_ids(db: Session, workspace: str) -> list[str]:
    managers = (
        db.query(models.User)
        .filter(models.User.role == "manager")
        .filter(_in_workspace(models.User.workspace, workspace))
        .all()
    )
    return [m.id for m in managers]


def _task_recipients(db: Session, sub: Optional[models.Submission], workspace: str) -> list[str]:
    """The content owner plus every manager in the workspace, de-duplicated."""
    ids: list[str] = []
    if sub is not None and sub.creator_id:
        ids.append(sub.creator_id)
    for manager_id in _manager_ids(db, workspace):
        if manager_id not in ids:
            ids.append(manager_id)
    return [uid for uid in ids if uid]


def _notify_task(
    db: Session,
    task: models.ReassessmentTask,
    item: dict,
    sub: Optional[models.Submission],
    workspace: str,
) -> int:
    payload = {
        "taskId": task.id,
        "submissionId": item["submissionId"],
        "submissionTitle": item["submissionTitle"],
        "triggerType": task.trigger_type,
        "triggerRef": task.trigger_ref,
        "ruleCodes": list(item.get("newRuleCodes") or []),
    }
    title = f'Reassessment needed: "{_short(item["submissionTitle"], 80)}"'
    created = 0
    for user_id in _task_recipients(db, sub, workspace):
        notify(
            db,
            user_id=user_id,
            workspace=workspace,
            type_="sentinel_task",
            title=title,
            payload=payload,
        )
        created += 1
    return created


# ---------------------------------------------------------------------------
# Triggers
# ---------------------------------------------------------------------------

_TRIGGER_ACTION = {
    "rule_activated": "Rule updated",
    "rule_edited": "Rule updated",
    "rule_deactivated": "Rule updated",
    "exception_expired": "Exception",
    "exception_revoked": "Exception",
    "claim_withdrawn": "Revised",
}

_TRIGGER_LABEL = {
    "rule_activated": "Rule activated",
    "rule_edited": "Rule edited",
    "rule_deactivated": "Rule deactivated",
    "exception_expired": "Exception expired",
    "exception_revoked": "Exception revoked",
    "claim_withdrawn": "Claim withdrawn",
}

_EDIT_FIELDS = ("condition", "action", "scope", "title", "summary", "priority")


def _edit_fingerprint(after: dict) -> str:
    """Stable 8-char digest of the post-edit state.

    It becomes part of `trigger_ref`, so re-running the *same* edit dedupes to
    one task while a genuinely different edit is a different trigger.
    """
    payload = {field: str((after or {}).get(field, "") or "") for field in _EDIT_FIELDS}
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=True)
    return hashlib.sha1(blob.encode("utf-8")).hexdigest()[:8]


def _diff_reason(rule: models.Rule, before: dict, after: dict) -> str:
    """Human-readable diff, e.g. `Rule COLOR-001 changed: condition 'A' -> 'B'`."""
    parts: list[str] = []
    for field in _EDIT_FIELDS:
        old = str((before or {}).get(field, "") or "").strip()
        new = str((after or {}).get(field, "") or "").strip()
        if old != new:
            parts.append(f"{field} '{_short(old, 120)}' -> '{_short(new, 120)}'")
    if not parts:
        return (
            f"Rule {rule.code} edited with no change to condition, action, scope, "
            "title, summary or priority."
        )
    return f"Rule {rule.code} changed: " + "; ".join(parts)


def run_trigger(
    db: Session,
    *,
    trigger_type: str,
    trigger_ref: str,
    workspace: str,
    actor_id: str = "",
    reason: str = "",
    rule_codes: Optional[list[str]] = None,
) -> dict:
    """Record a compliance-affecting change and create the work it implies.

    Flow: find affected approved/published versions with the deterministic
    engine, create one `ReassessmentTask` per (version, trigger, ref), notify
    the owner and the workspace's managers, then audit the trigger.

    Dedupe is belt-and-braces: an existence check runs first, and the insert
    itself runs inside a SAVEPOINT so a lost race surfaces as `IntegrityError`
    that rolls back to the savepoint and skips only that row.

    Returns `{"triggerType","triggerRef","affected","tasksCreated",
    "notificationsCreated","skipped"}`.
    """
    ws = _ws(workspace)
    trigger_type = (trigger_type or "").strip()
    trigger_ref = (trigger_ref or "").strip()

    claim_text: Optional[str] = None
    if trigger_type == "claim_withdrawn" and trigger_ref:
        claim = db.get(models.ApprovedClaim, trigger_ref)
        if claim is not None:
            claim_text = claim.text or ""
            if not reason:
                reason = f'Approved claim withdrawn: "{_short(claim.text)}"'

    affected = _find_affected(db, workspace=ws, rule_codes=rule_codes, claim_text=claim_text)

    if not reason:
        reason = f"{trigger_type.replace('_', ' ') or 'trigger'}: {trigger_ref}".strip()

    due_at = _now() + timedelta(days=max(0, int(settings.sentinel_sla_days)))
    tasks_created = 0
    notifications_created = 0
    skipped = 0

    for item in affected:
        already = (
            db.query(models.ReassessmentTask.id)
            .filter(
                models.ReassessmentTask.submission_version_id == item["versionId"],
                models.ReassessmentTask.trigger_type == trigger_type,
                models.ReassessmentTask.trigger_ref == trigger_ref,
            )
            .first()
        )
        if already is not None:
            skipped += 1
            continue

        sub = db.get(models.Submission, item["submissionId"])
        task = models.ReassessmentTask(
            id=new_id("rt"),
            workspace=ws,
            submission_id=item["submissionId"],
            submission_version_id=item["versionId"],
            trigger_type=trigger_type,
            trigger_ref=trigger_ref,
            reason=reason,
            affected_rule_codes=list(item.get("newRuleCodes") or []),
            assignee_id=item.get("creatorId"),
            status="open",
            due_at=due_at,
        )

        try:
            with db.begin_nested():
                db.add(task)
                db.flush()
        except IntegrityError:
            # Unique constraint won the race: undo just this insert.
            if task in db:
                db.expunge(task)
            skipped += 1
            continue

        tasks_created += 1
        notifications_created += _notify_task(db, task, item, sub, ws)

    record(
        db,
        action=_TRIGGER_ACTION.get(trigger_type, "Rule updated"),
        entity_title=f"{_TRIGGER_LABEL.get(trigger_type, 'Sentinel trigger')}: {trigger_ref}",
        entity_meta=f"{len(affected)} affected",
        brand=ws,
        user_id=actor_id or "",
        details=(
            f"{reason} Affected {len(affected)} version(s); created {tasks_created} "
            f"task(s), skipped {skipped} duplicate(s)."
        ),
        status="Recorded",
        entity_kind="sentinel",
        entity_id=trigger_ref,
        workspace=ws,
    )

    db.commit()

    return {
        "triggerType": trigger_type,
        "triggerRef": trigger_ref,
        "affected": len(affected),
        "tasksCreated": tasks_created,
        "notificationsCreated": notifications_created,
        "skipped": skipped,
    }


def on_rule_activated(
    db: Session, *, rule: models.Rule, actor_id: str, workspace: str
) -> dict:
    """A rule became active: re-check everything live against it."""
    ws = _ws(workspace)
    reason = (
        f'Rule {rule.code} "{rule.title}" activated; previously approved content '
        "is re-checked against it."
    )
    return run_trigger(
        db,
        trigger_type="rule_activated",
        trigger_ref=rule.code,
        workspace=ws,
        actor_id=actor_id,
        reason=reason,
        rule_codes=[rule.code],
    )


def on_rule_edited(
    db: Session,
    *,
    rule: models.Rule,
    before: dict,
    after: dict,
    actor_id: str,
    workspace: str,
) -> dict:
    """A rule's wording changed: re-check live content against the new wording.

    `trigger_ref` is `<code>:<fingerprint of the new state>`, so replaying the
    same edit yields one task while a different edit is a new trigger.
    """
    ws = _ws(workspace)
    reason = _diff_reason(rule, before, after)
    return run_trigger(
        db,
        trigger_type="rule_edited",
        trigger_ref=f"{rule.code}:{_edit_fingerprint(after)}",
        workspace=ws,
        actor_id=actor_id,
        reason=reason,
        rule_codes=[rule.code],
    )


def on_rule_deactivated(
    db: Session, *, rule: models.Rule, actor_id: str, workspace: str
) -> dict:
    """A rule was switched off.

    Replaying the *current* rule set omits it, so this normally affects nothing —
    which is the honest answer: removing an obligation cannot create a new
    violation. This holds whether the status change is already persisted or
    still pending on the ORM object. The trigger is recorded either way.
    """
    ws = _ws(workspace)
    reason = (
        f'Rule {rule.code} "{rule.title}" deactivated; no new obligation is '
        "introduced for live content."
    )
    return run_trigger(
        db,
        trigger_type="rule_deactivated",
        trigger_ref=rule.code,
        workspace=ws,
        actor_id=actor_id,
        reason=reason,
        rule_codes=[rule.code],
    )


def on_exception_expired(
    db: Session, *, exception: models.ExceptionRequest, actor_id: str = "", workspace: Optional[str] = None
) -> dict:
    """An exception lapsed: whatever it tolerated is a violation again."""
    ws = _ws(workspace or exception.workspace)
    expired_on = _iso(exception.expires_at)
    reason = (
        f"Exception {exception.code or exception.id} for rule {exception.rule_code or 'n/a'} "
        + (f"expired on {expired_on}." if expired_on else "expired.")
    )
    # Make a status change made by the caller visible to the exception lookup.
    db.flush()
    return run_trigger(
        db,
        trigger_type="exception_expired",
        trigger_ref=exception.id,
        workspace=ws,
        actor_id=actor_id,
        reason=reason,
        rule_codes=[exception.rule_code] if exception.rule_code else None,
    )


def on_exception_revoked(
    db: Session, *, exception: models.ExceptionRequest, actor_id: str, workspace: str
) -> dict:
    """An exception was revoked: the tolerated finding is exposed again."""
    ws = _ws(workspace or exception.workspace)
    reason = f"Exception {exception.code or exception.id} for rule {exception.rule_code or 'n/a'} revoked"
    if getattr(exception, "revoke_reason", None):
        reason += f": {_short(exception.revoke_reason)}"
    reason += "."
    # The revoke status is usually set on the object just before this call; flush
    # so `_active_exception` stops treating the exception as coverage.
    db.flush()
    return run_trigger(
        db,
        trigger_type="exception_revoked",
        trigger_ref=exception.id,
        workspace=ws,
        actor_id=actor_id,
        reason=reason,
        rule_codes=[exception.rule_code] if exception.rule_code else None,
    )


def on_claim_withdrawn(
    db: Session, *, claim: models.ApprovedClaim, actor_id: str, workspace: str
) -> dict:
    """An approved claim was withdrawn.

    Live content that literally quotes the claim is flagged; the active rules
    whose stored wording governs claims are reported as the affected rule codes.
    Paraphrases are not inferred.
    """
    ws = _ws(workspace or claim.workspace)
    reason = f'Approved claim withdrawn: "{_short(claim.text)}"'
    # Ensure the claim row is readable by the impact finder even if the caller
    # withdrew it on a not-yet-flushed object.
    db.flush()
    return run_trigger(
        db,
        trigger_type="claim_withdrawn",
        trigger_ref=claim.id,
        workspace=ws,
        actor_id=actor_id,
        reason=reason,
    )


# ---------------------------------------------------------------------------
# Resolution
# ---------------------------------------------------------------------------

_RESOLUTIONS = {
    "re_approve": "re_approve",
    "re-approve": "re_approve",
    "reapprove": "re_approve",
    "approve": "re_approve",
    "approved": "re_approve",
    "request_changes": "request_changes",
    "request-changes": "request_changes",
    "requestchanges": "request_changes",
    "changes_requested": "request_changes",
    "withdraw": "withdraw",
    "withdrawn": "withdraw",
}

# The content was fixed (resolved) or taken down (dismissed: nothing left to fix).
_RESOLUTION_STATUS = {
    "re_approve": "resolved",
    "request_changes": "resolved",
    "withdraw": "dismissed",
}

_RESOLUTION_AUDIT = {
    "re_approve": ("Approved", "Approved"),
    "request_changes": ("Revised", "Revised"),
    "withdraw": ("Revised", "Revised"),
}


def resolve_task(
    db: Session, *, task_id: str, resolution: str, note: str, user_id: str
) -> Optional[models.ReassessmentTask]:
    """Close a reassessment task with a human decision.

    `resolution` is one of `re_approve` / `request_changes` / `withdraw`
    (common aliases accepted). Returns None when the task does not exist or is
    already closed; raises ValueError for an unrecognised resolution so a bad
    caller fails loudly instead of silently losing the decision.
    """
    key = (resolution or "").strip().lower().replace(" ", "_")
    if key not in _RESOLUTIONS:
        raise ValueError(f"Unknown resolution: {resolution!r}")
    resolution = _RESOLUTIONS[key]

    task = db.get(models.ReassessmentTask, task_id)
    if task is None:
        return None
    if task.status != "open":
        return task

    sub = db.get(models.Submission, task.submission_id)
    action, status = _RESOLUTION_AUDIT[resolution]

    task.status = _RESOLUTION_STATUS[resolution]
    task.resolution = resolution
    task.resolution_note = note or ""
    task.resolved_by_id = user_id or ""
    task.resolved_at = _now()

    record(
        db,
        action=action,
        entity_title=sub.title if sub else task.submission_id,
        entity_meta=sub.brand if sub else "",
        brand=sub.brand if sub else _ws(task.workspace),
        user_id=user_id or "",
        details=(
            f"Reassessment task {task.id} {task.status} via {resolution}"
            + (f": {_short(note)}" if note else ".")
        ),
        status=status,
        entity_kind="sentinel",
        entity_id=task.id,
        workspace=_ws(task.workspace),
    )

    db.commit()
    db.refresh(task)
    return task


# ---------------------------------------------------------------------------
# Expiry scan
# ---------------------------------------------------------------------------


def _notification_exists(db: Session, user_id: str, workspace: str, key: str) -> bool:
    """True when this user already received the notification with this key today."""
    cutoff = _now().replace(tzinfo=None) - timedelta(days=1)
    rows = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == user_id,
            models.Notification.workspace == workspace,
            models.Notification.type == "exception_expiring",
            models.Notification.created_at >= cutoff,
        )
        .all()
    )
    return any((n.payload or {}).get("key") == key for n in rows)


def scan_expiring(db: Session, *, workspace: str, days: int = 30) -> dict:
    """Notify owners and managers about exceptions expiring within `days`.

    Idempotent per day: the payload carries
    `key = exception_expiring:<id>:<YYYY-MM-DD>`, and an existing notification
    with that key stops a duplicate. Running twice in one day is a no-op.

    `ApprovedClaim` has no expiry column, so claims cannot be scanned; the
    result reports `claimsExpiring: 0` rather than a fabricated count.
    """
    ws = _ws(workspace)
    now = _now()
    horizon = now + timedelta(days=max(0, int(days)))
    day = now.strftime("%Y-%m-%d")

    rows = (
        db.query(models.ExceptionRequest)
        .filter(
            models.ExceptionRequest.status == "Approved",
            models.ExceptionRequest.expires_at.isnot(None),
        )
        .filter(_in_workspace(models.ExceptionRequest.workspace, ws))
        .all()
    )
    expiring = [e for e in rows if (exp := _aware(e.expires_at)) and now <= exp <= horizon]

    managers = _manager_ids(db, ws)
    notifications_created = 0
    for exception in expiring:
        key = f"exception_expiring:{exception.id}:{day}"
        recipients: list[str] = []
        if exception.requested_by_id:
            recipients.append(exception.requested_by_id)
        for manager_id in managers:
            if manager_id not in recipients:
                recipients.append(manager_id)

        payload = {
            "key": key,
            "exceptionId": exception.id,
            "code": exception.code,
            "ruleCode": exception.rule_code,
            "contentId": exception.content_id,
            "contentTitle": exception.content_title,
            "expiresAt": _iso(exception.expires_at),
        }
        title = (
            f"Exception {exception.code or exception.id} expires "
            f"{_iso(exception.expires_at)[:10] if exception.expires_at else 'soon'}"
        )
        for user_id in recipients:
            if not user_id:
                continue
            if _notification_exists(db, user_id, ws, key):
                continue
            notify(
                db,
                user_id=user_id,
                workspace=ws,
                type_="exception_expiring",
                title=title,
                payload=payload,
            )
            notifications_created += 1

    record(
        db,
        action="Exception",
        entity_title=f"Sentinel expiry scan ({days}d)",
        entity_meta=f"{len(expiring)} exception(s) expiring",
        brand=ws,
        user_id="",
        details=(
            f"Scanned {len(rows)} approved exception(s); {len(expiring)} expire within "
            f"{days} day(s); created {notifications_created} notification(s)."
        ),
        status="Recorded",
        entity_kind="sentinel",
        entity_id=f"scan_expiring:{day}",
        workspace=ws,
    )

    db.commit()

    return {
        "workspace": ws,
        "days": int(days),
        "exceptionsScanned": len(rows),
        "exceptionsExpiring": len(expiring),
        "notificationsCreated": notifications_created,
        "claimsExpiring": 0,
    }


def lapse_exceptions(db: Session, *, workspace: str, actor_id: str = "") -> dict:
    """Close approved exceptions whose `expires_at` has passed.

    An exception is a time-boxed promise, so when it lapses the thing it
    tolerated becomes a violation again. Each lapsed row is flipped to
    `Expired` and handed to `on_exception_expired`, which re-runs the
    deterministic engine over the versions that relied on it and raises one
    reassessment task per affected version.

    Idempotent: a row only enters this set while its status is `Approved`, and
    `run_trigger` additionally de-duplicates on
    `(submission_version_id, trigger_type, trigger_ref)`.
    """
    ws = _ws(workspace)
    now = _now()

    rows = (
        db.query(models.ExceptionRequest)
        .filter(
            models.ExceptionRequest.status == "Approved",
            models.ExceptionRequest.expires_at.isnot(None),
        )
        .filter(_in_workspace(models.ExceptionRequest.workspace, ws))
        .all()
    )
    lapsed = [e for e in rows if (exp := _aware(e.expires_at)) and exp < now]

    tasks_created = 0
    notifications_created = 0
    errors: list[str] = []
    for exception in lapsed:
        exception.status = "Expired"
        try:
            result = on_exception_expired(db, exception=exception, actor_id=actor_id, workspace=ws)
            tasks_created += int(result.get("tasksCreated", 0) or 0)
            notifications_created += int(result.get("notificationsCreated", 0) or 0)
        except Exception as exc:  # one bad row must not stop the sweep
            db.rollback()
            errors.append(f"{exception.id}: {exc}"[:200])
            log.warning("could not re-check lapsed exception %s: %s", exception.id, exc)

    if lapsed:
        record(
            db,
            action="Exception",
            entity_title=f"Sentinel lapse sweep ({len(lapsed)})",
            entity_meta=f"{len(lapsed)} exception(s) expired",
            brand=ws,
            user_id=actor_id,
            details=(
                f"Closed {len(lapsed)} approved exception(s) past their expiry; "
                f"raised {tasks_created} reassessment task(s)."
            ),
            status="Recorded",
            entity_kind="sentinel",
            entity_id=f"lapse_exceptions:{now.strftime('%Y-%m-%d')}",
            workspace=ws,
        )

    db.commit()

    return {
        "workspace": ws,
        "exceptionsChecked": len(rows),
        "exceptionsExpired": len(lapsed),
        "tasksCreated": tasks_created,
        "notificationsCreated": notifications_created,
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# Serialization + read helpers
# ---------------------------------------------------------------------------


def _submission_title(task: models.ReassessmentTask) -> str:
    """Title lookup for a task.

    `ReassessmentTask.submission_id` has no ORM relationship, so this reads the
    session the task belongs to. A detached task simply serializes an empty
    title instead of raising.
    """
    cached = getattr(task, "submission_title", None)
    if cached:
        return str(cached)
    session = object_session(task)
    if session is not None and task.submission_id:
        sub = session.get(models.Submission, task.submission_id)
        if sub is not None:
            return sub.title
    return ""


def task_to_dict(t: models.ReassessmentTask) -> dict:
    """Serialize a ReassessmentTask to the camelCase contract shape."""
    due = _aware(t.due_at)
    return {
        "id": t.id,
        "submissionId": t.submission_id,
        "versionId": t.submission_version_id,
        "submissionTitle": _submission_title(t),
        "triggerType": t.trigger_type,
        "triggerRef": t.trigger_ref,
        "reason": t.reason,
        "affectedRuleCodes": list(t.affected_rule_codes or []),
        "assigneeId": t.assignee_id,
        "status": t.status,
        "dueAt": _iso(t.due_at),
        "resolution": t.resolution,
        "resolutionNote": t.resolution_note,
        "resolvedById": t.resolved_by_id,
        "resolvedAt": _iso(t.resolved_at),
        "createdAt": _iso(t.created_at),
        "isOverdue": bool(due is not None and t.status == "open" and due < _now()),
    }


def notification_to_dict(n: models.Notification) -> dict:
    """Serialize a Notification to the camelCase contract shape."""
    return {
        "id": n.id,
        "userId": n.user_id,
        "type": n.type,
        "title": n.title,
        "payload": n.payload or {},
        "readAt": _iso(n.read_at),
        "createdAt": _iso(n.created_at),
        "isRead": n.read_at is not None,
    }


def unread_count(db: Session, *, user_id: str, workspace: str) -> int:
    """Number of unread notifications for this user in this workspace."""
    return (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == user_id,
            models.Notification.workspace == _ws(workspace),
            models.Notification.read_at.is_(None),
        )
        .count()
    )


def list_notifications(
    db: Session, *, user_id: str, workspace: str, unread_only: bool = False
) -> list[dict]:
    """This user's notifications in this workspace, newest first."""
    query = db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.workspace == _ws(workspace),
    )
    if unread_only:
        query = query.filter(models.Notification.read_at.is_(None))
    rows = query.order_by(models.Notification.created_at.desc()).all()
    return [notification_to_dict(n) for n in rows]


def publication_to_dict(pub: models.Publication, *, submission=None, open_tasks: int = 0) -> dict:
    """Serialize a Publication, including the context Sentinel needs to show it."""
    title = ""
    content_type = ""
    if submission is not None:
        title = submission.title or ""
        content_type = submission.type or ""
    return {
        "id": pub.id,
        "submissionId": pub.submission_id,
        "versionId": pub.submission_version_id,
        "title": title,
        "type": content_type,
        "channel": pub.channel or "",
        "status": pub.status,
        "publishedAt": _iso(pub.published_at),
        "publishedBy": pub.published_by,
        "openTasks": open_tasks,
    }


def list_publications(
    db: Session, *, workspace: str, status: Optional[str] = None, limit: int = 50
) -> list[dict]:
    """Published versions Sentinel is watching, newest first.

    Only `published` rows are re-checked when a rule changes, so the count of
    these rows is exactly the blast radius of a policy edit.
    """
    query = db.query(models.Publication).filter(
        models.Publication.workspace == _ws(workspace)
    )
    if status:
        query = query.filter(models.Publication.status == status)
    rows = (
        query.order_by(models.Publication.published_at.desc()).limit(max(1, limit)).all()
    )
    if not rows:
        return []

    sub_ids = {p.submission_id for p in rows if p.submission_id}
    subs = {
        s.id: s
        for s in db.query(models.Submission).filter(models.Submission.id.in_(sub_ids)).all()
    } if sub_ids else {}

    version_ids = {p.submission_version_id for p in rows if p.submission_version_id}
    open_by_version: dict[str, int] = {}
    if version_ids:
        open_rows = (
            db.query(models.ReassessmentTask)
            .filter(
                models.ReassessmentTask.submission_version_id.in_(version_ids),
                models.ReassessmentTask.status == "open",
            )
            .all()
        )
        for t in open_rows:
            key = t.submission_version_id or ""
            open_by_version[key] = open_by_version.get(key, 0) + 1

    return [
        publication_to_dict(
            p,
            submission=subs.get(p.submission_id),
            open_tasks=open_by_version.get(p.submission_version_id or "", 0),
        )
        for p in rows
    ]


def list_tasks(
    db: Session,
    *,
    workspace: str,
    status: Optional[str] = None,
    assignee_id: Optional[str] = None,
) -> list[dict]:
    """Reassessment tasks in this workspace, newest first, optionally filtered."""
    query = db.query(models.ReassessmentTask).filter(
        models.ReassessmentTask.workspace == _ws(workspace)
    )
    if status:
        query = query.filter(models.ReassessmentTask.status == status)
    if assignee_id:
        query = query.filter(models.ReassessmentTask.assignee_id == assignee_id)
    rows = query.order_by(models.ReassessmentTask.created_at.desc()).all()
    return [task_to_dict(t) for t in rows]


# --- Canonical v1 Sentinel Hook ---
def trigger_sentinel_scan(
    db: Session,
    workspace_id: str,
    trigger_type: str,
    trigger_ref: str,
    affected_rule_code: Optional[str] = None,
) -> dict:
    """Executes a Sentinel scan across approved and published content.

    Idempotent: Only creates tasks for newly surfaced violations or unknowns.
    """
    scan_id = str(uuid.uuid4())
    scan_run = ScanRun(
        id=scan_id,
        workspace_id=workspace_id,
        trigger_type=trigger_type,
        trigger_ref=trigger_ref,
        started_at=utcnow(),
        status="running",
    )
    db.add(scan_run)
    db.commit()

    # Find candidate submissions in workspace (status 'Approved' or published)
    candidates = (
        db.query(Submission)
        .filter(Submission.workspace == workspace_id)
        .filter(Submission.status.in_(["Approved", "published", "in_review"]))
        .all()
    )

    # Active rules and active exceptions for evaluation
    active_rules = db.query(Rule).filter(Rule.workspace == workspace_id, Rule.status == "active").all()
    from app.models import ExceptionRequest
    active_exceptions = (
        db.query(ExceptionRequest)
        .filter(ExceptionRequest.workspace == workspace_id, ExceptionRequest.status == "Approved")
        .all()
    )

    tasks_created = 0
    scanned_count = len(candidates)

    for sub in candidates:
        # Build facts from stored submission attributes
        text = sub.excerpt or ""
        if sub.versions:
            text = sub.versions[-1].text

        facts = {
            "copy": {"text": text},
            "ocr": {"text": ""},
            "visual": {
                "palette": {
                    "min_delta_e_to_brand": 0.0 if not sub.asset_background_colour else 15.0,
                    "dominant_hex": sub.asset_background_colour or "#2C5E3B",
                },
                "logo_matches": [{"confidence": 0.95, "box": [0.05, 0.05, 0.2, 0.2]}] if not sub.asset_unreadable else [],
            },
            "meta": {
                "channel": sub.channel,
                "brand": sub.brand,
                "type": sub.type,
                "campaign_id": sub.campaign_id,
            },
            "approved_claims": [],
        }

        # Run deterministic evaluation
        eval_result = evaluate_submission(facts, active_rules, active_exceptions)

        # Check if the affected rule or any rule now produces a violation
        new_violations = [f for f in eval_result.findings if f.outcome == "violation"]

        if new_violations:
            top_v = new_violations[0]
            # Check for existing task to maintain idempotency
            existing = (
                db.query(ReassessmentTask)
                .filter(
                    ReassessmentTask.submission_id == sub.id,
                    ReassessmentTask.trigger_type == trigger_type,
                    ReassessmentTask.trigger_ref == trigger_ref,
                )
                .first()
            )

            if not existing:
                task = ReassessmentTask(
                    workspace_id=workspace_id,
                    submission_id=sub.id,
                    submission_version_id=sub.current_version_id or str(sub.version),
                    trigger_type=trigger_type,
                    trigger_ref=trigger_ref,
                    trigger_hash=hashlib.sha256(f"{sub.id}:{trigger_type}:{trigger_ref}".encode()).hexdigest(),
                    assignee_id=sub.creator_id,
                    priority="High" if top_v.severity in ("high", "critical") else "Medium",
                    status="open",
                    previous_outcome="compliant",
                    new_outcome="violation",
                    recommended_steps=[
                        f"Review violation against {top_v.rule_code}: {top_v.explanation}",
                        "Submit updated content version or request an exception ruling",
                    ],
                )
                db.add(task)
                db.flush()

                # Add task event
                db.add(
                    TaskEvent(
                        task_id=task.id,
                        kind="created",
                        actor_id="system:sentinel",
                        note=f"Task triggered by {trigger_type} ({trigger_ref}): {top_v.explanation}",
                    )
                )

                # Send notifications
                if sub.creator_id:
                    db.add(
                        Notification(
                            user_id=sub.creator_id,
                            type="sentinel_task_created",
                            title=f"Action Required: Policy Reassessment for '{sub.title}'",
                            body=f"Rule {top_v.rule_code} policy change requires review of published content.",
                            payload={"route": f"/app/sentinel/{task.id}", "task_id": task.id},
                            idempotency_key=f"sentinel:{task.id}:{sub.creator_id}",
                        )
                    )

                tasks_created += 1

    scan_run.status = "completed"
    scan_run.finished_at = utcnow()
    scan_run.stats = {
        "scanned_submissions": scanned_count,
        "tasks_created": tasks_created,
        "trigger_type": trigger_type,
        "trigger_ref": trigger_ref,
    }
    db.commit()

    return scan_run.stats

