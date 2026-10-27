"""Audit script executing live against the running backend on http://127.0.0.1:8000."""
import httpx
import json

BASE = "http://127.0.0.1:8000"

def run_audit():
    results = {}
    client = httpx.Client(base_url=BASE, timeout=10.0)

    # -------------------------------------------------------------
    # A. Auth & RBAC
    # -------------------------------------------------------------
    # 1. Login manager & creator & invalid
    resp_mgr = client.post("/auth/login", json={"email": "david.kim@pureglow.co", "password": "precedent"})
    mgr_ok = resp_mgr.status_code == 200
    mgr_token = resp_mgr.json().get("token") if mgr_ok else None

    resp_creator = client.post("/auth/login", json={"email": "emily.carter@pureglow.co", "password": "precedent"})
    creator_ok = resp_creator.status_code == 200
    creator_token = resp_creator.json().get("token") if creator_ok else None

    resp_second_ws = client.post("/auth/login", json={"email": "sarah.chen@wellnesslife.co", "password": "precedent"})
    second_ws_ok = resp_second_ws.status_code == 200
    second_ws_token = resp_second_ws.json().get("token") if second_ws_ok else None

    resp_bad = client.post("/auth/login", json={"email": "david.kim@pureglow.co", "password": "wrong"})
    bad_ok = resp_bad.status_code == 401

    # Protected endpoints without token
    resp_unauth = client.get("/auth/me")
    unauth_401 = resp_unauth.status_code == 401

    # Creator token on manager endpoints
    headers_creator = {"Authorization": f"Bearer {creator_token}"}
    headers_mgr = {"Authorization": f"Bearer {mgr_token}"}

    manager_endpoints = [
        ("POST", "/rules", {"title": "Test"}),
        ("POST", "/rules/RULE-TEST/confirm", {}),
        ("POST", "/guidelines", {}),
        ("PATCH", "/guidelines/test/status", {"status": "archived"}),
        ("POST", "/submissions/SUB-1/decide", {"action": "Approved"}),
        ("POST", "/exceptions/EX-1/decide", {"decision": "Approved"}),
        ("POST", "/simulations", {"name": "Test", "ruleId": "r1", "changeType": "add_allowed_colour"}),
        ("POST", "/assets/a1/approve", {}),
    ]
    creator_403s = {}
    for method, ep, payload in manager_endpoints:
        if method == "POST":
            r = client.post(ep, json=payload, headers=headers_creator)
        elif method == "PATCH":
            r = client.patch(ep, json=payload, headers=headers_creator)
        creator_403s[ep] = (r.status_code == 403)

    # CORS check
    cors_resp = client.options("/auth/login", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
    cors_ok = "access-control-allow-origin" in cors_resp.headers

    # Workspace isolation check: can creator see other workspace submissions or guidelines?
    headers_second_ws = {"Authorization": f"Bearer {second_ws_token}"}
    resp_second_subs = client.get("/submissions", headers=headers_second_ws)
    # Does backend filter submissions or guidelines by workspace?
    second_subs = resp_second_subs.json() if resp_second_subs.status_code == 200 else []

    results["A_auth_rbac"] = {
        "manager_login": mgr_ok,
        "creator_login": creator_ok,
        "second_ws_login": second_ws_ok,
        "bad_password_401": bad_ok,
        "unauth_401": unauth_401,
        "creator_403_on_manager_endpoints": creator_403s,
        "cors_configured": cors_ok,
        "workspace_isolated": (resp_second_subs.status_code == 200 and not any(s.get("brand") == "PureGlow" for s in second_subs)),
    }

    # -------------------------------------------------------------
    # B. Guideline Library & Passages
    # -------------------------------------------------------------
    # Check upload validation, passage storage, full-text search
    # Test upload of a text file / invalid file
    dummy_pdf = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF"
    upload_res = client.post(
        "/guidelines",
        data={"name": "Audit Test Guide", "category": "Visual Identity", "brand": "PureGlow"},
        files={"file": ("test.pdf", dummy_pdf, "application/pdf")},
        headers=headers_mgr,
    )
    guideline_upload_ok = upload_res.status_code == 200
    uploaded_doc = upload_res.json() if guideline_upload_ok else {}

    # Check invalid file upload (e.g. .exe or .py)
    invalid_upload_res = client.post(
        "/guidelines",
        data={"name": "Bad File", "category": "Visual Identity"},
        files={"file": ("bad.exe", b"MZ...", "application/x-msdownload")},
        headers=headers_mgr,
    )
    invalid_upload_blocked = invalid_upload_res.status_code in (400, 415, 422)

    # Check if GuidelinePassage table exists or full-text search endpoint exists
    search_resp = client.get("/guidelines/search?q=pureglow", headers=headers_mgr)
    search_endpoint_exists = search_resp.status_code != 404

    # Check manager rule confirm / reject
    rule_create_res = client.post(
        "/rules",
        json={"title": "Audit Rule Draft", "condition": "Audit Condition", "action": "Must comply", "priority": "High"},
        headers=headers_mgr,
    )
    rule_draft = rule_create_res.json() if rule_create_res.status_code == 201 else {}
    rule_id = rule_draft.get("id")
    rule_confirm_res = client.post(f"/rules/{rule_id}/confirm", headers=headers_mgr) if rule_id else None
    rule_confirm_ok = rule_confirm_res.status_code == 200 if rule_confirm_res else False

    # Check reject rule endpoint
    rule_reject_res = client.post(f"/rules/{rule_id}/reject", headers=headers_mgr) if rule_id else None
    rule_reject_exists = rule_reject_res.status_code != 404 if rule_reject_res else False

    results["B_guidelines"] = {
        "upload_ok": guideline_upload_ok,
        "invalid_upload_blocked": invalid_upload_blocked,
        "search_endpoint_exists": search_endpoint_exists,
        "rule_confirm_ok": rule_confirm_ok,
        "rule_reject_exists": rule_reject_exists,
    }

    # -------------------------------------------------------------
    # C. Evidence-Linked Review & Fabricated Quote Check
    # -------------------------------------------------------------
    # Check if findings verify every quote against stored passages
    # Create submission with known text
    sub_res = client.post(
        "/submissions",
        json={"title": "Audit Review Test", "brand": "PureGlow", "text": "This product cures eczema in 24 hours guaranteed."},
        headers=headers_creator,
    )
    sub_ok = sub_res.status_code == 200
    sub_data = sub_res.json() if sub_ok else {}
    findings = sub_data.get("findings", [])

    results["C_evidence"] = {
        "submission_created": sub_ok,
        "findings_count": len(findings),
        "evidence_verified_field_present": any("evidenceVerified" in f for f in findings),
    }

    # -------------------------------------------------------------
    # D. Minimal Edits & Versioning
    # -------------------------------------------------------------
    sub_id = sub_data.get("id")
    v2_res = client.post(
        f"/submissions/{sub_id}/versions",
        json={"text": "This product helps soothe dry skin naturally.", "note": "Applied minimal edit"},
        headers=headers_creator,
    ) if sub_id else None
    v2_ok = v2_res.status_code == 200 if v2_res else False
    v2_data = v2_res.json() if v2_ok else {}
    versions_count = len(v2_data.get("versions", []))
    sub_status_after_v2 = v2_data.get("status")

    results["D_minimal_edits"] = {
        "v2_created": v2_ok,
        "versions_count": versions_count,
        "auto_approved": sub_status_after_v2 == "Approved",  # Should be False!
    }

    # -------------------------------------------------------------
    # E. Version-based approvals
    # -------------------------------------------------------------
    # Approve v2
    decide_res = client.post(
        f"/submissions/{sub_id}/decide",
        json={"action": "Approved", "version": 2, "note": "Looks good in v2"},
        headers=headers_mgr,
    ) if sub_id else None
    decide_ok = decide_res.status_code == 200 if decide_res else False

    # Add v3: Does approval carry over?
    v3_res = client.post(
        f"/submissions/{sub_id}/versions",
        json={"text": "This product cures eczema again.", "note": "v3 regression"},
        headers=headers_creator,
    ) if sub_id else None
    v3_data = v3_res.json() if (v3_res and v3_res.status_code == 200) else {}
    v3_status = v3_data.get("status")

    # Mismatched version decision: decide for v1 when current is v3 -> should be 409
    mismatch_decide = client.post(
        f"/submissions/{sub_id}/decide",
        json={"action": "Approved", "version": 1, "note": "Outdated version"},
        headers=headers_mgr,
    ) if sub_id else None
    mismatch_blocked = mismatch_decide.status_code == 409 if mismatch_decide else False

    results["E_version_approvals"] = {
        "decide_ok": decide_ok,
        "approval_carried_to_new_version": v3_status == "Approved",  # Should be False
        "mismatched_version_409": mismatch_blocked,
    }

    # -------------------------------------------------------------
    # F. Exception rulings (request, approve, revoke, expiry)
    # -------------------------------------------------------------
    ex_res = client.post(
        "/exceptions",
        json={"contentId": sub_id, "ruleCode": "CL-01", "reason": "Test exception", "scope": "PureGlow"},
        headers=headers_creator,
    )
    ex_ok = ex_res.status_code == 200
    ex_data = ex_res.json() if ex_ok else {}
    ex_id = ex_data.get("id")

    # Decide approve
    ex_decide_res = client.post(f"/exceptions/{ex_id}/decide", json={"decision": "Approved"}, headers=headers_mgr)
    ex_approved = ex_decide_res.status_code == 200

    # Revoke check
    ex_revoke_res = client.post(f"/exceptions/{ex_id}/revoke", json={"reason": "Revoked by manager"}, headers=headers_mgr)
    ex_revoke_exists = ex_revoke_res.status_code != 404

    results["F_exceptions"] = {
        "exception_created": ex_ok,
        "exception_approved": ex_approved,
        "exception_revoke_exists": ex_revoke_exists,
    }

    # -------------------------------------------------------------
    # G. Conflict Detection
    # -------------------------------------------------------------
    conflicts_res = client.get("/rules/conflicts", headers=headers_mgr)
    conflicts_ok = conflicts_res.status_code == 200
    conflicts = conflicts_res.json() if conflicts_ok else []

    results["G_conflicts"] = {
        "conflicts_ok": conflicts_ok,
        "conflicts_found": len(conflicts),
    }

    # -------------------------------------------------------------
    # H. Rule Impact Sandbox & Activation
    # -------------------------------------------------------------
    # Get active rule
    rules = client.get("/rules", headers=headers_mgr).json()
    active_rule = next((r for r in rules if r.get("status") == "active"), None)
    sim_res = client.post(
        "/simulations",
        json={
            "name": "Audit Simulation",
            "ruleId": active_rule["id"] if active_rule else "r1",
            "changeType": "add_allowed_colour",
            "currentValue": "#FFFFFF",
            "newValue": "#000000",
        },
        headers=headers_mgr,
    )
    sim_ok = sim_res.status_code == 200
    sim_data = sim_res.json() if sim_ok else {}

    # Check separate activation endpoint
    sim_id = sim_data.get("id")
    activate_res = client.post(f"/simulations/{sim_id}/activate", headers=headers_mgr) if sim_id else None
    sim_activate_endpoint_exists = activate_res.status_code != 404 if activate_res else False

    results["H_sandbox"] = {
        "simulation_ran": sim_ok,
        "activation_endpoint_exists": sim_activate_endpoint_exists,
        "breakdown_keys": list(sim_data.get("totals", {}).keys()),
    }

    # -------------------------------------------------------------
    # I. Audit log & Guideline Health
    # -------------------------------------------------------------
    audit_res = client.get("/audit", headers=headers_mgr)
    audit_ok = audit_res.status_code == 200
    audit_events = audit_res.json() if audit_ok else []

    # Check append-only: does PUT or DELETE /audit exist?
    put_audit = client.put(f"/audit/{audit_events[0]['id']}", json={}, headers=headers_mgr) if audit_events else None
    delete_audit = client.delete(f"/audit/{audit_events[0]['id']}", headers=headers_mgr) if audit_events else None
    audit_immutable = (put_audit.status_code == 405 or put_audit.status_code == 404) and (delete_audit.status_code == 405 or delete_audit.status_code == 404) if audit_events else True

    health_res = client.get("/audit/health", headers=headers_mgr)
    health_ok = health_res.status_code == 200
    health_data = health_res.json() if health_ok else {}

    # Export endpoint
    export_res = client.get("/audit/export", headers=headers_mgr)
    export_exists = export_res.status_code != 404

    results["I_audit"] = {
        "audit_listed": audit_ok,
        "audit_count": len(audit_events),
        "audit_immutable": audit_immutable,
        "health_ok": health_ok,
        "export_exists": export_exists,
    }

    # -------------------------------------------------------------
    # J. Brand / Product Images
    # -------------------------------------------------------------
    dummy_img = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    asset_upload = client.post(
        "/assets",
        data={"name": "Audit Product Serum", "brand": "PureGlow", "category": "Product Image", "notes": "Hero shot"},
        files={"file": ("serum.png", dummy_img, "image/png")},
        headers=headers_mgr,
    )
    asset_upload_ok = asset_upload.status_code == 200
    asset_data = asset_upload.json() if asset_upload_ok else {}
    asset_id = asset_data.get("id")

    # Approve asset
    asset_approve = client.post(f"/assets/{asset_id}/approve", headers=headers_mgr) if asset_id else None
    asset_approve_ok = asset_approve.status_code == 200 if asset_approve else False

    # External research check (when unconfigured)
    research_res = client.post("/assets/research", json={"query": "serum", "brand": "PureGlow"}, headers=headers_mgr)
    research_ok = research_res.status_code == 200
    research_data = research_res.json() if research_ok else {}

    # Upload invalid file type (e.g. .exe or .sh)
    bad_asset_upload = client.post(
        "/assets",
        data={"name": "Bad Image", "brand": "PureGlow"},
        files={"file": ("malware.exe", b"MZ...", "application/x-msdownload")},
        headers=headers_mgr,
    )
    bad_asset_blocked = bad_asset_upload.status_code in (400, 415, 422)

    results["J_images"] = {
        "asset_upload_ok": asset_upload_ok,
        "asset_approve_ok": asset_approve_ok,
        "research_unconfigured_honest": research_data.get("configured") is False,
        "bad_asset_blocked": bad_asset_blocked,
    }

    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    run_audit()
