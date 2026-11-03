"""A3 Sentinel tests: triggers, dedupe, resolution, notifications, expiry scan.

Sentinel turns a compliance-affecting change into human work. What has to hold
is that it fires exactly once per (version, trigger, ref), never touches
drafts, never crosses a workspace boundary, and never re-notifies on a second
run of the same day's scan.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app import models
from app.db import SessionLocal
from app.ids import new_id
from app.services import sentinel as st


VIOLATING_TEXT = "Our cream is 100% safe to use."  # CL-04: unsubstantiated absolute claim


@pytest.fixture
def db():
    """A session against the per-test database built by conftest."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _submission(db, sub_id, *, workspace, status, text=VIOLATING_TEXT, creator_id="creator-1"):
    """Insert a submission with exactly one content version."""
    db.add(
        models.Submission(
            id=sub_id,
            workspace=workspace,
            code=f"SUB-{sub_id}",
            title=f"Poster {sub_id}",
            brand=workspace,
            channel="Email",
            status=status,
            creator_id=creator_id,
            version=1,
        )
    )
    db.add(
        models.ContentVersion(
            id=f"cv_{sub_id}",
            submission_id=sub_id,
            version=1,
            text=text,
            author_id=creator_id,
        )
    )


@pytest.fixture
def workspace(db, users):
    """PureGlow with one active absolute-claims rule and one approved submission.

    `users` (conftest) supplies the workspace's manager and creator, which are
    the two people Sentinel notifies.
    """
    db.add(
        models.Rule(
            id="rule_cl04",
            workspace="PureGlow",
            code="CL-04",
            title="No absolute claims",
            summary="Absolute terms require substantiation on the same asset.",
            status="active",
            source_passage="Absolute terms require substantiation.",
        )
    )
    _submission(db, "sub_approved", workspace="PureGlow", status="Approved")
    db.commit()
    return db


# ---------------------------------------------------------------------------
# run_trigger
# ---------------------------------------------------------------------------


def test_run_trigger_creates_one_task_and_notifies_the_owner_and_manager(workspace):
    """One newly non-compliant live version becomes exactly one piece of work.

    The task must be assigned, dated and traceable to the rule that triggered
    it - otherwise nobody knows what to fix or why.
    """
    result = st.run_trigger(
        workspace,
        trigger_type="rule_activated",
        trigger_ref="CL-04",
        workspace="PureGlow",
        actor_id="manager-1",
    )

    assert result["affected"] == 1
    assert result["tasksCreated"] == 1
    assert result["notificationsCreated"] >= 1
    assert result["skipped"] == 0

    tasks = workspace.query(models.ReassessmentTask).all()
    assert len(tasks) == 1
    task = tasks[0]
    assert task.submission_id == "sub_approved"
    assert task.submission_version_id == "cv_sub_approved"
    assert task.workspace == "PureGlow"
    assert task.trigger_type == "rule_activated"
    assert task.trigger_ref == "CL-04"
    assert task.affected_rule_codes == ["CL-04"]
    assert task.status == "open"
    assert task.assignee_id == "creator-1"
    assert task.due_at is not None

    notifications = workspace.query(models.Notification).all()
    recipients = {n.user_id for n in notifications}
    assert recipients == {"creator-1", "manager-1"}
    assert all(n.type == "sentinel_task" for n in notifications)
    assert all(n.payload["taskId"] == task.id for n in notifications)


def test_run_trigger_is_deduplicated(workspace):
    """Replaying the same trigger creates one task total and reports the skip.

    Sentinel is called from rule edits that can be retried; without dedupe the
    queue would fill with identical work and the notification bell with noise.
    """
    first = st.run_trigger(
        workspace, trigger_type="rule_activated", trigger_ref="CL-04", workspace="PureGlow"
    )
    notifications_after_first = workspace.query(models.Notification).count()

    second = st.run_trigger(
        workspace, trigger_type="rule_activated", trigger_ref="CL-04", workspace="PureGlow"
    )

    assert first["tasksCreated"] == 1
    assert second["tasksCreated"] == 0
    assert second["skipped"] >= 1
    assert workspace.query(models.ReassessmentTask).count() == 1
    # A duplicate task must not produce a duplicate notification either.
    assert workspace.query(models.Notification).count() == notifications_after_first


