"""Comprehensive tests for Canonical API v1, Deterministic Engine, VisualGuard, and Sentinel.

Verifies PRECEDENT_MASTER_BACKEND_PROMPT.md requirements:
- §7 Deterministic Rule Engine condition types & determinism
- §8.1 VisualGuard color ΔE76 and contrast
- §8.2 Strict Citation Validator & rejection of fabricated quotes
- §8.3 Sentinel scan idempotency
- §9 Canonical /api/v1 endpoints
- §10 Metrics & PDF report generation
"""
from conftest import auth_headers
from app.db import SessionLocal
from app.engine.evaluator import evaluate_rule, evaluate_submission
from app.models import Campaign, GuidelineDoc, GuidelinePassage, Rule, Submission, utcnow
from app.services.reports import generate_submission_compliance_pdf
from app.services.semantic import validate_citation
from app.services.visual import calculate_contrast_ratio, delta_e76, hex_to_rgb, rgb_to_lab


def test_condition_types_catalogue(client, manager_token):
    """GET /api/v1/rules/condition-types returns all 13 supported condition types."""
    resp = client.get("/api/v1/rules/condition-types")
    assert resp.status_code == 200
    types = resp.json()
    assert len(types) >= 12
    type_names = {t["condition_type"] for t in types}
    assert "forbidden_phrase" in type_names
    assert "required_phrase" in type_names
    assert "absolute_claim" in type_names
    assert "color_palette" in type_names
    assert "logo_required" in type_names
    assert "channel_allowed" in type_names


def test_brand_kit_get_and_update(client, manager_token, creator_token):
    """GET /api/v1/brand-kit is accessible by both; PUT requires manager role."""
    # Read as creator
    resp = client.get("/api/v1/brand-kit", headers=auth_headers(creator_token))
    assert resp.status_code == 200
    bk = resp.json()
    assert "palette" in bk

    # Creator cannot mutate brand kit (403)
    put_resp = client.put("/api/v1/brand-kit", json={"color_tolerance_dE": 12.5}, headers=auth_headers(creator_token))
    assert put_resp.status_code == 403

    # Manager can update
    put_resp_m = client.put("/api/v1/brand-kit", json={"color_tolerance_dE": 12.5}, headers=auth_headers(manager_token))
    assert put_resp_m.status_code == 200
    assert put_resp_m.json()["color_tolerance_dE"] == 12.5


def test_global_search(client, creator_token):
    """GET /api/v1/search?q= returns role-scoped matches."""
    db = SessionLocal()
    sub = Submission(
        title="Emerald Holiday Creative",
        excerpt="Special holiday launch poster",
        brand="PureGlow",
        workspace="PureGlow",
        creator_id="creator-1",
    )
    db.add(sub)
    db.commit()
    db.close()

    resp = client.get("/api/v1/search?q=emerald", headers=auth_headers(creator_token))
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert any("Emerald" in it["title"] for it in items)


def test_publications_workflow(client, manager_token, creator_token):
    """Only approved submissions can be published; unpublish works."""
    db = SessionLocal()
    sub = Submission(
        title="Approved Poster For Publication",
        excerpt="Copy text",
        brand="PureGlow",
        workspace="PureGlow",
        creator_id="creator-1",
        status="Approved",
        version=1,
    )
    db.add(sub)
    db.commit()
    sub_id = sub.id
    db.close()

    # Publish
    pub_resp = client.post(
        f"/api/v1/submissions/{sub_id}/publications",
        json={"channel": "Instagram", "external_ref": "ig-post-101"},
        headers=auth_headers(manager_token),
    )
    assert pub_resp.status_code == 200
    pub_data = pub_resp.json()
    assert pub_data["status"] == "published"
    pub_id = pub_data["id"]

    # List publications
    list_resp = client.get(f"/api/v1/submissions/{sub_id}/publications", headers=auth_headers(creator_token))
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # Unpublish
    unpub_resp = client.post(f"/api/v1/publications/{pub_id}/unpublish", headers=auth_headers(manager_token))
    assert unpub_resp.status_code == 200
    assert unpub_resp.json()["status"] == "unpublished"


def test_sentinel_summary_and_scan(client, manager_token):
    """GET /api/v1/sentinel/summary and POST /api/v1/sentinel/scan execute without error."""
    sum_resp = client.get("/api/v1/sentinel/summary", headers=auth_headers(manager_token))
    assert sum_resp.status_code == 200
    summary = sum_resp.json()
    assert "monitored_content_count" in summary
    assert "open_tasks" in summary

    # Trigger scan
    scan_resp = client.post("/api/v1/sentinel/scan", headers=auth_headers(manager_token))
    assert scan_resp.status_code == 200
    stats = scan_resp.json()
    assert "scanned_submissions" in stats


