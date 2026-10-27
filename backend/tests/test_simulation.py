"""Simulation endpoint tests."""
import pytest

from conftest import auth_headers
from app.db import SessionLocal
from app.models import Rule, Submission


VALID_IMPACTS = {"Compliant", "Needs Review", "Non-Compliant"}


def _seed_rule_and_submission():
    db = SessionLocal()
    rule = Rule(
        id="rule-sim-1",
        code="BR-01",
        title="Approved background colours",
        status="active",
        subject="Brand colour",
        scope="All brands",
    )
    sub = Submission(
        id="sub-sim-1",
        code="SIM-1",
        title="Sim submission",
        excerpt="x",
        type="Text",
        channel="email",
        brand="PureGlow",
        status="Pending",
        creator_id="creator-1",
        version=1,
        issue_count=0,
        priority="Medium",
    )
    db.add_all([rule, sub])
    db.commit()
    db.close()
    return rule.id


def test_simulation_totals_and_impacts(client, manager_token):
    rule_id = _seed_rule_and_submission()
    resp = client.post(
        "/simulations",
        json={
            "name": "Relax BR-01",
            "ruleId": rule_id,
            "changeType": "add_allowed_colour",
            "currentValue": "#7AB93B",
            "newValue": "#FF0000",
        },
        headers=auth_headers(manager_token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    totals = body["totals"]
    assert totals["checked"] > 0
    for item in body["items"]:
        assert item["impact"] in VALID_IMPACTS
