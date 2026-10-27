"""Unit tests for the deterministic rule engine (app.rule_engine)."""
import pytest

from app.rule_engine import evaluate_visual_rule, run_rules


class FakeRule:
    """Minimal stand-in for an ORM Rule with just the fields the engine reads."""

    def __init__(self, code, title="", status="active", source_passage=""):
        self.code = code
        self.title = title
        self.status = status
        self.source_passage = source_passage
        self.source_doc_id = ""
        self.source_version = ""
        self.source_page = 0


class FakeAsset:
    """Stand-in for an asset's stored facts."""

    def __init__(self, background_colour=None, clear_space_ratio=None,
                 typeface=None, unreadable=False):
        self.background_colour = background_colour
        self.clear_space_ratio = clear_space_ratio
        self.typeface = typeface
        self.unreadable = unreadable


def _codes(findings):
    return {f.rule_code for f in findings}


def test_cl04_superlative():
    findings = run_rules([FakeRule("CL-04")], "Our cream is 100% safe to use", "email", None)
    assert "CL-04" in _codes(findings)


def test_cl06_health_language():
    findings = run_rules([FakeRule("CL-06")], "This product boosts immunity naturally", "email", None)
    assert "CL-06" in _codes(findings)


def test_mk02_discount_no_window():
    findings = run_rules([FakeRule("MK-02")], "Get 20% off all items today", "email", None)
    assert "MK-02" in _codes(findings)


def test_mk02_discount_with_window():
    findings = run_rules([FakeRule("MK-02")], "20% off — offer ends 31 July", "email", None)
    assert "MK-02" not in _codes(findings)


def test_cl03_fragrance_free_has_fix():
    findings = run_rules([FakeRule("CL-03")], "Made fragrance-free for sensitive skin", "email", None)
    cl03 = [f for f in findings if f.rule_code == "CL-03"]
    assert cl03, "expected a CL-03 finding"
    assert cl03[0].suggested_fix is not None


def test_br01_red_background_fails():
    rule = FakeRule("BR-01")
    findings = run_rules([rule], "", "email", FakeAsset(background_colour="#FF0000"))
    br = [f for f in findings if f.rule_code == "BR-01"]
    assert br, "expected a BR-01 finding"
    assert br[0].severity == "High"


def test_br01_approved_background_passes():
    rule = FakeRule("BR-01")
    findings = run_rules([rule], "", "email", FakeAsset(background_colour="#7AB93B"))
    assert "BR-01" not in _codes(findings)


def test_br01_unreadable_asset_unknown():
    rule = FakeRule("BR-01")
    ev = evaluate_visual_rule(rule, FakeAsset(unreadable=True))
    assert ev is not None
    # unknown verdict surfaces as a Medium-severity "needs review" finding, not a fail.
    assert ev.severity == "Medium"
    assert "human" in ev.explanation.lower()