def test_run_trigger_ignores_draft_submissions(db, users):
    """A Pending submission is never replayed - nobody has shipped it yet."""
    db.add(
        models.Rule(
            id="rule_cl04",
            workspace="PureGlow",
            code="CL-04",
            title="No absolute claims",
            status="active",
            source_passage="Absolute terms require substantiation.",
        )
    )
    _submission(db, "sub_draft", workspace="PureGlow", status="Pending")
    db.commit()

    result = st.run_trigger(
        db, trigger_type="rule_activated", trigger_ref="CL-04", workspace="PureGlow"
    )

    assert result["affected"] == 0
    assert result["tasksCreated"] == 0
    assert db.query(models.ReassessmentTask).count() == 0
    assert db.query(models.Notification).count() == 0


def test_run_trigger_leaves_other_workspaces_alone(db, users):
    """A trigger in PureGlow must not create work in WellnessLife.

    Both submissions carry the identical violating sentence, so the only thing
    keeping WellnessLife out of the queue is the workspace scope.
    """
    db.add(
        models.Rule(
            id="rule_cl04",
            workspace="PureGlow",
            code="CL-04",
            title="No absolute claims",
            status="active",
            source_passage="Absolute terms require substantiation.",
        )
    )
    _submission(db, "sub_pg", workspace="PureGlow", status="Approved")
    _submission(db, "sub_wl", workspace="WellnessLife", status="Approved")
    db.commit()

    result = st.run_trigger(
        db, trigger_type="rule_activated", trigger_ref="CL-04", workspace="PureGlow"
    )

    assert result["tasksCreated"] == 1
    tasks = db.query(models.ReassessmentTask).all()
    assert [t.submission_id for t in tasks] == ["sub_pg"]
    assert db.query(models.ReassessmentTask).filter(
        models.ReassessmentTask.workspace == "WellnessLife"
    ).count() == 0
    assert db.query(models.Notification).filter(
        models.Notification.workspace == "WellnessLife"
    ).count() == 0


def test_find_affected_does_not_re_report_a_known_problem(workspace):
    """A problem already open on the submission is not "new" after a re-run.

    This is what stops a rule edit from re-flagging content that the team
    already knows about.
    """
    workspace.add(
        models.Finding(
            id=new_id("f"),
            submission_id="sub_approved",
            rule_code="CL-04",
            rule_title="No absolute claims",
            status="open",
        )
    )
    workspace.commit()

    assert st.find_affected(workspace, workspace="PureGlow") == []


# ---------------------------------------------------------------------------
# resolve_task
# ---------------------------------------------------------------------------


@pytest.fixture
def open_task(workspace):
    st.run_trigger(
        workspace, trigger_type="rule_activated", trigger_ref="CL-04", workspace="PureGlow"
    )
    return workspace.query(models.ReassessmentTask).one()


def test_resolve_task_records_the_human_decision(workspace, open_task):
    """Resolving writes status, resolution, note, resolver and timestamp.

    The resolution is the audit trail for "we looked at this and shipped it
    anyway", so every field has to be stored.
    """
    resolved = st.resolve_task(
        workspace,
        task_id=open_task.id,
        resolution="re_approve",
        note="Legal confirmed the claim.",
        user_id="manager-1",
    )

    assert resolved is not None
    assert resolved.status == "resolved"
    assert resolved.resolution == "re_approve"
    assert resolved.resolution_note == "Legal confirmed the claim."
    assert resolved.resolved_by_id == "manager-1"
    assert resolved.resolved_at is not None

    # The decision is also visible in the audit log as a sentinel event.
    audit = (
        workspace.query(models.AuditEvent)
        .filter(models.AuditEvent.entity_kind == "sentinel")
        .filter(models.AuditEvent.entity_id == open_task.id)
        .all()
    )
    assert audit, "resolving a task must be audited"


