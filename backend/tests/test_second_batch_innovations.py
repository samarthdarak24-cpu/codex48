"""Unit and integration tests for Second Batch Innovations:
- N10: Approved Snippets Library & Quick-Insert
- N11: False-Positive Feedback Loop
- N12: Expiry Forecast & Pre-Expiry Timeline
- N16: Plain-Language & Hindi Rule Explanations
- N17: What-If Simulation on Exceptions
- N18: User Privacy and Data Controls (GDPR/DPDP Export)
"""
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import pytest

from app.db import SessionLocal
from app import models
from app.ids import new_id


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_n10_list_and_create_approved_snippets(client, manager_token, creator_token):
    """N10: Lists active approved snippets and enforces manager role on create."""
    db = SessionLocal()
    try:
        snp = models.ApprovedSnippet(
            id=new_id("snp"),
            workspace="PureGlow",
            text="100% Recyclable Glass Bottle (Packaging Std §2)",
            category="Claim",
            rule_codes=["CL-03"],
            valid_from=datetime.now(timezone.utc) - timedelta(days=1),
            valid_until=datetime.now(timezone.utc) + timedelta(days=60),
            status="active",
            created_by="Test Manager",
        )
        db.add(snp)
        db.commit()
    finally:
        db.close()

    # Creator can read active snippets
    resp = client.get("/snippets", headers=auth_headers(creator_token))
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(s["text"] == "100% Recyclable Glass Bottle (Packaging Std §2)" for s in data)

    # Creator cannot create snippet (403)
    forbidden_resp = client.post(
        "/snippets",
        json={"text": "Organic Aloe Extract", "category": "Claim"},
        headers=auth_headers(creator_token),
    )
    assert forbidden_resp.status_code == 403

    # Manager creates snippet (200)
    create_resp = client.post(
        "/snippets",
        json={
            "text": "Dermatologically Tested (Study PG-2026)",
            "category": "Claim",
            "rule_codes": ["CL-02"],
        },
        headers=auth_headers(manager_token),
    )
    assert create_resp.status_code == 200
    created = create_resp.json()
    assert created["text"] == "Dermatologically Tested (Study PG-2026)"
    assert created["createdBy"] == "Test Manager"


def test_n11_submit_and_view_finding_feedback(client, manager_token, creator_token):
    """N11: Creator submits dispute; manager reviews flagged feedback reports."""
    db = SessionLocal()
    try:
        sub = models.Submission(
            id=new_id("sub"),
            workspace="PureGlow",
            title="Summer Sun Serum",
            brand="PureGlow",
            status="Pending",
        )
        db.add(sub)
        db.flush()

        finding = models.Finding(
            id=new_id("fnd"),
            submission_id=sub.id,
            rule_code="CL-03",
            rule_title="Only approved product claims",
            severity="High",
            explanation="Product claim not in approved list.",
        )
        db.add(finding)
        db.commit()
        finding_id = finding.id
    finally:
        db.close()

    # Creator submits feedback
    fb_resp = client.post(
        f"/submissions/findings/{finding_id}/feedback",
        json={
            "reason": "rule_unclear",
            "notes": "Phrase matches approved marketing claim from packaging guideline v2.",
        },
        headers=auth_headers(creator_token),
    )
    assert fb_resp.status_code == 200
    fb_data = fb_resp.json()
    assert fb_data["findingId"] == finding_id
    assert fb_data["reason"] == "rule_unclear"

    # Manager views reports
    mgr_resp = client.get("/feedback/reports", headers=auth_headers(manager_token))
    assert mgr_resp.status_code == 200
    reports = mgr_resp.json()
    assert any(r["findingId"] == finding_id for r in reports)


def test_n12_expiry_forecast_calculations(client, manager_token):
    """N12: Expiry forecast aggregates expiring items and generates weekly groups."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        exc = models.ExceptionRequest(
            id=new_id("ex"),
            workspace="PureGlow",
            code="EX-2001",
            content_id="sub-1",
            content_title="Diwali Glow Poster",
            rule_code="COLOR-001",
            reason="Festival background",
            status="Approved",
            expires_at=now + timedelta(days=6),  # Critical 7d!
        )
        db.add(exc)
        db.commit()
    finally:
        db.close()

    resp = client.get("/exceptions/forecast", headers=auth_headers(manager_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "summary" in data
    assert data["summary"]["urgent7d"] >= 1
    assert any(i["code"] == "EX-2001" and i["urgency"] == "critical" for i in data["items"])


def test_n16_plain_language_and_hindi_explanation(client, creator_token):
    """N16: Returns structured plain English and Hindi explanation for finding."""
    db = SessionLocal()
    try:
        sub = models.Submission(id=new_id("sub"), workspace="PureGlow", title="Post")
        db.add(sub)
        db.flush()

        finding = models.Finding(
            id=new_id("fnd"),
            submission_id=sub.id,
            rule_code="CL-03",
            rule_title="Only approved product claims",
            explanation="Unapproved claim detected.",
        )
        db.add(finding)
        db.commit()
        f_id = finding.id
    finally:
        db.close()

    resp = client.get(f"/submissions/findings/{f_id}/explain?lang=hi", headers=auth_headers(creator_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "english" in data
    assert "hindi" in data
    assert "plainExplanation" in data["english"]
    assert "plainExplanation" in data["hindi"]
    assert "स्वीकृत" in data["hindi"]["plainExplanation"] or "दावा" in data["hindi"]["plainExplanation"]


def test_n17_what_if_exception_simulation(client, manager_token):
    """N17: What-if simulation calculates impact of revoking an approved exception."""
    db = SessionLocal()
    try:
        exc = models.ExceptionRequest(
            id=new_id("ex"),
            workspace="PureGlow",
            code="EX-3001",
            rule_code="COLOR-001",
            status="Approved",
            reason="Campaign waiver",
        )
        db.add(exc)
        sub = models.Submission(
            id=new_id("sub"),
            workspace="PureGlow",
            title="Published Campaign Hero",
            status="Approved",
        )
        db.add(sub)
        db.commit()
        ex_id = exc.id
    finally:
        db.close()

    resp = client.post(f"/exceptions/{ex_id}/simulate", headers=auth_headers(manager_token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["exceptionId"] == ex_id
    assert "affectedCount" in data
    assert isinstance(data["items"], list)


def test_n18_user_privacy_data_export(client, creator_token):
    """N18: User exports their personal data package including profile, submissions, comments."""
    resp = client.get("/auth/me/export", headers=auth_headers(creator_token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["exportFormat"] == "Precedent GDPR/DPDP Compliant Data Package v1.0"
    assert "user" in data
    assert data["user"]["email"] == "creator@precedent.test"
    assert "submissions" in data
    assert "comments" in data
    assert "notifications" in data
    assert "auditLogs" in data
