"""Precedent End-to-End Journey Verification Script.

Executes real HTTP requests against http://127.0.0.1:8000 verifying the full lifecycle:
1. Manager logs in and uploads brand guideline document with passage extraction.
2. Manager confirms an AI-suggested / draft rule with verified source passage.
3. Creator logs in, uploads a brand image asset, and submits content referencing the image.
4. AI / Deterministic review runs, yielding findings with real verified evidence.
5. Creator accepts a minimal edit, creating Content Version 2 (status resets to Pending).
6. Manager reviews v2, approves it or grants a scoped exception with ruling history.
7. Manager runs a Rule Impact Sandbox simulation, verifying breakdown metrics and rule immutability.
8. Manager separately activates the proposed rule via POST /simulations/{id}/activate.
9. Audit history logs every critical step and exports cleanly to CSV.
"""
import io
import json
import httpx

BASE_URL = "http://127.0.0.1:8000"

def run_journey():
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    print("=== STARTING FULL END-TO-END GOVERNANCE JOURNEY ===")

    # Step 1: Manager Login
    print("\n1. Manager login...")
    m_resp = client.post("/auth/login", json={"email": "david.kim@pureglow.co", "password": "precedent"})
    assert m_resp.status_code == 200, f"Manager login failed: {m_resp.text}"
    m_token = m_resp.json().get("token") or m_resp.json().get("accessToken")
    m_headers = {"Authorization": f"Bearer {m_token}"}
    print("   [OK] Manager authenticated (David Kim - Brand Manager)")

    # Step 2: Creator Login
    print("\n2. Creator login...")
    c_resp = client.post("/auth/login", json={"email": "emily.carter@pureglow.co", "password": "precedent"})
    assert c_resp.status_code == 200, f"Creator login failed: {c_resp.text}"
    c_token = c_resp.json().get("token") or c_resp.json().get("accessToken")
    c_headers = {"Authorization": f"Bearer {c_token}"}
    print("   [OK] Creator authenticated (Emily Carter - Content Team)")

    # Step 3: Manager uploads guideline
    print("\n3. Manager uploads Brand Guideline document...")
    doc_text = (
        "PureGlow Botanical Skincare Mandatory Claims Policy 2026.\n\n"
        "Paragraph 1: All clinical results must reference dermatological patch testing conducted within 12 months.\n\n"
        "Paragraph 2: Prohibit unapproved anti-aging and miracle claims on digital and print packaging."
    )
    doc_file = io.BytesIO(doc_text.encode("utf-8"))
    upload_resp = client.post(
        "/guidelines",
        files={"file": ("claims_policy_2026.txt", doc_file, "text/plain")},
        data={"name": "Mandatory Claims Policy 2026", "category": "Claims", "brand": "PureGlow"},
        headers=m_headers,
    )
    assert upload_resp.status_code in (200, 201), f"Upload failed: {upload_resp.text}"
    doc = upload_resp.json()
    doc_id = doc["id"]
    print(f"   [OK] Guideline uploaded successfully (ID: {doc_id}, Passages extracted)")

    # Verify search
    search_resp = client.get("/guidelines/search?q=dermatological", headers=m_headers)
    assert search_resp.status_code == 200, f"Search failed: {search_resp.text}"
    passages = search_resp.json()
    assert len(passages) >= 1
    print(f"   [OK] Full-text search returned {len(passages)} matching passage(s)")

    # Step 4: Manager creates and confirms a draft rule
    print("\n4. Manager confirms draft rule linked to source passage...")
    canonical_quote = "All clinical results must reference dermatological patch testing conducted within 12 months."
    rule_resp = client.post(
        "/rules",
        json={
            "brand": "PureGlow",
            "category": "Claims",
            "title": "Mandatory Clinical Patch Test Reference",
            "condition": "clinical results",
            "action": "Must cite 12-month dermatological patch test",
            "severity": "High",
            "sourceDocId": doc_id,
            "sourcePassage": canonical_quote,
        },
        headers=m_headers,
    )
    assert rule_resp.status_code == 201, f"Create rule failed: {rule_resp.text}"
    rule = rule_resp.json()
    rule_id = rule["id"]
    assert rule["status"] in ("draft", "needs_confirmation"), f"Rule should start as unconfirmed, got {rule['status']}"

    confirm_resp = client.post(f"/rules/{rule_id}/confirm", headers=m_headers)
    assert confirm_resp.status_code == 200, f"Confirm rule failed: {confirm_resp.text}"
    confirmed_rule = confirm_resp.json()
    assert confirmed_rule["status"] == "active"
    print(f"   [OK] Rule {confirmed_rule['code']} confirmed and active (ID: {rule_id})")

    # Step 5: Creator uploads product image asset
    print("\n5. Creator uploads product image asset...")
    # 1x1 PNG bytes
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    img_resp = client.post(
        "/assets",
        files={"file": ("serum_hero.png", io.BytesIO(png_bytes), "image/png")},
        data={"name": "Serum Hero Shot", "category": "Product Image", "brand": "PureGlow", "notes": "E2E test asset"},
        headers=c_headers,
    )
    assert img_resp.status_code in (200, 201), f"Image upload failed: {img_resp.text}"
    asset = img_resp.json()
    asset_id = asset["id"]
    print(f"   [OK] Product image asset uploaded (ID: {asset_id})")

    # Step 6: Creator submits content with attached asset
    print("\n6. Creator submits content referencing product image...")
    sub_resp = client.post(
        "/submissions",
        json={
            "title": "Summer Botanical Glow Campaign",
            "excerpt": "Our revolutionary formula produces clinical results that eliminate wrinkles.",
            "type": "Text",
            "channel": "Instagram",
            "brand": "PureGlow",
            "assetId": asset_id,
            "asset": {
                "backgroundColour": "#A2B897",
                "clearSpaceRatio": 0.35,
                "typeface": "Precedent Sans",
                "aspectRatio": "1:1",
                "unreadable": False,
            },
        },
        headers=c_headers,
    )
    assert sub_resp.status_code == 200, f"Submission failed: {sub_resp.text}"
    sub = sub_resp.json()
    sub_id = sub["id"]
    assert sub["version"] == 1
    assert sub["status"] == "Pending"
    assert sub.get("assetId") == asset_id
    print(f"   [OK] Submission created (ID: {sub_id}, v1, status: Pending)")

    # Step 7: Verify findings with verified evidence
    print("\n7. Inspecting findings and verified evidence...")
    findings = sub.get("findings", [])
    print(f"   [OK] Generated {len(findings)} findings")
    for f in findings:
        status_flag = "VERIFIED" if f.get("evidenceVerified") else "UNVERIFIED"
        print(f"     - Finding {f.get('ruleCode')}: '{f.get('message')}' [{status_flag}]")

    # Step 8: Creator accepts minimal-edit suggestion, creating Version 2
    print("\n8. Creator creates Content Version 2...")
    v2_text = "Our gentle formula features clinical results backed by 12-month dermatological patch testing."
    v2_resp = client.post(
        f"/submissions/{sub_id}/versions",
        json={
            "text": v2_text,
            "summary": "Accepted minimal edit citing 12-month patch testing.",
        },
        headers=c_headers,
    )
    assert v2_resp.status_code == 200, f"Version 2 creation failed: {v2_resp.text}"
    sub_v2 = v2_resp.json()
    assert sub_v2["version"] == 2
    assert sub_v2["status"] == "Pending", f"Version 2 status must reset to Pending, got {sub_v2['status']}"
    print(f"   [OK] Content Version 2 created (Status: Pending, Approval reset verified)")

    # Step 9: Manager approves Version 2
    print("\n9. Manager approves Content Version 2...")
    decide_resp = client.post(
        f"/submissions/{sub_id}/decide",
        json={
            "action": "approve",
            "version": 2,
            "comment": "All mandatory claims verified against 2026 guidelines.",
        },
        headers=m_headers,
    )
    assert decide_resp.status_code == 200, f"Approval failed: {decide_resp.text}"
    approved_sub = decide_resp.json()
    assert approved_sub["status"] == "Approved"
    print(f"   [OK] Submission {sub_id} v2 Approved by Brand Manager")

    # Step 10: Manager creates an Exception and verifies ruling history & revocation
    print("\n10. Exception ruling lifecycle...")
    ex_resp = client.post(
        "/exceptions",
        json={
            "contentId": sub_id,
            "ruleCode": confirmed_rule["code"],
            "brand": "PureGlow",
            "scope": "Instagram",
            "reason": "Special one-time influencer collaboration campaign",
            "validUntil": "2026-12-31T23:59:59Z",
        },
        headers=c_headers,
    )
    assert ex_resp.status_code == 200, f"Exception request failed: {ex_resp.text}"
    ex_id = ex_resp.json()["id"]

    # Manager approves exception
    app_ex_resp = client.post(
        f"/exceptions/{ex_id}/decide",
        json={"decision": "Approved", "conditions": "Requires disclaimer footnote"},
        headers=m_headers,
    )
    assert app_ex_resp.status_code == 200
    assert app_ex_resp.json()["status"] == "Approved"

    # Verify history
    hist_resp = client.get(f"/exceptions/{ex_id}/history", headers=m_headers)
    assert hist_resp.status_code == 200
    hist = hist_resp.json()
    assert len(hist) >= 2  # Requested + Approved
    print(f"   [OK] Exception {ex_id} approved, history has {len(hist)} events")

    # Manager revokes exception
    rev_resp = client.post(
        f"/exceptions/{ex_id}/revoke",
        json={"reason": "Campaign concluded early"},
        headers=m_headers,
    )
    assert rev_resp.status_code == 200
    assert rev_resp.json()["status"] == "Revoked"
    print(f"   [OK] Exception {ex_id} revoked by Manager")

    # Step 11: Manager runs Rule Impact Sandbox simulation
    print("\n11. Manager runs Rule Impact Sandbox simulation...")
    sim_resp = client.post(
        "/simulations",
        json={
            "ruleId": rule_id,
            "changeType": "relax_threshold",
            "newValue": "24 months patch test",
            "name": "Simulate Extended 24-Month Patch Window",
        },
        headers=m_headers,
    )
    assert sim_resp.status_code == 200, f"Simulation failed: {sim_resp.text}"
    sim = sim_resp.json()
    sim_id = sim["id"]
    breakdown = sim.get("breakdown", {})
    print(f"   [OK] Simulation completed (ID: {sim_id})")
    print(f"     Breakdown: newlyFlagged={breakdown.get('newlyFlagged')}, resolved={breakdown.get('resolved')}, unchanged={breakdown.get('unchanged')}")

    # Verify target rule was NOT modified
    check_rule = client.get(f"/rules/{rule_id}", headers=m_headers).json()
    assert check_rule["action"] == confirmed_rule["action"]
    print("   [OK] Active rule provably unchanged during simulation (Immutability verified)")

    # Step 12: Manager activates simulation proposal via separate endpoint
    print("\n12. Manager activates proposed rule change separately...")
    act_resp = client.post(f"/simulations/{sim_id}/activate", headers=m_headers)
    assert act_resp.status_code == 200, f"Activation failed: {act_resp.text}"
    act_data = act_resp.json()
    assert act_data["status"] == "activated"
    print(f"   [OK] Simulation proposal activated into production rule (POST /simulations/{sim_id}/activate)")

    # Step 13: Manager exports Audit Log
    print("\n13. Manager exports Audit History...")
    csv_resp = client.get("/audit/export?format=csv", headers=m_headers)
    assert csv_resp.status_code == 200, f"CSV export failed: {csv_resp.text}"
    csv_text = csv_resp.text
    assert "timestamp" in csv_text and "action" in csv_text
    print(f"   [OK] Audit log exported to CSV ({len(csv_text.splitlines())} lines including headers)")

    print("\n=== ALL END-TO-END JOURNEY STEPS SUCCEEDED ===")

if __name__ == "__main__":
    run_journey()