def test_resolve_task_is_idempotent(workspace, open_task):
    """A second resolution does not rewrite the first decision.

    Closing twice happens on double-click; the original reviewer's decision
    and timestamp must survive.
    """
    first = st.resolve_task(
        workspace, task_id=open_task.id, resolution="re_approve", note="ok", user_id="manager-1"
    )
    resolved_at = first.resolved_at

    second = st.resolve_task(
        workspace, task_id=open_task.id, resolution="withdraw", note="late", user_id="creator-1"
    )

    assert second is not None
    assert second.status == "resolved"
    assert second.resolution == "re_approve"
    assert second.resolved_at == resolved_at
    assert second.resolved_by_id == "manager-1"


def test_resolve_task_rejects_an_unknown_resolution(workspace, open_task):
    """A typo'd resolution fails loudly instead of silently losing the decision."""
    with pytest.raises(ValueError):
        st.resolve_task(
            workspace, task_id=open_task.id, resolution="banana", note="", user_id="manager-1"
        )


def test_resolve_task_returns_none_for_a_missing_task(db):
    """An unknown task id is not an error - the caller simply has nothing to do."""
    assert st.resolve_task(db, task_id="rt_missing", resolution="withdraw", note="", user_id="x") is None


# ---------------------------------------------------------------------------
# unread_count
# ---------------------------------------------------------------------------


def test_unread_count_falls_to_zero_after_marking_read(db):
    """Unread counts only this user's unread rows in this workspace.

    The bell badge is read straight from this number, so a leak (another
    workspace, or already-read rows) shows up as a permanently wrong badge.
    """
    for index in range(2):
        db.add(
            models.Notification(
                id=f"n_{index}",
                workspace="PureGlow",
                user_id="creator-1",
                type="sentinel_task",
                title=f"Task {index}",
                payload={},
            )
        )
    db.add(
        models.Notification(
            id="n_other_user", workspace="PureGlow", user_id="manager-1", type="system", title="x"
        )
    )
    db.add(
        models.Notification(
            id="n_other_ws", workspace="WellnessLife", user_id="creator-1", type="system", title="y"
        )
    )
    db.commit()

    assert st.unread_count(db, user_id="creator-1", workspace="PureGlow") == 2

    db.get(models.Notification, "n_0").read_at = datetime.now(timezone.utc)
    db.commit()
    assert st.unread_count(db, user_id="creator-1", workspace="PureGlow") == 1

    db.get(models.Notification, "n_1").read_at = datetime.now(timezone.utc)
    db.commit()
    assert st.unread_count(db, user_id="creator-1", workspace="PureGlow") == 0


# ---------------------------------------------------------------------------
# scan_expiring
# ---------------------------------------------------------------------------


def _expiring_exception(db, exception_id="ex_soon", days=5, workspace="PureGlow"):
    now = datetime.now(timezone.utc)
    db.add(
        models.ExceptionRequest(
            id=exception_id,
            workspace=workspace,
            code=f"EX-{exception_id}",
            content_id="sub_approved",
            content_title="Poster sub_approved",
            brand=workspace,
            rule_code="CL-04",
            rule_title="No absolute claims",
            reason="Temporary waiver",
            scope="All brands",
            requested_by_id="creator-1",
            status="Approved",
            effective_from=now - timedelta(days=1),
            expires_at=now + timedelta(days=days),
        )
    )
    db.commit()


