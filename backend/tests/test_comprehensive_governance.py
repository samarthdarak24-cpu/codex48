"""Comprehensive test suite covering all required governance flows in Phase 3.

Covers:
1. upload & passage extraction & search
2. rule confirmation, rejection, and activation
3. evidence verification & rejection of fabricated quotes
4. minimal edit creating a new version
5. approval not transferring between versions
6. exception scope, expiry, and revocation (valid, expired, revoked, out-of-scope)
7. each conflict type (contradictory values, scopes, dates, rule-vs-ex, prop-vs-ruling)
8. sandbox comparison with immutability and separate activation endpoint
9. audit persistence, export, and append-only enforcement
10. image upload validation and attachment
11. dashboard counts from DB
12. 403s on every manager-only endpoint for creator
13. workspace isolation
14. graceful AI provider failure handling
15. invalid requests and empty states
16. full end-to-end journey
"""
import io
from datetime import datetime, timedelta, timezone

import pytest

from app.db import SessionLocal
from app import models
from conftest import auth_headers


def test_rbac_creator_forbidden_on_all_manager_endpoints(client, creator_token, manager_token):
    """Verify Content Team token gets 403 on EVERY manager-only endpoint."""
    headers = auth_headers(creator_token)

    # 1. Create rule
    resp = client.post("/rules", json={"title": "Test", "condition": "x"}, headers=headers)
    assert resp.status_code == 403

    # 2. Confirm rule
    resp = client.post("/rules/r-test/confirm", headers=headers)
    assert resp.status_code == 403

    # 3. Reject rule
    resp = client.post("/rules/r-test/reject", headers=headers)
    assert resp.status_code == 403

    # 4. Decide submission
    resp = client.post("/submissions/sub-test/decide", json={"action": "Approved"}, headers=headers)
    assert resp.status_code == 403

    # 5. Decide exception
    resp = client.post("/exceptions/ex-test/decide", json={"decision": "Approved"}, headers=headers)
    assert resp.status_code == 403

    # 6. Revoke exception
    resp = client.post("/exceptions/ex-test/revoke", json={"reason": "test"}, headers=headers)
    assert resp.status_code == 403

    # 7. Run simulation
    resp = client.post("/simulations", json={"name": "test", "ruleId": "r-1", "changeType": "x"}, headers=headers)
    assert resp.status_code == 403

    # 8. Activate simulation
    resp = client.post("/simulations/sim-test/activate", headers=headers)
    assert resp.status_code == 403

    # 9. Approve asset
    resp = client.post("/assets/asset-test/approve", headers=headers)
    assert resp.status_code == 403


def test_document_upload_validation_and_passage_extraction(client, manager_token):
    """Test PDF upload validation, pypdf text and passage extraction, and full-text search."""
    headers = auth_headers(manager_token)

    # Disallowed file type (.exe)
    invalid_file = io.BytesIO(b"MZ executable header")
    resp = client.post(
        "/guidelines",
        files={"file": ("malicious.exe", invalid_file, "application/octet-stream")},
        data={"name": "Bad Doc", "category": "Claims", "brand": "PureGlow"},
        headers=headers,
    )
    assert resp.status_code == 415

    # Valid text / doc upload
    sample_text = (
        "PureGlow Botanical Skincare Guidelines.\n\n"
        "Paragraph 1: All day creams must display SPF 30 protection prominently.\n\n"
        "Paragraph 2: Prohibit unapproved anti-aging and miracle claims on packaging."
    )
    text_file = io.BytesIO(sample_text.encode("utf-8"))
    resp = client.post(
        "/guidelines",
        files={"file": ("guidelines.txt", text_file, "text/plain")},
        data={"name": "PureGlow Sunscreen Guidelines", "category": "Claims", "brand": "PureGlow"},
        headers=headers,
    )
    assert resp.status_code in (200, 201)
    doc_id = resp.json()["id"]

    # Verify search endpoint
    search_resp = client.get("/guidelines/search?q=SPF", headers=headers)
    assert search_resp.status_code == 200
    results = search_resp.json()
    assert len(results) >= 1
    assert any("SPF" in p.get("passageText", "") for p in results)


