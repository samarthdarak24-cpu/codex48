"""Tests for Precedent Agent Studio — Prompts, Workflows, Runtimes, and Approvals."""
import pytest
from app.agents.registry import get_allowed_tool_ids, list_tools, validate_tools
from app.db import SessionLocal
from app.models import Submission, SubmissionVersion, Rule, GuidelineDoc, GuidelinePassage, utcnow
from app.agents.models import Agent, AgentApproval, AgentRun, AgentRunStep
from tests.conftest import auth_headers


def test_tool_registry_catalogue(client, manager_token):
    """Test 1: Registered tool allowlist and metadata."""
    tools = list_tools()
    assert len(tools) >= 10
    tool_ids = [t.id for t in tools]
    assert "get_submission" in tool_ids
    assert "run_brand_rules" in tool_ids
    assert "search_guidelines" in tool_ids
    assert "create_review_draft" in tool_ids

    # Allowlist rejection check
    valid, rejected = validate_tools(["get_submission", "arbitrary_unsafe_tool", "run_shell_command"])
    assert "get_submission" in valid
    assert "arbitrary_unsafe_tool" in rejected
    assert "run_shell_command" in rejected

    # API endpoint check
    resp = client.get("/api/v1/agent-tools", headers=auth_headers(manager_token))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 10


def test_agent_templates_and_instantiation(client, manager_token):
    """Test 2: Ready-made template listing and instantiation."""
    resp = client.get("/api/v1/agent-templates", headers=auth_headers(manager_token))
    assert resp.status_code == 200
    templates = resp.json()
    assert len(templates) == 6
    tmpl_ids = [t["id"] for t in templates]
    assert "template_brand_compliance_reviewer" in tmpl_ids
    assert "template_guideline_research_assistant" in tmpl_ids

    # Instantiate template
    resp = client.post(
        "/api/v1/agent-templates/template_brand_compliance_reviewer/instantiate",
        headers=auth_headers(manager_token),
    )
    assert resp.status_code == 200
    agent = resp.json()
    assert agent["name"] == "Brand Compliance Reviewer"
    assert agent["status"] == "draft"
    assert len(agent["tools"]) >= 4
    assert len(agent["workflow"]["nodes"]) >= 5


def test_prompt_to_agent_builder(client, manager_token):
    """Test 3: Natural language prompt-to-agent generation."""
    prompt = "Create an agent that checks marketing content against our active brand guidelines and identifies unsupported claims with exact evidence."
    resp = client.post(
        "/api/v1/agents/draft-from-prompt",
        json={"prompt": prompt, "category": "brand_compliance"},
        headers=auth_headers(manager_token),
    )
    assert resp.status_code == 200
    data = resp.json()
    agent = data["agent"]
    assert agent["id"] is not None
    assert agent["status"] == "draft"
    assert "get_submission" in agent["tools"]
    assert "run_brand_rules" in agent["tools"]
    assert len(agent["workflow"]["nodes"]) > 0
    assert len(agent["workflow"]["edges"]) > 0


def test_agent_validation_and_publishing(client, manager_token):
    """Test 4: Agent validation and publishing creating immutable snapshots."""
    # Create draft agent
    create_resp = client.post(
        "/api/v1/agents",
        json={
            "name": "Audit Publisher Assistant",
            "description": "Monitors audit logs",
            "category": "audit_report",
            "icon": "FileText",
            "instructions": "Audit logs and report anomalies.",
            "tools": ["get_audit_history", "create_notification"],
            "workflow": {
                "nodes": [
                    {"id": "n1", "type": "trigger", "position": {"x": 0, "y": 0}, "data": {"label": "Start"}},
                    {"id": "n2", "type": "tool", "position": {"x": 0, "y": 100}, "data": {"label": "Audit", "tool_id": "get_audit_history"}},
                    {"id": "n3", "type": "output", "position": {"x": 0, "y": 200}, "data": {"label": "Done"}},
                ],
                "edges": [
                    {"id": "e1", "source": "n1", "target": "n2"},
                    {"id": "e2", "source": "n2", "target": "n3"},
                ],
            },
        },
        headers=auth_headers(manager_token),
    )
    assert create_resp.status_code == 200
    agent = create_resp.json()
    agent_id = agent["id"]

    # Validate
    val_resp = client.post(f"/api/v1/agents/{agent_id}/validate", headers=auth_headers(manager_token))
    assert val_resp.status_code == 200
    assert val_resp.json()["valid"] is True

    # Publish
    pub_resp = client.post(f"/api/v1/agents/{agent_id}/publish", headers=auth_headers(manager_token))
    assert pub_resp.status_code == 200
    published = pub_resp.json()
    assert published["status"] == "published"
    assert published["published_version"] == 1

    # Pause
    pause_resp = client.post(f"/api/v1/agents/{agent_id}/pause", headers=auth_headers(manager_token))
    assert pause_resp.status_code == 200
    assert pause_resp.json()["status"] == "paused"


