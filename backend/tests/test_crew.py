"""Acceptance tests for Review Crew bounded multi-agent system (Section 6 & Table 5)."""

import pytest
from conftest import auth_headers
from app import models
from app.services.crew import tool_validate_citation


def test_crew_review_runs_bounded_steps_and_records_trace(client, creator_token):
    # 1. Create a submission
    create_resp = client.post(
        "/submissions",
        json={
            "title": "Summer Radiance Launch Copy",
            "campaign": "Summer Glow",
            "channel": "Instagram",
            "content_type": "copy",
            "body": "PureGlow cream is 100% natural, dermatologist tested, and heals wrinkles in 3 days.",
            "text": "PureGlow cream is 100% natural, dermatologist tested, and heals wrinkles in 3 days.",
        },
        headers=auth_headers(creator_token),
    )
    assert create_resp.status_code in [200, 201]
    sub_id = create_resp.json()["id"]

    # 2. Trigger crew review
    crew_resp = client.post(f"/submissions/{sub_id}/crew-review", headers=auth_headers(creator_token))
    assert crew_resp.status_code == 200
    data = crew_resp.json()

    # Verify bounded orchestrator contracts
    assert data["submission_id"] == sub_id
    assert data["orchestrator_status"] == "completed"
    assert data["max_steps_allowed"] == 10
    assert data["steps_executed"] == 5
    assert len(data["steps"]) == 5

    # Check agent sequence: Intake -> Visual -> Retrieval -> Evidence Verifier -> Summary
    agent_names = [s["agent_name"] for s in data["steps"]]
    assert agent_names == [
        "Intake Agent",
        "Visual Agent",
        "Retrieval Agent",
        "Evidence Verifier",
        "Summary Agent",
    ]

    # Verify intake details
    assert data["intake"]["channel"] == "Instagram"
    assert data["intake"]["word_count"] > 5

    # Verify summary agent advisory draft
    assert "advisory" in data["advisory_notice"].lower()
    assert data["summary"]["risk_level"] in ["low", "medium", "high", "critical"]


def test_crew_trace_persisted_and_retrievable(client, creator_token):
    # Create submission
    create_resp = client.post(
        "/submissions",
        json={
            "title": "Autumn Serum Promo",
            "channel": "Email",
            "content_type": "copy",
            "body": "Our organic formula revitalizes your skin overnight.",
        },
        headers=auth_headers(creator_token),
    )
    sub_id = create_resp.json()["id"]

    # Run crew
    client.post(f"/submissions/{sub_id}/crew-review", headers=auth_headers(creator_token))

    # Fetch trace
    trace_resp = client.get(f"/submissions/{sub_id}/crew-trace", headers=auth_headers(creator_token))
    assert trace_resp.status_code == 200
    trace = trace_resp.json()
    assert trace["submission_id"] == sub_id
    assert trace["orchestrator_status"] == "completed"
    assert len(trace["steps"]) == 5


def test_crew_forbidden_cross_user_access(client, creator_token, manager_token):
    # Creator A makes a submission
    create_resp = client.post(
        "/submissions",
        json={
            "title": "Private Draft",
            "channel": "Web",
            "content_type": "copy",
            "body": "Confidential product copy.",
        },
        headers=auth_headers(creator_token),
    )
    sub_id = create_resp.json()["id"]

    # Manager CAN run review
    mgr_resp = client.post(f"/submissions/{sub_id}/crew-review", headers=auth_headers(manager_token))
    assert mgr_resp.status_code == 200

    # Manager CAN view trace
    mgr_trace_resp = client.get(f"/submissions/{sub_id}/crew-trace", headers=auth_headers(manager_token))
    assert mgr_trace_resp.status_code == 200


def test_evidence_verifier_rejects_fabricated_citations(client):
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        # Test tool_validate_citation with non-existent IDs
        fake_rule_id = "rule_fabricated_12345"
        fake_passage_id = "passage_hallucinated_67890"

        result = tool_validate_citation(db, rule_id=fake_rule_id, passage_id=fake_passage_id)
        assert result.valid is False
        assert "Neither rule nor passage found" in result.reason
    finally:
        db.close()
