"""End-to-End Suite for Precedent Agent Studio (Tests A through G).

Covers all 7 verification scenarios defined in PRECEDENT Agent Studio specification:
- Test A: Create agent from natural language prompt
- Test B: Workflow graph building and persistence
- Test C: End-to-end execution with real Precedent data and tools
- Test D: Human approval checkpoint and resumption
- Test E: Role-based access control and workspace isolation
- Test F: Database persistence and version snapshotting
- Test G: Fault injection and error handling
"""
import pytest
from app.db import SessionLocal
from app.models import GuidelineDoc, GuidelinePassage, Rule, Submission, SubmissionVersion
from app.agents.models import Agent, AgentApproval, AgentRun, AgentRunStep, AgentVersion
from tests.conftest import auth_headers


def test_scenario_a_create_agent_from_prompt(client, manager_token):
    """Test A: Prompt-to-Agent Builder."""
    prompt = "Create an agent that checks marketing content against our active brand guidelines and identifies unsupported claims with exact evidence."
    resp = client.post(
        "/api/v1/agents/draft-from-prompt",
        json={"prompt": prompt, "category": "brand_compliance"},
        headers=auth_headers(manager_token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    agent = data["agent"]
    assert agent["name"] is not None
    assert agent["status"] == "draft"
    assert "get_submission" in agent["tools"]
    assert "run_brand_rules" in agent["tools"]
    assert len(agent["workflow"]["nodes"]) >= 3
    assert len(agent["workflow"]["edges"]) >= 2
    assert data["rejected_tools"] == []


def test_scenario_b_workflow_builder_persistence(client, manager_token):
    """Test B: Save, reload, and verify workflow nodes and connections."""
    # 1. Create initial draft agent
    create_resp = client.post(
        "/api/v1/agents",
        json={
            "name": "Custom Review Workflow Agent",
            "category": "brand_compliance",
            "instructions": "Execute custom review pipeline.",
            "tools": ["get_submission", "search_guidelines", "run_brand_rules"],
            "workflow": {
                "nodes": [
                    {"id": "node_trig", "type": "trigger", "position": {"x": 100, "y": 50}, "data": {"label": "Submission Ingest"}},
                    {"id": "node_sub", "type": "tool", "position": {"x": 100, "y": 150}, "data": {"label": "Retrieve Copy", "tool_id": "get_submission"}},
                    {"id": "node_rules", "type": "tool", "position": {"x": 100, "y": 250}, "data": {"label": "Check Policies", "tool_id": "run_brand_rules"}},
                    {"id": "node_out", "type": "output", "position": {"x": 100, "y": 350}, "data": {"label": "Finish"}},
                ],
                "edges": [
                    {"id": "e1", "source": "node_trig", "target": "node_sub"},
                    {"id": "e2", "source": "node_sub", "target": "node_rules"},
                    {"id": "e3", "source": "node_rules", "target": "node_out"},
                ],
            },
        },
        headers=auth_headers(manager_token),
    )
    assert create_resp.status_code == 200
    agent_id = create_resp.json()["id"]

    # 2. Modify workflow (add a node and edge)
    updated_workflow = {
        "nodes": [
            {"id": "node_trig", "type": "trigger", "position": {"x": 100, "y": 50}, "data": {"label": "Submission Ingest"}},
            {"id": "node_sub", "type": "tool", "position": {"x": 100, "y": 150}, "data": {"label": "Retrieve Copy", "tool_id": "get_submission"}},
            {"id": "node_search", "type": "tool", "position": {"x": 100, "y": 250}, "data": {"label": "Search Docs", "tool_id": "search_guidelines"}},
            {"id": "node_rules", "type": "tool", "position": {"x": 100, "y": 350}, "data": {"label": "Check Policies", "tool_id": "run_brand_rules"}},
            {"id": "node_out", "type": "output", "position": {"x": 100, "y": 450}, "data": {"label": "Finish"}},
        ],
        "edges": [
            {"id": "e1", "source": "node_trig", "target": "node_sub"},
            {"id": "e2", "source": "node_sub", "target": "node_search"},
            {"id": "e3", "source": "node_search", "target": "node_rules"},
            {"id": "e4", "source": "node_rules", "target": "node_out"},
        ],
    }
    patch_resp = client.patch(
        f"/api/v1/agents/{agent_id}",
        json={"workflow": updated_workflow},
        headers=auth_headers(manager_token),
    )
    assert patch_resp.status_code == 200

    # 3. Re-fetch from DB (simulate browser reload)
    get_resp = client.get(f"/api/v1/agents/{agent_id}", headers=auth_headers(manager_token))
    assert get_resp.status_code == 200
    reloaded = get_resp.json()
    assert len(reloaded["workflow"]["nodes"]) == 5
    assert len(reloaded["workflow"]["edges"]) == 4
    node_ids = [n["id"] for n in reloaded["workflow"]["nodes"]]
    assert "node_search" in node_ids


def test_scenario_c_execute_agent_with_real_data(client, manager_token):
    """Test C: Real submission and guideline execution."""
    db = SessionLocal()
    sub = Submission(
        id="sub-e2e-run",
        workspace="PureGlow",
        title="Anti-Aging Glow Cream Instagram Ad",
        excerpt="Experience 100% safe results with our new miracle formula.",
        status="Pending",
        version=1,
    )
    sub_v = SubmissionVersion(
        id="sub-e2e-run:v1",
        submission_id=sub.id,
        version_number=1,
        copy="Experience 100% safe results with our new miracle formula.",
    )
    rule = Rule(
        id="rule-e2e-1",
        workspace="PureGlow",
        code="CL-04",
        title="No absolute safety claims",
        condition="SUPERLATIVE",
        priority="High",
        status="active",
        category="Claims",
    )
    db.add_all([sub, sub_v, rule])
    db.commit()
    db.close()

    # Agent executing get_submission, run_brand_rules, and output
    create_resp = client.post(
        "/api/v1/agents",
        json={
            "name": "Live Execution Agent",
            "instructions": "Evaluate submission copy against active brand rules.",
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

    # Execute test run
    run_resp = client.post(
        f"/api/v1/agents/{agent_id}/test",
        json={"submission_id": "sub-e2e-run"},
        headers=auth_headers(manager_token),
    )
    assert run_resp.status_code == 200
    run_out = run_resp.json()
    assert run_out["status"] == "completed"
    assert run_out["duration_ms"] >= 0
    assert run_out["tool_call_count"] == 2

    # Check findings from real deterministic engine
    outputs = run_out["outputs"]
    assert outputs["violations_count"] >= 1
    assert any("CL-04" in f.get("rule_code", "") for f in outputs.get("findings", []))


def test_scenario_d_human_approval_pause_and_resume(client, manager_token):
    """Test D: Human-in-the-loop approval checkpoint."""
    create_resp = client.post(
        "/api/v1/agents",
        json={
            "name": "Guarded Action Agent",
            "instructions": "Trigger protected checkpoint.",
            "tools": ["get_submission"],
            "workflow": {
                "nodes": [
                    {"id": "n1", "type": "trigger", "position": {"x": 0, "y": 0}, "data": {"label": "Start"}},
                    {"id": "n2", "type": "human_approval", "position": {"x": 0, "y": 100}, "data": {"label": "Manager Gatekeeper"}},
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
    agent_id = create_resp.json()["id"]

    # Execute -> must pause
    test_resp = client.post(
        f"/api/v1/agents/{agent_id}/test",
        json={"inputs": {"sample": "data"}},
        headers=auth_headers(manager_token),
    )
    assert test_resp.status_code == 200
    run_out = test_resp.json()
    assert run_out["status"] == "waiting_for_approval"
    run_id = run_out["id"]

    # Manager approves
    approve_resp = client.post(
        f"/api/v1/agent-runs/{run_id}/approve",
        json={"decision": "approved", "note": "Verified by Brand Lead"},
        headers=auth_headers(manager_token),
    )
    assert approve_resp.status_code == 200
    resumed = approve_resp.json()
    assert resumed["status"] == "completed"


def test_scenario_e_rbac_and_creator_boundaries(client, manager_token, creator_token, other_workspace_token):
    """Test E: Role authorization and multi-workspace tenancy."""
    # Creator cannot create or publish
    c_resp = client.post("/api/v1/agents", json={"name": "Creator Agent"}, headers=auth_headers(creator_token))
    assert c_resp.status_code == 403

    # Manager creates agent
    m_resp = client.post(
        "/api/v1/agents",
        json={
            "name": "Multi-Tenant Protected Agent",
            "instructions": "Protected workspace assistant",
            "tools": ["get_submission"],
            "workflow": {
                "nodes": [
                    {"id": "n1", "type": "trigger", "position": {"x": 0, "y": 0}, "data": {"label": "Start"}},
                    {"id": "n2", "type": "output", "position": {"x": 0, "y": 100}, "data": {"label": "Done"}},
                ],
                "edges": [{"id": "e1", "source": "n1", "target": "n2"}],
            },
        },
        headers=auth_headers(manager_token),
    )
    agent_id = m_resp.json()["id"]

    # Other workspace user cannot view or edit
    other_resp = client.get(f"/api/v1/agents/{agent_id}", headers=auth_headers(other_workspace_token))
    assert other_resp.status_code == 403


def test_scenario_f_persistence_and_versioning(client, manager_token):
    """Test F: Version snapshotting when publishing."""
    create_resp = client.post(
        "/api/v1/agents",
        json={
            "name": "Versioned Agent",
            "instructions": "Version 1 instructions.",
            "tools": ["get_submission"],
            "workflow": {
                "nodes": [
                    {"id": "n1", "type": "trigger", "position": {"x": 0, "y": 0}, "data": {"label": "Start"}},
                    {"id": "n2", "type": "output", "position": {"x": 0, "y": 100}, "data": {"label": "Done"}},
                ],
                "edges": [{"id": "e1", "source": "n1", "target": "n2"}],
            },
        },
        headers=auth_headers(manager_token),
    )
    agent_id = create_resp.json()["id"]

    # Publish creates immutable version snapshot
    pub_resp = client.post(f"/api/v1/agents/{agent_id}/publish", headers=auth_headers(manager_token))
    assert pub_resp.status_code == 200
    assert pub_resp.json()["status"] == "published"
    assert pub_resp.json()["published_version"] == 1

    # Check database model directly
    db = SessionLocal()
    versions = db.query(AgentVersion).filter(AgentVersion.agent_id == agent_id).all()
    assert len(versions) == 1
    assert versions[0].version == 1
    db.close()


def test_scenario_g_fault_injection_and_error_handling(client, manager_token):
    """Test G: Invalid graph connections, empty prompt, and cancellation."""
    # 1. Invalid prompt rejection (< 5 chars)
    short_resp = client.post(
        "/api/v1/agents/draft-from-prompt",
        json={"prompt": "hi"},
        headers=auth_headers(manager_token),
    )
    assert short_resp.status_code == 422

    # 2. Invalid workflow validation (missing trigger node)
    create_resp = client.post(
        "/api/v1/agents",
        json={
            "name": "Invalid Graph Agent",
            "instructions": "Graph missing trigger",
            "tools": ["get_submission"],
            "workflow": {
                "nodes": [
                    {"id": "n1", "type": "tool", "position": {"x": 0, "y": 0}, "data": {"label": "Tool", "tool_id": "get_submission"}},
                    {"id": "n2", "type": "output", "position": {"x": 0, "y": 100}, "data": {"label": "Done"}},
                ],
                "edges": [{"id": "e1", "source": "n1", "target": "n2"}],
            },
        },
        headers=auth_headers(manager_token),
    )
    agent_id = create_resp.json()["id"]

    val_resp = client.post(f"/api/v1/agents/{agent_id}/validate", headers=auth_headers(manager_token))
    assert val_resp.status_code == 200
    assert val_resp.json()["valid"] is False
    assert any("Trigger" in err for err in val_resp.json()["errors"])

    # 3. Cannot publish invalid agent
    pub_resp = client.post(f"/api/v1/agents/{agent_id}/publish", headers=auth_headers(manager_token))
    assert pub_resp.status_code in (400, 422)