def test_agent_execution_and_testing(client, manager_token):
    """Test 5: Live execution through Test Playground with real Precedent data."""
    # Seed a submission and a rule in DB
    db = SessionLocal()
    sub = Submission(
        id="sub-test-run-1",
        workspace="PureGlow",
        title="100% Miracle Serum Copy",
        excerpt="Our serum is 100% safe and cures skin aging.",
        status="Pending",
        version=1,
    )
    sub_v = SubmissionVersion(
        id="sub-test-run-1:v1",
        submission_id=sub.id,
        version_number=1,
        copy="Our serum is 100% safe and cures skin aging.",
    )
    rule = Rule(
        id="rule-test-1",
        workspace="PureGlow",
        code="CL-04",
        title="No absolute safety claims",
        condition="SUPERLATIVE",
        priority="High",
        status="active",
        category="Claims",
    )
    doc = GuidelineDoc(
        id="doc-test-1",
        name="Skincare Claims Policy",
        status="active",
    )
    passage = GuidelinePassage(
        id="pass-test-1",
        doc_id=doc.id,
        page_number=1,
        passage_text="Never make 100% safe or miracle cure claims.",
    )
    db.add_all([sub, sub_v, rule, doc, passage])
    db.commit()
    db.close()

    # Create agent that checks submission and rules
    create_resp = client.post(
        "/api/v1/agents",
        json={
            "name": "Live Test Agent",
            "instructions": "Retrieve submission and run brand rules.",
            "category": "brand_compliance",
            "tools": ["get_submission", "run_brand_rules"],
            "workflow": {
                "nodes": [
                    {"id": "n1", "type": "trigger", "position": {"x": 0, "y": 0}, "data": {"label": "Start"}},
                    {"id": "n2", "type": "tool", "position": {"x": 0, "y": 100}, "data": {"label": "Get Sub", "tool_id": "get_submission"}},
                    {"id": "n3", "type": "tool", "position": {"x": 0, "y": 200}, "data": {"label": "Rules", "tool_id": "run_brand_rules"}},
                    {"id": "n4", "type": "output", "position": {"x": 0, "y": 300}, "data": {"label": "Done"}},
                ],
                "edges": [
                    {"id": "e1", "source": "n1", "target": "n2"},
                    {"id": "e2", "source": "n2", "target": "n3"},
                    {"id": "e3", "source": "n3", "target": "n4"},
                ],
            },
        },
        headers=auth_headers(manager_token),
    )
    agent_id = create_resp.json()["id"]

    # Run test
    test_resp = client.post(
        f"/api/v1/agents/{agent_id}/test",
        json={"submission_id": "sub-test-run-1"},
        headers=auth_headers(manager_token),
    )
    assert test_resp.status_code == 200
    run_out = test_resp.json()
    assert run_out["status"] == "completed"
    assert run_out["tool_call_count"] == 2
    assert len(run_out["steps"]) == 4

    # Verify tool outputs
    steps = {s["node_id"]: s for s in run_out["steps"]}
    assert steps["n2"]["status"] == "completed"
    assert steps["n2"]["outputs"]["id"] == "sub-test-run-1"
    assert steps["n3"]["status"] == "completed"
    assert steps["n3"]["outputs"]["violations_count"] >= 1