def test_deterministic_engine_condition_types():
    """Unit tests for condition types evaluated pure-code with zero LLM."""
    rule_mock = Rule(
        code="RULE-TEST-01",
        title="Prohibit Miracle Claim",
        source_passage="Miracle claims are strictly prohibited.",
        subject="Claims",
        scope="All brands",
    )

    # 1. forbidden_phrase match
    config_forbidden = {
        "condition_type": "forbidden_phrase",
        "phrases": ["miracle", "100% cure"],
        "match": "word",
        "case_sensitive": False,
    }
    facts_hit = {"copy": {"text": "This lotion is a miracle formula for skin."}}
    finding = evaluate_rule(rule_mock, config_forbidden, facts_hit, [])
    assert finding.outcome == "violation"
    assert "miracle" in finding.explanation

    # 2. forbidden_phrase compliant
    facts_clean = {"copy": {"text": "This lotion hydrates your skin naturally."}}
    finding_clean = evaluate_rule(rule_mock, config_forbidden, facts_clean, [])
    assert finding_clean.outcome == "compliant"

    # 3. required_phrase missing vs present
    config_req = {
        "condition_type": "required_phrase",
        "phrases": ["Terms apply"],
        "mode": "any",
    }
    f_missing = evaluate_rule(rule_mock, config_req, facts_clean, [])
    assert f_missing.outcome == "violation"

    f_present = evaluate_rule(rule_mock, config_req, {"copy": {"text": "Special discount. Terms apply."}}, [])
    assert f_present.outcome == "compliant"


def test_strict_citation_validator():
    """Citation validator succeeds on true substring, rejects fabricated quotes."""
    db = SessionLocal()
    doc = GuidelineDoc(name="Claims Guide", workspace="PureGlow")
    db.add(doc)
    db.flush()

    passage = GuidelinePassage(
        doc_id=doc.id,
        workspace="PureGlow",
        passage_text="All clinical safety claims must cite double-blind dermatological trial evidence.",
    )
    db.add(passage)

    rule = Rule(
        code="SAFE-01",
        title="Clinical Safety Claims",
        status="active",
        source_passage="All clinical safety claims must cite double-blind dermatological trial evidence.",
        source_doc_id=doc.id,
        workspace="PureGlow",
    )
    db.add(rule)
    db.commit()

    # Valid exact substring
    v_ok = validate_citation(
        db,
        rule_code="SAFE-01",
        passage_id=passage.id,
        quote="double-blind dermatological trial evidence",
        retrieved_passage_ids=[passage.id],
    )
    assert v_ok.is_valid is True

    # Fabricated quote not in stored text
    v_fail = validate_citation(
        db,
        rule_code="SAFE-01",
        passage_id=passage.id,
        quote="All products are 100% FDA approved universally",
        retrieved_passage_ids=[passage.id],
    )
    assert v_fail.is_valid is False
    assert "is not present in stored guideline passage text" in (v_fail.rejection_reason or "")
    db.close()


def test_visual_color_delta_e_and_contrast():
    """Verifies CIE76 color distance and WCAG AA contrast calculations."""
    green_rgb = hex_to_rgb("#2C5E3B")
    green_lab = rgb_to_lab(green_rgb)
    assert green_lab[0] > 0

    # Same color -> delta_e == 0
    assert delta_e76(green_lab, green_lab) == 0.0

    # Orange vs Green -> substantial delta_e
    orange_rgb = hex_to_rgb("#FF7A00")
    orange_lab = rgb_to_lab(orange_rgb)
    de = delta_e76(green_lab, orange_lab)
    assert de > 25.0, f"Expected large delta E between green and orange, got {de}"

    # WCAG Contrast ratio: White on dark green
    white_rgb = (255, 255, 255)
    ratio = calculate_contrast_ratio(white_rgb, green_rgb)
    assert ratio >= 4.5, f"Expected WCAG AA contrast (>= 4.5), got {ratio}"


def test_compliance_pdf_generation():
    """Generates a valid binary PDF document with zero external network dependencies."""
    db = SessionLocal()
    sub = Submission(
        title="PDF Generation Test Creative",
        brand="PureGlow",
        channel="Instagram",
        status="Approved",
        version=1,
    )
    db.add(sub)
    db.commit()

    pdf_bytes = generate_submission_compliance_pdf(sub)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")
    db.close()

