"""Tests for new innovation features:
1. 1-Click AI Brand Remediator
2. Multi-Jurisdiction Rules (EU-01, UK-02, US-01, CL-07)
3. Substantiation Dossier attachment
4. Post-Publishing Sentinel & Exception Drift Watchdog
"""
from fastapi.testclient import TestClient
from app.db import SessionLocal
from app.models import Rule


def _seed_test_rules():
    db = SessionLocal()
    rule_eu = Rule(
        id="rule-eu01-test",
        code="EU-01",
        title="EU Green Claims Directive",
        status="active",
        source_passage="Generic green claims without LCA verification are prohibited.",
        subject="Environmental claim",
        scope="EU · All channels",
    )
    db.add(rule_eu)
    db.commit()
    db.close()


def test_remediate_endpoint(client: TestClient, creator_token):
    auth_headers = {"Authorization": f"Bearer {creator_token}"}
    payload = {
        "text": "Our 100% safe miracle formula is clinically proven to cure skin aging! Hurry!",
        "channel": "Social",
        "style": "balanced",
    }
    res = client.post("/submissions/remediate", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "remediatedText" in data
    assert "100% safe" not in data["remediatedText"]
    assert "miracle" not in data["remediatedText"]
    assert "cure" not in data["remediatedText"]
    assert len(data["changesApplied"]) > 0
    assert len(data["alternatives"]) >= 2


def test_jurisdiction_rules_evaluation(client: TestClient, creator_token):
    _seed_test_rules()
    auth_headers = {"Authorization": f"Bearer {creator_token}"}
    # Test EU green claim rule (EU-01)
    sub_eu = {
        "title": "Eco Serum Launch",
        "type": "Text",
        "channel": "Social",
        "brand": "PureGlow",
        "text": "Discover our 100% eco-friendly and carbon neutral hydration drops.",
    }
    res = client.post("/submissions", json=sub_eu, headers=auth_headers)
    assert res.status_code == 200
    sub_data = res.json()
    rule_codes = [f["ruleCode"] for f in sub_data["findings"]]
    assert "EU-01" in rule_codes

    # Test Substantiation dossier presence
    assert "substantiations" in sub_data
    assert len(sub_data["substantiations"]) > 0


def test_sentinel_summary_and_audit(client: TestClient, manager_token):
    auth_headers = {"Authorization": f"Bearer {manager_token}"}
    # Test Sentinel Summary
    res = client.get("/sentinel/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "totalLiveMonitored" in data
    assert "complianceRate" in data
    assert "sentinelStatus" in data

    # Test Sentinel Alerts
    alerts_res = client.get("/sentinel/alerts", headers=auth_headers)
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert len(alerts) > 0

    # Test Sentinel Live Audit
    audit_payload = {
        "liveUrl": "https://instagram.com/p/live-sample",
        "liveContent": "Hurry! Order our 100% miracle cure now with 50% discount!",
    }
    audit_res = client.post("/sentinel/audit-live", json=audit_payload, headers=auth_headers)
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert audit_data["driftDetected"] is True
    assert len(audit_data["violations"]) > 0
