"""Regression tests for cross-workspace isolation fixes.

Each test creates a second workspace ("OtherCo") and asserts that a user in it
never sees or is affected by "PureGlow" data. Before the fix, /team, /claims,
/guidelines and /rules leaked PureGlow rows to every workspace, and an approved
PureGlow exception could suppress an OtherCo finding.
"""
from datetime import datetime, timedelta, timezone

from conftest import auth_headers, get_token

from app import models
from app.db import SessionLocal
from app.ids import new_id
from app.security import hash_password


def _make_other_user(db):
    db.add(
        models.User(
            id="u_other",
            name="Other User",
            email="other@otherco.test",
            role="manager",
            workspace="OtherCo",
            password_hash=hash_password("precedent"),
        )
    )
    db.commit()


def _other_token(client):
    return get_token(client, "other@otherco.test", "precedent")


def test_team_excludes_other_workspace(client, users):
    db = SessionLocal()
    _make_other_user(db)
    db.close()
    tok = _other_token(client)
    emails = [u["email"] for u in client.get("/team", headers=auth_headers(tok)).json()]
    assert "other@otherco.test" in emails
    assert all(e.endswith("@otherco.test") for e in emails), emails


def test_claims_exclude_other_workspace(client, users):
    db = SessionLocal()
    _make_other_user(db)
    db.add(
        models.ApprovedClaim(
            id=new_id("cl"), workspace="PureGlow", text="PG CLAIM", product="p",
            source="s", scope="z", status="approved",
            approved_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.close()
    tok = _other_token(client)
    texts = [c["text"] for c in client.get("/claims", headers=auth_headers(tok)).json()]
    assert "PG CLAIM" not in texts, texts


def test_claim_created_in_caller_workspace(client, users):
    db = SessionLocal()
    _make_other_user(db)
    db.close()
    tok = _other_token(client)
    r = client.post(
        "/claims",
        json={"text": "OC CLAIM", "product": "p", "source": "s", "scope": "z"},
        headers=auth_headers(tok),
    )
    assert r.status_code == 200, r.text
    db = SessionLocal()
    row = db.get(models.ApprovedClaim, r.json()["id"])
    assert row is not None and row.workspace == "OtherCo"
    db.close()


def test_guidelines_exclude_other_workspace(client, users):
    db = SessionLocal()
    _make_other_user(db)
    db.add(models.GuidelineDoc(id=new_id("gdoc"), workspace="PureGlow", name="PG Doc"))
    db.commit()
    db.close()
    tok = _other_token(client)
    names = [d["name"] for d in client.get("/guidelines", headers=auth_headers(tok)).json()]
    assert "PG Doc" not in names, names


def test_rules_exclude_other_workspace(client, users):
    db = SessionLocal()
    _make_other_user(db)
    db.add(models.Rule(id=new_id("rule"), workspace="PureGlow", code="PG-01", title="PG rule", status="active"))
    db.commit()
    db.close()
    tok = _other_token(client)
    codes = [r["code"] for r in client.get("/rules", headers=auth_headers(tok)).json()]
    assert "PG-01" not in codes, codes


def test_other_workspace_exception_does_not_suppress_finding(client, users):
    db = SessionLocal()
    _make_other_user(db)
    db.add(
        models.Rule(
            id=new_id("rule"), workspace="OtherCo", code="CL-04", title="No superlatives",
            subject="Absolute claim", condition="x", status="active",
            source_passage="Absolute terms require substantiation.",
        )
    )
    db.add(
        models.ExceptionRequest(
            id=new_id("ex"), workspace="PureGlow", code="EX-PG", content_id="",
            content_title="pg", brand="PureGlow", rule_code="CL-04", rule_title="No superlatives",
            reason="pg", scope="All brands", requested_by_id="u_other", status="Approved",
            effective_from=datetime.now(timezone.utc) - timedelta(days=1),
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
    )
    db.commit()
    db.close()
    tok = _other_token(client)
    r = client.post(
        "/submissions",
        json={"title": "t", "type": "Text", "channel": "Email", "brand": "OtherCo", "text": "100% safe"},
        headers=auth_headers(tok),
    )
    assert r.status_code == 200, r.text
    cl04 = [f for f in r.json()["findings"] if f["ruleCode"] == "CL-04"]
    assert cl04 and cl04[0]["status"] == "open", cl04