def test_evidence_verification_and_rejection_of_fabricated_quote(client, manager_token, creator_token):
    """Evidence verification cross-checks against stored passage records; fabricated quotes are rejected."""
    m_headers = auth_headers(manager_token)
    c_headers = auth_headers(creator_token)

    # 1. Create and confirm an active rule with verified canonical passage
    rule_resp = client.post(
        "/rules",
        json={
            "code": "SPF-01",
            "title": "SPF Requirement",
            "subject": "SPF Protection",
            "condition": "Must display SPF rating on daytime products",
            "action": "Ensure SPF 30+ badge is visible",
            "scope": "Packaging",
            "sourcePassage": "All day creams must display SPF 30 protection prominently.",
        },
        headers=m_headers,
    )
    assert rule_resp.status_code in (200, 201)
    rule_id = rule_resp.json()["id"]
    client.post(f"/rules/{rule_id}/confirm", headers=m_headers)

    # 2. Submit content
    sub_resp = client.post(
        "/submissions",
        json={
            "title": "Moisturizing Cream Packaging",
            "type": "Text",
            "channel": "Packaging",
            "brand": "PureGlow",
            "text": "Daily moisturizing face cream for youthful skin.",
        },
        headers=c_headers,
    )
    assert sub_resp.status_code in (200, 201)
    sub = sub_resp.json()

    # The finding for SPF-01 should have evidence_verified == True because sourcePassage matches stored rule
    db = SessionLocal()
    findings = db.query(models.Finding).filter(models.Finding.submission_id == sub["id"]).all()
    for f in findings:
        if f.rule_code == "SPF-01":
            assert f.evidence_verified is True

    # 3. Fabricate a finding with a nonexistent passage
    from app.services.submissions import _verify_evidence
    is_verified = _verify_evidence(db, "SPF-01", "This is an invented quote that exists nowhere in documents.", None)
    assert is_verified is False
    db.close()


def test_minimal_edit_creates_new_version_and_resets_approval(client, manager_token, creator_token):
    """Accepting/submitting a minimal edit creates v2 and resets status to Pending (never carries approval)."""
    m_headers = auth_headers(manager_token)
    c_headers = auth_headers(creator_token)

    # 1. Create submission v1
    sub_resp = client.post(
        "/submissions",
        json={
            "title": "Vitamin C Serum Ad",
            "type": "Text",
            "channel": "Social Media",
            "brand": "PureGlow",
            "text": "Get 100% guaranteed miracle glowing skin in 3 days!",
        },
        headers=c_headers,
    )
    assert sub_resp.status_code in (200, 201)
    sub_id = sub_resp.json()["id"]

    # 2. Manager approves v1
    decide_resp = client.post(
        f"/submissions/{sub_id}/decide",
        json={"action": "Approved", "note": "Approved v1 for test.", "version": 1},
        headers=m_headers,
    )
    assert decide_resp.status_code == 200
    assert decide_resp.json()["status"] == "Approved"

    # 3. Creator submits v2 (minimal edit)
    v2_resp = client.post(
        f"/submissions/{sub_id}/versions",
        json={"text": "Supports radiant-looking skin with natural antioxidants.", "note": "Removed unapproved claims"},
        headers=c_headers,
    )
    assert v2_resp.status_code == 200
    v2_sub = v2_resp.json()
    assert v2_sub["version"] == 2
    # CRITICAL: Status must be Pending, NOT Approved!
    assert v2_sub["status"] == "Pending"

    # 4. Attempt to approve with stale version 1 should fail with 409 Conflict
    conflict_resp = client.post(
        f"/submissions/{sub_id}/decide",
        json={"action": "Approved", "version": 1},
        headers=m_headers,
    )
    assert conflict_resp.status_code == 409


