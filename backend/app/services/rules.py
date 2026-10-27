"""Rule serialization + deterministic conflict detection.

See CONTRACT.md > Rules + Conflicts. Conflict detection is intentionally simple
and predictable: it only flags pairs of *active* rules that target the same
subject and scope and whose conditions pull in opposite directions.
"""
from sqlalchemy.orm import Session

from .. import models

# Words that signal a rule *requiring* something.
_REQUIRE_WORDS = ("must", "required", "only", "needs", "need", "should")
# Words that signal a rule *prohibiting* something.
_PROHIBIT_WORDS = ("must not", "mustn't", "never", "avoid", "prohibited", "prohibit", "forbidden", "cannot", "can't")


def rule_to_dict(r: "models.Rule") -> dict:
    """Serialize a Rule to the camelCase shape the frontend expects."""
    return {
        "id": r.id,
        "code": r.code,
        "title": r.title,
        "summary": r.summary,
        "subject": r.subject,
        "condition": r.condition,
        "action": r.action,
        "scope": r.scope,
        "priority": r.priority,
        "status": r.status,
        "sourceDocId": r.source_doc_id,
        "sourceVersion": r.source_version,
        "sourcePassage": r.source_passage,
        "sourcePage": r.source_page,
        "effectiveFrom": r.effective_from.isoformat() if r.effective_from else None,
        "effectiveTo": r.effective_to.isoformat() if r.effective_to else None,
        "overridesThisQuarter": r.overrides_this_quarter,
    }


def _direction(condition: str) -> str | None:
    """Return 'require' / 'prohibit' / None based on the condition text."""
    text = (condition or "").lower()
    if any(w in text for w in _PROHIBIT_WORDS):
        return "prohibit"
    if any(w in text for w in _REQUIRE_WORDS):
        return "require"
    return None


def _shared_keywords(a: str, b: str) -> list[str]:
    """Crude keyword overlap between two condition strings (words >= 4 chars)."""
    words_a = {w for w in (a or "").lower().split() if len(w) >= 4}
    words_b = {w for w in (b or "").lower().split() if len(w) >= 4}
    return sorted(words_a & words_b)


def detect_conflicts(db: Session) -> list[dict]:
    """Find pairs of active rules that conflict.

    Heuristic (deterministic): two active rules conflict when they share the same
    non-empty `subject` AND the same non-empty `scope`, and either
      (a) their conditions pull in opposite directions (one requires, the other
          prohibits) with overlapping keywords, or
      (b) they target the same subject/scope attribute with opposing directions.
    Returns [] when no pair matches.
    """
    rules = db.query(models.Rule).filter(models.Rule.status == "active").all()

    conflicts: list[dict] = []
    for i in range(len(rules)):
        for j in range(i + 1, len(rules)):
            a, b = rules[i], rules[j]
            if not a.subject or not b.subject or a.subject != b.subject:
                continue
            if not a.scope or not b.scope or a.scope != b.scope:
                continue

            da, db_ = _direction(a.condition), _direction(b.condition)
            # Opposing directions required for a conflict.
            if da and db_ and da != db_:
                shared = _shared_keywords(a.condition, b.condition)
                if shared:
                    reason = (
                        f"Both govern '{a.subject}' within '{a.scope}' but rule "
                        f"{a.code} {da}s while rule {b.code} {db_}s "
                        f"(overlapping terms: {', '.join(shared)})."
                    )
                    conflicts.append({
                        "ruleA": rule_to_dict(a),
                        "ruleB": rule_to_dict(b),
                        "reason": reason,
                    })
    return conflicts
