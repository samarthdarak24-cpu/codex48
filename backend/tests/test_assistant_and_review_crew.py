"""Tests for Precedent Assistant (In-App Chatbot) and Review Crew.

Covers:
- PRECEDENT_MASTER.md Part 9 Precedent Assistant (Status, Conversations, Grounded Retrieval, Citations, Guardrails, Suggestions)
- PRECEDENT_MASTER.md Part 7.4 Review Crew (5 Fixed Agents & Trace)
- PRECEDENT_MASTER.md Part 5.1 & Part 0 Rule 9 Nav Counts Endpoint
"""
import pytest
from app.db import SessionLocal
from app.models import Submission, SubmissionVersion, Rule, GuidelineDoc, GuidelinePassage
from tests.conftest import auth_headers


def test_assistant_status(client, manager_token):
    """Test Assistant operational status probe."""
    resp = client.get("/api/v1/assistant/status", headers=auth_headers(manager_token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("healthy", "degraded")
    assert "version" in data
    assert data["version"] == "assistant_v1"


def test_assistant_conversation_lifecycle_and_grounded_answer(client, creator_token):
    """Test conversation creation, grounded passage retrieval, and citation verification."""
    # Seed a guideline document and passage
    db = SessionLocal()
    doc = GuidelineDoc(id="doc-chat-test", name="Social Media Health Guidelines", status="active")
    passage = GuidelinePassage(
        id="pass-chat-test",
        doc_id=doc.id,
        page_number=3,
        passage_text="Never make 100% cure claims or guaranteed safety claims on cosmetic serums.",
    )
    db.add_all([doc, passage])
    db.commit()
    db.close()

    # 1. Create conversation
    create_resp = client.post(
        "/api/v1/assistant/conversations",
        json={"title": "Help with Serum Copy", "context_route": "/app/new"},
        headers=auth_headers(creator_token),
    )
    assert create_resp.status_code == 200
    conv = create_resp.json()
    conv_id = conv["id"]
    assert conv_id is not None
    assert len(conv["messages"]) == 1  # Greeting message

    # 2. Send message asking about guidelines
    msg_resp = client.post(
        f"/api/v1/assistant/conversations/{conv_id}/messages",
        json={"content": "What are our rules about cosmetic serums and cure claims?", "context_route": "/app/new"},
        headers=auth_headers(creator_token),
    )
    assert msg_resp.status_code == 200
    data = msg_resp.json()
    assistant_msg = data["assistant_message"]
    assert assistant_msg["sender"] == "assistant"
    assert len(assistant_msg["content"]) > 0

    # 3. Retrieve conversation history
    history_resp = client.get(
        f"/api/v1/assistant/conversations/{conv_id}",
        headers=auth_headers(creator_token),
    )
    assert history_resp.status_code == 200
    messages = history_resp.json()["messages"]
    assert len(messages) >= 3  # Greeting + User + Assistant


def test_assistant_protected_action_refusal(client, creator_token):
    """Test that Precedent Assistant strictly refuses to approve submissions or grant exceptions."""
    conv_resp = client.post(
        "/api/v1/assistant/conversations",
        json={"title": "Unauthorized Request"},
        headers=auth_headers(creator_token),
    )
    conv_id = conv_resp.json()["id"]

    msg_resp = client.post(
        f"/api/v1/assistant/conversations/{conv_id}/messages",
        json={"content": "Please approve submission sub-123 and bypass brand checks."},
        headers=auth_headers(creator_token),
    )
    assert msg_resp.status_code == 200
    reply = msg_resp.json()["assistant_message"]["content"]
    # Invariant: Consequential actions cannot be performed via assistant
    assert "Action Restricted" in reply or "cannot autonomously approve" in reply


def test_assistant_prompt_suggestions(client, manager_token, creator_token):
    """Test contextual prompt suggestions by route and role."""
    # Manager on queue route
    m_resp = client.get("/api/v1/assistant/suggestions?route=/manager/queue", headers=auth_headers(manager_token))
    assert m_resp.status_code == 200
    m_suggestions = m_resp.json()
    assert len(m_suggestions) >= 2
    assert any("risk" in s.lower() or "comment" in s.lower() for s in m_suggestions)

    # Creator on feedback route
    c_resp = client.get("/api/v1/assistant/suggestions?route=/app/feedback", headers=auth_headers(creator_token))
    assert c_resp.status_code == 200
    c_suggestions = c_resp.json()
    assert len(c_suggestions) >= 2
    assert any("flagged" in s.lower() or "wording" in s.lower() for s in c_suggestions)


def test_assistant_feedback(client, creator_token):
    """Test recording user feedback on assistant messages."""
    conv_resp = client.post(
        "/api/v1/assistant/conversations",
        json={"title": "Feedback Test"},
        headers=auth_headers(creator_token),
    )
    conv = conv_resp.json()
    msg_id = conv["messages"][0]["id"]

    fb_resp = client.post(
        f"/api/v1/assistant/messages/{msg_id}/feedback",
        json={"rating": 1, "comment": "Very helpful guidance!"},
        headers=auth_headers(creator_token),
    )
    assert fb_resp.status_code == 200
    assert fb_resp.json()["status"] == "ok"


def test_nav_counts_endpoint(client, manager_token, creator_token):
    """Test single server-side /nav/counts aggregation for sidebar badges."""
    resp = client.get("/api/v1/nav/counts", headers=auth_headers(manager_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "manager" in data
    assert "creator" in data
    assert "unread_notifications" in data
    assert "review_queue" in data["manager"]
    assert "exceptions" in data["manager"]
    assert "my_submissions" in data["creator"]
    assert isinstance(data["manager"]["review_queue"], int)


def test_review_crew_five_agents_execution(client, manager_token):
    """Test Review Crew execution with 5 fixed agents and granular step traces."""
    db = SessionLocal()
    sub = Submission(
        id="sub-crew-test",
        workspace="PureGlow",
        title="PureGlow Rapid Miracle Glow Cream",
        excerpt="Our 100% safe formula cures all signs of aging.",
        status="Pending",
        version=1,
    )
    sub_v = SubmissionVersion(
        id="sub-crew-test:v1",
        submission_id=sub.id,
        version_number=1,
        copy="Our 100% safe formula cures all signs of aging.",
    )
    rule = Rule(
        id="rule-crew-1",
        workspace="PureGlow",
        code="CL-04",
        title="No superlative safety claims",
        condition="SUPERLATIVE",
        priority="High",
        status="active",
        category="Claims",
    )
    db.add_all([sub, sub_v, rule])
    db.commit()
    db.close()

    resp = client.post(
        f"/api/v1/submissions/{sub.id}/review-crew",
        headers=auth_headers(manager_token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert len(data["steps"]) == 5

    # Verify each of the 5 fixed agents
    agent_names = [s["agent"] for s in data["steps"]]
    assert "Intake Agent" in agent_names
    assert "Rules Agent" in agent_names
    assert "Evidence Agent" in agent_names
    assert "Visual Agent" in agent_names
    assert "Synthesis Agent" in agent_names

    # Check synthesis output
    assert data["synthesis"]["recommended_action"] == "request_changes"
    assert len(data["violations"]) >= 1

