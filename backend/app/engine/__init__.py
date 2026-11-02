"""Precedent Deterministic Rule Engine."""
from .conditions import get_condition_type_catalogue
from .evaluator import (
    ENGINE_VERSION,
    EvaluationResult,
    EvaluationSummary,
    RuleFindingResult,
    evaluate_rule,
    evaluate_submission,
)
from .conflicts import ConflictItem, detect_rule_conflicts

__all__ = [
    "ENGINE_VERSION",
    "EvaluationResult",
    "EvaluationSummary",
    "RuleFindingResult",
    "evaluate_rule",
    "evaluate_submission",
    "detect_rule_conflicts",
    "ConflictItem",
    "get_condition_type_catalogue",
]

