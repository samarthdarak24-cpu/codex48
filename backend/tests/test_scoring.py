"""Unit tests for the stored compliance score (spec Part 4 / observation O4).

These pin the formula so a future change is a deliberate act rather than a
silent drift, and they cover the cases that made the old client-side version
misleading: unknown findings, clean content, and content nothing ran on.
"""
from types import SimpleNamespace

import pytest

from app.services.scoring import (
    FORMULA_VERSION,
    PASS_WEIGHT,
    SEVERITY_WEIGHT,
    compute_breakdown,
    compute_score,
)


def f(severity: str, outcome: str = "violation"):
    return SimpleNamespace(severity=severity, outcome=outcome)


def test_formula_version_is_pinned():
    assert FORMULA_VERSION == "severity_weighted_v1"


def test_no_findings_scores_100_but_reports_nothing_counted():
    bd = compute_breakdown([])
    assert bd.score == 100
    assert bd.counted == 0
    # The caller must be able to tell "clean" from "nothing ran".
    assert bd.as_dict()["counted"] == 0


def test_severity_weights_are_applied_in_order():
    bd = compute_breakdown([f("High"), f("Medium"), f("Low")], applicable_rules=10)
    assert (bd.high, bd.medium, bd.low) == (1, 1, 1)
    assert bd.penalty == SEVERITY_WEIGHT["high"] + SEVERITY_WEIGHT["medium"] + SEVERITY_WEIGHT["low"]


def test_unknown_counts_as_half_a_violation():
    bd = compute_breakdown([f("Unknown", "needs_review")], applicable_rules=10)
    assert bd.unknown == 1
    assert bd.penalty == 0.5
    # An unknown must never be treated as a pass.
    assert bd.score < 100


def test_applicable_rules_set_the_denominator():
    findings = [f("High")]
    with_scope = compute_breakdown(findings, applicable_rules=10)
    without_scope = compute_breakdown(findings)

    assert with_scope.applicable == 10
    # Findings alone would make one high finding look catastrophic.
    assert with_scope.score > without_scope.score


def test_score_is_zero_when_every_applicable_rule_is_a_high_violation():
    findings = [f("High") for _ in range(5)]
    bd = compute_breakdown(findings, applicable_rules=5)
    assert bd.score == 0


def test_clean_content_with_scope_scores_100():
    bd = compute_breakdown([], applicable_rules=18)
    assert bd.score == 100
    assert bd.applicable == 18


def test_compliant_and_excepted_findings_are_not_penalised():
    bd = compute_breakdown(
        [f("High", "compliant"), f("High", "excepted"), f("High", "violation")],
        applicable_rules=10,
    )
    assert bd.passed == 2
    assert bd.high == 1
    assert bd.score == round(100 * (1 - SEVERITY_WEIGHT["high"] / (10 * PASS_WEIGHT)))


def test_determinism_same_input_same_output():
    findings = [f("High"), f("Medium"), f("Low"), f("Unknown", "needs_review")]
    assert compute_score(findings, applicable_rules=12) == compute_score(findings, applicable_rules=12)


def test_score_is_bounded_0_100():
    bd = compute_breakdown([f("High") for _ in range(200)], applicable_rules=1)
    assert 0 <= bd.score <= 100


def test_breakdown_serialises_camel_case_for_the_api():
    payload = compute_breakdown([f("Medium")], applicable_rules=8).as_dict()
    for key in ("high", "medium", "low", "unknown", "penalty", "score", "applicable", "counted", "formulaVersion"):
        assert key in payload