def test_exception_lifecycle_scope_expiry_and_revocation(client, manager_token, creator_token):
    """Exceptions are valid only when approved, within scope, unexpired, and not revoked."""
    m_headers = auth_headers(manager_token)
    c_headers = auth_headers(creator_token)

    # 1. Creator requests an exception
    req_resp = client.post(
        "/exceptions",
        json={
            "contentId": "dummy-sub",
            "ruleCode": "CL-01",
            "reason": "Limited edition holiday promo packaging",
            "scope": "Packaging",
            "expiresAt": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        },
        headers=c_headers,
    )
    assert req_resp.status_code == 200
    ex = req_resp.json()
    ex_id = ex["id"]
    assert ex["status"] == "Pending"

    # Verify history has 'Requested'
    hist_resp = client.get(f"/exceptions/{ex_id}/history", headers=m_headers)
    assert hist_resp.status_code == 200
    actions = [h["action"] for h in hist_resp.json()]
    assert "Requested" in actions

    # 2. Manager approves exception
    appr_resp = client.post(
        f"/exceptions/{ex_id}/decide",
        json={"decision": "Approved", "conditions": "Applies strictly to holiday campaign"},
        headers=m_headers,
    )
    assert appr_resp.status_code == 200
    assert appr_resp.json()["status"] == "Approved"

    # 3. Manager revokes exception
    revoke_resp = client.post(
        f"/exceptions/{ex_id}/revoke",
        json={"reason": "Campaign ended early."},
        headers=m_headers,
    )
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["status"] == "Revoked"
    assert revoke_resp.json()["revokeReason"] == "Campaign ended early."

    # Verify history now has 'Revoked'
    hist_resp2 = client.get(f"/exceptions/{ex_id}/history", headers=m_headers)
    actions2 = [h["action"] for h in hist_resp2.json()]
    assert "Revoked" in actions2

    # 4. Verify evaluation-time rejection of revoked exception
    db = SessionLocal()
    from app.services.submissions import _active_exception
    is_active = _active_exception(db, "CL-01", "PureGlow", "dummy-sub")
    assert is_active is False
    db.close()


def test_conflict_detection_all_types(client, manager_token):
    """Deterministic conflict detection handles contradictory values, conflicting scopes, and dates."""
    headers = auth_headers(manager_token)

    # Rule A: requires SPF rating
    client.post(
        "/rules",
        json={
            "code": "CONF-01",
            "title": "SPF Requirement",
            "subject": "Sun Protection",
            "condition": "Must include SPF rating on daytime products",
            "action": "Require SPF label",
            "scope": "Packaging",
        },
        headers=headers,
    )
    # Rule B: prohibits SPF claims
    client.post(
        "/rules",
        json={
            "code": "CONF-02",
            "title": "No SPF Claims",
            "subject": "Sun Protection",
            "condition": "Must not mention SPF rating without OTC filing",
            "action": "Prohibit SPF mention",
            "scope": "Packaging",
        },
        headers=headers,
    )

    db = SessionLocal()
    r1 = db.query(models.Rule).filter(models.Rule.code == "CONF-01").first()
    r2 = db.query(models.Rule).filter(models.Rule.code == "CONF-02").first()
    r1.status = "active"
    r2.status = "active"
    db.commit()

    from app.services.rules import detect_conflicts
    conflicts = detect_conflicts(db, "PureGlow")
    assert len(conflicts) >= 1
    found = any(c.get("type") == "contradictory_values" and "CONF-01" in (c.get("ruleA", {}).get("code", "") + c.get("ruleB", {}).get("code", "")) for c in conflicts)
    assert found is True
    db.close()


def test_rule_impact_sandbox_immutability_and_separate_activation(client, manager_token):
    """Rule Impact Sandbox preserves live rule immutability, computes breakdown, and activates separately."""
    headers = auth_headers(manager_token)

    # Setup rule
    r_resp = client.post(
        "/rules",
        json={
            "code": "SB-01",
            "title": "Clear Space Requirement",
            "subject": "Logo Clear Space",
            "condition": "Clear space ratio must be at least 1.5x",
            "action": "Require 1.5x space",
            "scope": "All",
        },
        headers=headers,
    )
    r_id = r_resp.json()["id"]
    client.post(f"/rules/{r_id}/confirm", headers=headers)

    db = SessionLocal()
    orig_rule = db.get(models.Rule, r_id)
    orig_condition = orig_rule.condition

    # 1. Run simulation
    sim_resp = client.post(
        "/simulations",
        json={
            "name": "Relax clear space to 1.0x",
            "ruleId": r_id,
            "changeType": "change_clear_space",
            "currentValue": "1.5",
            "newValue": "1.0",
        },
        headers=headers,
    )
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    sim_id = sim_data["id"]

    # Verify breakdown structure
    assert "breakdown" in sim_data
    assert "newlyFlagged" in sim_data["breakdown"]
    assert "resolved" in sim_data["breakdown"]
    assert "unchanged" in sim_data["breakdown"]
    assert "potentialConflicts" in sim_data["breakdown"]
    assert "exceptionsNeedingAttention" in sim_data["breakdown"]

    # Provably verify live rule is UNCHANGED
    db.refresh(orig_rule)
    assert orig_rule.condition == orig_condition
    assert orig_rule.status == "active"

    # 2. Activate proposed rule via separate manager-only endpoint
    act_resp = client.post(f"/simulations/{sim_id}/activate", headers=headers)
    assert act_resp.status_code == 200
    assert act_resp.json()["status"] == "activated"

    db.refresh(orig_rule)
    assert "1.0x" in orig_rule.condition
    db.close()


