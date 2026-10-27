"""Exception lifecycle tests: create, and manager approval rules."""
from conftest import auth_headers

EXPIRED_AT = "2020-01-01T00:00:00"
FUTURE_AT = "2099-01-01T00:00:00"


def _exception_body(content_id, expires_at):
    return {
        "contentId": content_id,
        "contentTitle": "Test content",
        "contentMeta": "social post",
        "brand": "PureGlow",
        "ruleCode": "CL-04",
        "ruleTitle": "No absolute claims",
        "reason": "One-off campaign",
        "scope": "All brands",
        "effectiveFrom": "2025-01-01T00:00:00",
        "expiresAt": expires_at,
        "thumb": {"kind": "art", "palette": "lime", "glyph": "leaf"},
        "conditions": "Must be removed after the window.",
    }


def _create_exception(client, token, expires_at):
    resp = client.post(
        "/exceptions", json=_exception_body("c1", expires_at), headers=auth_headers(token)
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def test_approve_expired_exception_is_rejected(client, users, creator_token, manager_token):
    exc_id = _create_exception(client, creator_token, EXPIRED_AT)
    resp = client.post(
        f"/exceptions/{exc_id}/decide",
        json={"decision": "Approved", "conditions": ""},
        headers=auth_headers(manager_token),
    )
    assert resp.status_code == 409


def test_approved_exception_suppresses_finding(client, users, creator_token, manager_token):
    """A valid exception makes the rule engine record the finding as
    accepted_exception (traceable) instead of an open issue."""
    from app.db import SessionLocal
    from app.models import Rule

    db = SessionLocal()
    db.add(
        Rule(
            id="rule-cl04-exc",
            code="CL-04",
            title="No absolute claims",
            status="active",
            source_passage="Absolute terms require substantiation.",
            subject="Claims",
            scope="All brands",
        )
    )
    db.commit()
    db.close()

    body = {
        "title": "Exception test",
        "type": "Text",
        "channel": "email",
        "brand": "PureGlow",
        "text": "Our cream is 100% safe for everyone.",
    }
    first = client.post("/submissions", json=body, headers=auth_headers(creator_token)).json()
    assert any(f["ruleCode"] == "CL-04" and f["status"] == "open" for f in first["findings"])

    exc = client.post(
        "/exceptions",
        json={
            "contentId": first["id"],
            "contentTitle": "Exception test",
            "contentMeta": "email",
            "brand": "PureGlow",
            "ruleCode": "CL-04",
            "ruleTitle": "No absolute claims",
            "reason": "Approved campaign wording",
            "scope": "All brands",
            "effectiveFrom": "2025-01-01T00:00:00",
            "expiresAt": "2099-01-01T00:00:00",
            "thumb": {"kind": "art", "palette": "lime", "glyph": "leaf"},
            "conditions": "Only for the approved campaign.",
        },
        headers=auth_headers(creator_token),
    )
    assert exc.status_code == 200, exc.text
    approved = client.post(
        f"/exceptions/{exc.json()['id']}/decide",
        json={"decision": "Approved", "conditions": ""},
        headers=auth_headers(manager_token),
    )
    assert approved.status_code == 200, approved.text

    second = client.post("/submissions", json=body, headers=auth_headers(creator_token)).json()
    cl04 = [f for f in second["findings"] if f["ruleCode"] == "CL-04"]
    assert cl04 and cl04[0]["status"] == "accepted_exception"
    assert second["issueCount"] == len([f for f in second["findings"] if f["status"] == "open"])


def test_approve_pending_exception_succeeds(client, users, creator_token, manager_token):
    exc_id = _create_exception(client, creator_token, FUTURE_AT)
    resp = client.post(
        f"/exceptions/{exc_id}/decide",
        json={"decision": "Approved", "conditions": "Note"},
        headers=auth_headers(manager_token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "Approved"
    assert body["decidedById"] == users["manager"]["id"]