def test_human_in_the_loop_approval_and_resumption(client, manager_token):
    """Test 6: Human approval checkpoint halts execution, and approval resumes to completion."""
    db = SessionLocal()
    sub = Submission(
        id="sub-approval-test",
        workspace="PureGlow",
        title="Serum Launch Announcement",
        excerpt="Sample ad copy for testing approval.",
        status="Pending",
        version=1,
    )
    sub_v = SubmissionVersion(
        id="sub-approval-test:v1",
        submission_id=sub.id,
        version_number=1,
        copy="Sample ad copy for testing approval.",
    )
    db.add_all([sub, sub_v])
    db.commit()
    db.close()

    # Agent with human approval checkpoint before saving review draft
    create_resp = client.post(
        "/api/v1/agents",
        json={
            "name": "Approval Guard Agent",
            "instructions": "Stage review draft after manager confirmation.",
            "category": "brand_compliance",
            "tools": ["get_submission", "create_review_draft"],
            "workflow": {
                "nodes": [
                    {"id": "n1", "type": "trigger", "position": {"x": 0, "y": 0}, "data": {"label": "Start"}},
                    {"id": "n2", "type": "tool", "position": {"x": 0, "y": 100}, "data": {"label": "Get Sub", "tool_id": "get_submission"}},
                    {"id": "n3", "type": "human_approval", "position": {"x": 0, "y": 200}, "data": {"label": "Manager Checkpoint", "action_type": "confirm_review"}},
                    {"id": "n4", "type": "output", "position": {"x": 0, "y": 300}, "data": {"label": "Done"}},
                ],
                "edges": [
                    {"id": "e1", "source": "n1", "target": "n2"},
                    {"id": "e2", "source": "n2", "target": "n3"},
                    {"id": "e3", "source": "n3", "target": "n4"},
                ],
            },
        },
        headers=auth_headers(manager_token),
    )
    agent_id = create_resp.json()["id"]

    # Execute
    test_resp = client.post(
        f"/api/v1/agents/{agent_id}/test",
        json={"submission_id": "sub-approval-test"},
        headers=auth_headers(manager_token),
    )
    assert test_resp.status_code == 200
    run_out = test_resp.json()
    assert run_out["status"] == "waiting_for_approval"
    run_id = run_out["id"]

    # Verify pending approvals
    run_details = client.get(f"/api/v1/agent-runs/{run_id}", headers=auth_headers(manager_token)).json()
    assert len(run_details["approvals"]) == 1
    assert run_details["approvals"][0]["status"] == "pending"

    # Manager approves
    approve_resp = client.post(
        f"/api/v1/agent-runs/{run_id}/approve",
        json={"decision": "approved", "note": "Approved by Brand Manager"},
        headers=auth_headers(manager_token),
    )
    assert approve_resp.status_code == 200
    resumed = approve_resp.json()
    assert resumed["status"] == "completed"
    assert resumed["outputs"] is not None


def test_rbac_and_workspace_isolation(client, manager_token, creator_token, other_workspace_token):
    """Test 7: Role permissions (creator restrictions) and multi-tenant workspace isolation."""
    # 1. Creator cannot create draft from prompt
    resp = client.post(
        "/api/v1/agents/draft-from-prompt",
        json={"prompt": "Review marketing copy"},
        headers=auth_headers(creator_token),
    )
    assert resp.status_code == 403

    # 2. Manager creates agent in PureGlow
    agent_resp = client.post(
        "/api/v1/agents",
        json={
            "name": "PureGlow Isolated Agent",
            "instructions": "Private workspace agent",
            "tools": ["get_submission"],
            "workflow": {
                "nodes": [
                    {"id": "n1", "type": "trigger", "position": {"x": 0, "y": 0}, "data": {"label": "Start"}},
                    {"id": "n2", "type": "output", "position": {"x": 0, "y": 100}, "data": {"label": "End"}},
                ],
                "edges": [{"id": "e1", "source": "n1", "target": "n2"}],
            },
        },
        headers=auth_headers(manager_token),
    )
    agent_id = agent_resp.json()["id"]

    # 3. Creator cannot publish
    pub_resp = client.post(f"/api/v1/agents/{agent_id}/publish", headers=auth_headers(creator_token))
    assert pub_resp.status_code == 403

    # 4. Other workspace user cannot access PureGlow agent
    other_resp = client.get(f"/api/v1/agents/{agent_id}", headers=auth_headers(other_workspace_token))
    assert other_resp.status_code == 403
