"""Compliance scoring — one formula, computed on the server.

Spec: PRECEDENT_MASTER Part 4. The score is a property of the stored findings,
not of anything the browser can see, so it is computed here and persisted on
`submissions`. The UI only displays the value the API returns.

Formula (severity weighted, `FORMULA_VERSION = "severity_weighted_v1"`)::

    penalty   = 5·high + 3·medium + 1·low + 0.5·unknown
    applicable = rules that ran (passed + penalised), never below `counted`
    score     = round(100 × (1 − penalty / (applicable × 5)))

`unknown` counts as half a violation (spec: "unknown counted as 0.5 penalty
weight") and is never treated as a pass.

Why `applicable` is passed in rather than counted from findings: the findings
table only stores problems, so a clean submission has zero rows and a
findings-only denominator would score **every** submission 0. The caller knows
how many rules were in scope for that content; `compute_breakdown` uses it as
the denominator and falls back to `passed + counted` when it is not supplied.

A submission with no findings and no rules in scope scores 100 — the breakdown
carries `counted` and `applicable` so the UI can tell "clean" from "nothing ran".
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Optional

FORMULA_VERSION = "severity_weighted_v1"

#: Weight per open finding severity. `unknown` is deliberately a fraction.
SEVERITY_WEIGHT = {"high": 5.0, "medium": 3.0, "low": 1.0, "unknown": 0.5}

#: Weight of one rule that passed — sets the denominator's shape.
PASS_WEIGHT = 5.0


@dataclass
class ScoreBreakdown:
    """Everything needed to explain the number, not just produce it."""

    high: int = 0
    medium: int = 0
    low: int = 0
    unknown: int = 0
    passed: int = 0
    penalty: float = 0.0
    score: int = 100
    applicable: int = 0
    formula_version: str = FORMULA_VERSION
    computed_at: Optional[datetime] = None
    counted: int = field(default=0)

    def as_dict(self) -> dict:
        return {
            "high": self.high,
            "medium": self.medium,
            "low": self.low,
            "unknown": self.unknown,
            "passed": self.passed,
            "penalty": round(self.penalty, 2),
            "score": self.score,
            "applicable": self.applicable,
            "formulaVersion": self.formula_version,
            "computedAt": self.computed_at.isoformat() if self.computed_at else None,
            "counted": self.counted,
        }


def _severity_of(finding) -> str:
    raw = (getattr(finding, "severity", None) or "").strip().lower()
    return raw if raw in SEVERITY_WEIGHT else "medium"


def _outcome_of(finding) -> str:
    return (getattr(finding, "outcome", None) or "").strip().lower()


def compute_breakdown(
    findings: Iterable,
    now: Optional[datetime] = None,
    applicable_rules: Optional[int] = None,
) -> ScoreBreakdown:
    """Turn stored findings into a score plus its explanation.

    Accepts ORM rows or plain dicts so the same function serves the API and the
    tests. A finding only counts against the content when its outcome is
    `violation` or `needs_review`; anything else is a pass.
    """
    bd = ScoreBreakdown(computed_at=now or datetime.now(timezone.utc))

    for finding in findings or []:
        outcome = _outcome_of(finding)
        if outcome in ("violation", "needs_review", "needs_human_review"):
            severity = _severity_of(finding)
            if severity == "high":
                bd.high += 1
            elif severity == "low":
                bd.low += 1
            elif severity == "unknown":
                bd.unknown += 1
            else:
                bd.medium += 1
        else:
            bd.passed += 1

    bd.counted = bd.high + bd.medium + bd.low + bd.unknown
    bd.penalty = (
        bd.high * SEVERITY_WEIGHT["high"]
        + bd.medium * SEVERITY_WEIGHT["medium"]
        + bd.low * SEVERITY_WEIGHT["low"]
        + bd.unknown * SEVERITY_WEIGHT["unknown"]
    )

    denominator = bd.penalty + bd.passed * PASS_WEIGHT
    if applicable_rules and applicable_rules > bd.counted:
        # Prefer the real scope: how many rules actually applied to this content.
        denominator = applicable_rules * PASS_WEIGHT
        bd.applicable = applicable_rules
    else:
        bd.applicable = bd.counted + bd.passed

    if denominator <= 0:
        # Nothing was evaluated. 100 with `counted == 0` is honest: the UI can
        # see that no rule ran and must not present it as a clean result.
        bd.score = 100
    else:
        bd.score = max(0, min(100, round(100 * (1 - bd.penalty / denominator))))

    return bd


def compute_score(
    findings: Iterable,
    now: Optional[datetime] = None,
    applicable_rules: Optional[int] = None,
) -> int:
    return compute_breakdown(findings, now=now, applicable_rules=applicable_rules).score
