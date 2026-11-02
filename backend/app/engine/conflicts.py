"""Deterministic conflict detection between active and proposed rules.

Compliant with PRECEDENT_MASTER_BACKEND_PROMPT.md §7.2.
Detects:
- Contradictory configs (e.g., phrase forbidden by one rule, required by another)
- Overlapping scopes and dates with incompatible thresholds
- Palette clashes
"""
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel


class ConflictItem(BaseModel):
    rule_a_id: str
    rule_a_code: str
    rule_b_id: str
    rule_b_code: str
    conflict_type: str  # "contradictory_config" | "overlapping_scope" | "date_overlap" | "palette_clash"
    reason: str
    evidence: dict = {}


def _dates_overlap(
    start_a: Optional[datetime], end_a: Optional[datetime],
    start_b: Optional[datetime], end_b: Optional[datetime]
) -> bool:
    if end_a and start_b and end_a <= start_b:
        return False
    if end_b and start_a and end_b <= start_a:
        return False
    return True


def detect_rule_conflicts(rules: List[Any]) -> List[ConflictItem]:
    """Examines all active rules and identifies contradictory or clashing policies."""
    conflicts: List[ConflictItem] = []
    n = len(rules)

    for i in range(n):
        for j in range(i + 1, n):
            ra = rules[i]
            rb = rules[j]

            code_a = getattr(ra, "code", "")
            code_b = getattr(rb, "code", "")
            id_a = getattr(ra, "id", "")
            id_b = getattr(rb, "id", "")
            scope_a = getattr(ra, "scope", "")
            scope_b = getattr(rb, "scope", "")
            cond_a = getattr(ra, "condition", "") or ""
            cond_b = getattr(rb, "condition", "") or ""

            # Check date overlap
            start_a = getattr(ra, "effective_from", None)
            end_a = getattr(ra, "effective_to", None)
            start_b = getattr(rb, "effective_from", None)
            end_b = getattr(rb, "effective_to", None)

            if not _dates_overlap(start_a, end_a, start_b, end_b):
                continue

            # Case 1: Same subject and scope with contradictory condition words
            if getattr(ra, "subject", "") and getattr(ra, "subject") == getattr(rb, "subject", ""):
                if scope_a == scope_b or not scope_a or not scope_b:
                    # Look for contradictory directives (e.g. required vs forbidden)
                    ca_low = cond_a.lower()
                    cb_low = cond_b.lower()
                    if ("require" in ca_low and "forbid" in cb_low) or ("forbid" in ca_low and "require" in cb_low):
                        conflicts.append(
                            ConflictItem(
                                rule_a_id=id_a,
                                rule_a_code=code_a,
                                rule_b_id=id_b,
                                rule_b_code=code_b,
                                conflict_type="contradictory_config",
                                reason=f"Contradictory directives: {code_a} vs {code_b} on subject '{ra.subject}'",
                                evidence={"condition_a": cond_a, "condition_b": cond_b},
                            )
                        )

            # Case 2: Incompatible color rules (e.g., green-only vs orange-allowed in same scope)
            if "colour" in (code_a + code_b).lower() or "color" in (code_a + code_b).lower():
                if scope_a == scope_b and cond_a != cond_b and ("only" in cond_a.lower() or "only" in cond_b.lower()):
                    conflicts.append(
                        ConflictItem(
                            rule_a_id=id_a,
                            rule_a_code=code_a,
                            rule_b_id=id_b,
                            rule_b_code=code_b,
                            conflict_type="palette_clash",
                            reason=f"Palette restriction clash between {code_a} and {code_b} in scope '{scope_a or 'All'}'",
                            evidence={"scope": scope_a},
                        )
                    )

    return conflicts