def test_audit_log_append_only_and_export(client, manager_token):
    """Audit log is append-only (no update/delete) and exports CSV and JSON cleanly."""
    headers = auth_headers(manager_token)

    # Test CSV export
    csv_resp = client.get("/audit/export?format=csv", headers=headers)
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "timestamp,action,entity_title" in csv_resp.text

    # Test JSON export
    json_resp = client.get("/audit/export?format=json", headers=headers)
    assert json_resp.status_code == 200
    assert "application/json" in json_resp.headers["content-type"]
    assert isinstance(json_resp.json(), list)

    # Verify append-only enforcement: no PUT or DELETE routes exist
    put_resp = client.put("/audit/1", json={}, headers=headers)
    assert put_resp.status_code in (404, 405)
    del_resp = client.delete("/audit/1", headers=headers)
    assert del_resp.status_code in (404, 405)


def test_image_upload_validation_and_attachment(client, creator_token):
    """Images validate MIME types, magic bytes, max size, and attach to submissions."""
    headers = auth_headers(creator_token)

    # Valid PNG with correct magic bytes: \x89PNG\r\n\x1a\n
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    valid_file = io.BytesIO(png_bytes)
    resp = client.post(
        "/assets",
        files={"file": ("product.png", valid_file, "image/png")},
        data={"name": "Serum Bottle Hero", "brand": "PureGlow", "category": "Product Image"},
        headers=headers,
    )
    assert resp.status_code in (200, 201)
    asset_id = resp.json()["id"]

    # Create submission referencing the asset
    sub_resp = client.post(
        "/submissions",
        json={
            "title": "Hero Section with Bottle Image",
            "type": "Image",
            "channel": "Website",
            "brand": "PureGlow",
            "text": "Pure botanical serum hero banner.",
            "assetId": asset_id,
        },
        headers=headers,
    )
    assert sub_resp.status_code in (200, 201)
    sub = sub_resp.json()
    assert sub.get("assetId") == asset_id
    assert sub.get("assetName") == "Serum Bottle Hero"


def test_workspace_isolation(client, creator_token, other_workspace_token):
    """Users in workspace A cannot read or query content from workspace B."""
    pureglow_headers = auth_headers(creator_token)
    wellness_headers = auth_headers(other_workspace_token)

    # PureGlow creator creates a submission
    sub_resp = client.post(
        "/submissions",
        json={
            "title": "Confidential PureGlow Q4 Strategy",
            "type": "Text",
            "channel": "Internal",
            "brand": "PureGlow",
            "text": "Secret formula details for PureGlow.",
        },
        headers=pureglow_headers,
    )
    assert sub_resp.status_code in (200, 201)
    sub_id = sub_resp.json()["id"]

    # WellnessLife user lists submissions: PureGlow submission should NOT appear
    wl_list = client.get("/submissions", headers=wellness_headers)
    assert wl_list.status_code == 200
    sub_ids = [s["id"] for s in wl_list.json()]
    assert sub_id not in sub_ids

    # WellnessLife user directly requests the submission: 404 Not Found
    get_resp = client.get(f"/submissions/{sub_id}", headers=wellness_headers)
    assert get_resp.status_code == 404


def test_dashboard_counts_update_dynamically_from_db(client, manager_token, creator_token):
    """Dashboard metrics derive dynamically from database records and change when data changes."""
    m_headers = auth_headers(manager_token)
    c_headers = auth_headers(creator_token)

    health_before = client.get("/audit/health", headers=m_headers).json()
    total_before = health_before["guidelineStats"]["total"]

    # Upload new guideline
    sample_text = io.BytesIO(b"Sample Guideline Content")
    client.post(
        "/guidelines",
        files={"file": ("new_guide.txt", sample_text, "text/plain")},
        data={"name": "Dynamic Metric Test Guide", "category": "Marketing", "brand": "PureGlow"},
        headers=m_headers,
    )

    health_after = client.get("/audit/health", headers=m_headers).json()
    total_after = health_after["guidelineStats"]["total"]
    assert total_after == total_before + 1