def test_scan_expiring_notifies_once_per_day(workspace):
    """Two scans on the same day produce one notification per recipient.

    The scan is scheduled daily; without the per-day key it would re-notify
    every run and train people to ignore the bell.
    """
    _expiring_exception(workspace)

    first = st.scan_expiring(workspace, workspace="PureGlow", days=30)
    count_after_first = workspace.query(models.Notification).filter(
        models.Notification.type == "exception_expiring"
    ).count()

    second = st.scan_expiring(workspace, workspace="PureGlow", days=30)
    count_after_second = workspace.query(models.Notification).filter(
        models.Notification.type == "exception_expiring"
    ).count()

    assert first["exceptionsExpiring"] == 1
    assert first["notificationsCreated"] == 2  # requester + manager
    assert count_after_first == 2
    assert second["notificationsCreated"] == 0
    assert count_after_second == count_after_first
    # ApprovedClaim has no expiry column, so this number must not be invented.
    assert first["claimsExpiring"] == 0


def test_scan_expiring_ignores_exceptions_outside_the_window(workspace):
    """An exception expiring in 60 days is not "expiring within 30 days"."""
    _expiring_exception(workspace, exception_id="ex_later", days=60)

    result = st.scan_expiring(workspace, workspace="PureGlow", days=30)

    assert result["exceptionsScanned"] == 1
    assert result["exceptionsExpiring"] == 0
    assert result["notificationsCreated"] == 0


def test_scan_expiring_is_workspace_scoped(workspace):
    """Another workspace's expiring exception must not notify PureGlow staff."""
    _expiring_exception(workspace, exception_id="ex_wl", workspace="WellnessLife")

    result = st.scan_expiring(workspace, workspace="PureGlow", days=30)

    assert result["exceptionsExpiring"] == 0
    assert result["notificationsCreated"] == 0


# ---------------------------------------------------------------------------
# list_publications — what Sentinel is actually watching
# ---------------------------------------------------------------------------


def _publish(db, *, submission_id="sub_approved", version_id="cv_sub_approved", workspace="PureGlow"):
    return st.create_publication(
        db,
        submission_id=submission_id,
        version_id=version_id,
        channel="Instagram",
        user_id="manager-1",
        workspace=workspace,
    )


def test_list_publications_reports_title_and_channel(workspace):
    """The monitoring list must be readable without a second round-trip."""
    _publish(workspace)
    workspace.commit()

    rows = st.list_publications(workspace, workspace="PureGlow")

    assert len(rows) == 1
    assert rows[0]["title"] == "Poster sub_approved"
    assert rows[0]["channel"] == "Instagram"
    assert rows[0]["status"] == "published"
    assert rows[0]["openTasks"] == 0


def test_list_publications_counts_only_open_tasks(workspace):
    """A resolved task is not "to re-check" any more."""
    _publish(workspace)
    workspace.commit()
    st.run_trigger(
        workspace,
        trigger_type="rule_edited",
        trigger_ref="rule_cl04",
        rule_codes=["CL-04"],
        workspace="PureGlow",
    )

    rows = st.list_publications(workspace, workspace="PureGlow")
    assert rows[0]["openTasks"] == 1

    task = workspace.query(models.ReassessmentTask).one()
    st.resolve_task(
        workspace, task_id=task.id, resolution="re_approve", note="Still fine.", user_id="manager-1"
    )

    rows = st.list_publications(workspace, workspace="PureGlow")
    assert rows[0]["openTasks"] == 0


def test_list_publications_is_workspace_scoped(workspace):
    """WellnessLife publications must never appear in the PureGlow list."""
    _submission(workspace, "sub_wl", workspace="WellnessLife", status="Approved")
    workspace.commit()
    _publish(workspace, submission_id="sub_wl", version_id="cv_sub_wl", workspace="WellnessLife")
    workspace.commit()

    assert st.list_publications(workspace, workspace="PureGlow") == []
    assert len(st.list_publications(workspace, workspace="WellnessLife")) == 1


def test_list_publications_can_filter_by_status(workspace):
    """Withdrawn versions are no longer monitored."""
    pub = _publish(workspace)
    workspace.commit()
    st.withdraw_publication(workspace, publication_id=pub.id, user_id="manager-1")
    workspace.commit()

    assert st.list_publications(workspace, workspace="PureGlow", status="published") == []
    assert len(st.list_publications(workspace, workspace="PureGlow", status="withdrawn")) == 1
