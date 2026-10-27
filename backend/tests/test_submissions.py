"""Submission creation, rule findings, and manager decision + audit tests."""
from conftest import auth_headers
from app.db import SessionLocal
from app.models import Rule


SUBMISSION_BODY = {
    "title": "Spring campaign",
    "excerpt": "A short excerpt.",
    "type": "Text",
    "channel": "email",
    "brand": "PureGlow",
    "text": "Our cream is 100% safe for everyone.",
    "thumb": {"kind": "art", "palette": "lime", "glyph": "leaf"},
}


def _seed_active_rule():
    """Seed an ACTIVE CL-04 rule (so submissions produce a citable finding)."""
    db = SessionLocal()
    rule = Rule(
        id="rule-cl04-1",
        code="CL-04",
        title="No absolute claims",
        status="active",
        source_passage="Absolute terms require substantiation.",
        subject="Claims",
        scope="All brands",
    )
    db.add(rule)
    db.commit()
    db.close()


def test_create_submission_builds_findings(client, creator_token):
    _seed_active_rule()
    resp = client.post("/submissions", json=SUBMISSION_BODY, headers=auth_headers(creator_token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    findings = body["findings"]
    assert isinstance(findings, list)
    assert len(findings) >= 1
    # citation must come from the stored source passage, not be fabricated.
    cl04 = [f for f in findings if f["ruleCode"] == "CL-04"]
    assert cl04, "expected a CL-04 finding"
    assert cl04[0]["sourcePassage"] == "Absolute terms require substantiation."
    assert body["issueCount"] == len(findings)


def test_stale_version_decision_rejected(client, creator_token, manager_token):
    _seed_active_rule()
    create = client.post("/submissions", json=SUBMISSION_BODY, headers=auth_headers(creator_token))
    sub_id = create.json()["id"]

    v2 = client.post(
        f"/submissions/{sub_id}/versions",
        json={"text": "Updated copy without the absolute claim.", "note": "v2"},
        headers=auth_headers(creator_token),
    )
    assert v2.status_code == 200, v2.text
    assert v2.json()["version"] == 2

    # A decision aimed at the version the reviewer saw (v1) must be rejected.
    stale = client.post(
        f"/submissions/{sub_id}/decide",
        json={"action": "Approved", "note": "Reviewed v1", "version": 1},
        headers=auth_headers(manager_token),
    )
    assert stale.status_code == 409

    # The current version can be decided.
    ok = client.post(
        f"/submissions/{sub_id}/decide",
        json={"action": "Approved", "note": "Reviewed v2", "version": 2},
        headers=auth_headers(manager_token),
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["status"] == "Approved"


def test_manager_approve_creates_audit_event(client, creator_token, manager_token):
    _seed_active_rule()
    create = client.post("/submissions", json=SUBMISSION_BODY, headers=auth_headers(creator_token))
    sub_id = create.json()["id"]

    decide = client.post(
        f"/submissions/{sub_id}/decide",
        json={"action": "Approved", "note": "Looks good"},
        headers=auth_headers(manager_token),
    )
    assert decide.status_code == 200, decide.text
    assert decide.json()["status"] == "Approved"

    audit = client.get("/audit", headers=auth_headers(manager_token))
    assert audit.status_code == 200
    events = audit.json()
    assert any(
        e["action"] == "Approved" and e["entityId"] == sub_id for e in events
    ), "expected an Approved audit event for the submission"
