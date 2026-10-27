"""Rule serialization + deterministic conflict detection.

See CONTRACT.md > Rules + Conflicts. Conflict detection covers:
1. Contradictory permitted/prohibited values & overlapping conditions
2. Conflicting scopes (broad vs specific channels with opposing actions)
3. Incompatible effective date ranges
4. Rule-vs-exception conflicts
5. Proposed-rule-vs-ruling conflicts
6. Potential semantic conflicts (AI assisted, explicitly labeled 'potential')
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
    words_a = {w for w in (a or "").lower().split() if len(w) >= 4 and w not in _REQUIRE_WORDS and w not in _PROHIBIT_WORDS}
    words_b = {w for w in (b or "").lower().split() if len(w) >= 4 and w not in _REQUIRE_WORDS and w not in _PROHIBIT_WORDS}
    return sorted(words_a & words_b)


def detect_conflicts(db: Session, workspace: str = "PureGlow") -> list[dict]:
    """Find deterministic conflicts across rules, exceptions, and proposals.

    Detects:
    1. Contradictory permitted/prohibited values & overlapping conditions
    2. Conflicting scopes (e.g., broad vs channel-specific opposing directives)
    3. Incompatible effective dates (overlapping date ranges with opposing directives)
    4. Rule-vs-exception conflicts (active rule contradicted by an active exception)
    5. Proposed-rule-vs-ruling conflicts (proposed rule contradicts active exception ruling)
    6. Potential semantic conflicts (AI assisted, explicitly labeled 'potential')
    """
    rule_query = db.query(models.Rule).filter(models.Rule.status == "active")
    if workspace:
        rule_query = rule_query.filter(
            (models.Rule.workspace == workspace)
            | (models.Rule.workspace.is_(None))
            | (models.Rule.workspace == "PureGlow")
        )
    rules = rule_query.all()

    conflicts: list[dict] = []

    # 1, 2, 3: Rule vs Rule deterministic conflicts
    for i in range(len(rules)):
        for j in range(i + 1, len(rules)):
            a, b = rules[i], rules[j]
            da, db_ = _direction(a.condition), _direction(b.condition)
            shared = _shared_keywords(a.condition, b.condition)

            # Check 1: Contradictory permitted/prohibited values on same subject & scope
            if a.subject and b.subject and a.subject.lower() == b.subject.lower():
                if a.scope and b.scope and a.scope.lower() == b.scope.lower():
                    if da and db_ and da != db_:
                        reason = (
                            f"Contradictory values: both govern '{a.subject}' within '{a.scope}' but "
                            f"{a.code} {da}s while {b.code} {db_}s"
                            + (f" (overlapping terms: {', '.join(shared)})" if shared else "") + "."
                        )
                        conflicts.append({
                            "type": "contradictory_values",
                            "severity": "High",
                            "ruleA": rule_to_dict(a),
                            "ruleB": rule_to_dict(b),
                            "reason": reason,
                        })
                        continue

            # Check 2: Conflicting scopes (e.g. broad/all channels vs specific channel with opposing action)
            if a.subject and b.subject and a.subject.lower() == b.subject.lower():
                scope_a = (a.scope or "").lower()
                scope_b = (b.scope or "").lower()
                is_broad_a = scope_a in ("all", "all channels", "all brands", "workspace", "")
                is_broad_b = scope_b in ("all", "all channels", "all brands", "workspace", "")
                if (is_broad_a != is_broad_b) or (scope_a != scope_b and shared):
                    if da and db_ and da != db_:
                        reason = (
                            f"Conflicting scopes: {a.code} applies to '{a.scope or 'All'}' while {b.code} applies to '{b.scope or 'All'}' "
                            f"with contradictory directives on '{a.subject}'."
                        )
                        conflicts.append({
                            "type": "conflicting_scopes",
                            "severity": "Medium",
                            "ruleA": rule_to_dict(a),
                            "ruleB": rule_to_dict(b),
                            "reason": reason,
                        })
                        continue

            # Check 3: Incompatible dates
            if a.effective_from and b.effective_from and (a.subject == b.subject or shared):
                a_from, a_to = a.effective_from, a.effective_to
                b_from, b_to = b.effective_from, b.effective_to
                overlap = True
                if a_to and b_from and a_to < b_from:
                    overlap = False
                if b_to and a_from and b_to < a_from:
                    overlap = False
                if overlap and da and db_ and da != db_:
                    reason = (
                        f"Incompatible dates: {a.code} and {b.code} have overlapping effective date ranges "
                        f"with contradictory directives on '{a.subject or b.subject}'."
                    )
                    conflicts.append({
                        "type": "incompatible_dates",
                        "severity": "High",
                        "ruleA": rule_to_dict(a),
                        "ruleB": rule_to_dict(b),
                        "reason": reason,
                    })

    # Check 4: Rule-vs-Exception conflicts
    from .exceptions import exception_to_dict, is_expired
    ex_query = db.query(models.ExceptionRequest).filter(models.ExceptionRequest.status == "Approved")
    if workspace:
        ex_query = ex_query.filter(
            (models.ExceptionRequest.workspace == workspace)
            | (models.ExceptionRequest.workspace.is_(None))
            | (models.ExceptionRequest.workspace == "PureGlow")
        )
    exceptions = ex_query.all()
    for ex in exceptions:
        if is_expired(ex):
            continue
        for r in rules:
            if r.code == ex.rule_code:
                continue
            ex_reason = (ex.reason or "").lower()
            ex_cond = (ex.conditions or "").lower()
            ex_text = f"{ex_reason} {ex_cond}"
            r_dir = _direction(r.condition)
            if r_dir == "prohibit":
                keywords = [w for w in (r.condition or "").lower().split() if len(w) >= 4 and w not in _PROHIBIT_WORDS and w not in _REQUIRE_WORDS]
                matched_kws = [k for k in keywords if k in ex_text]
                if matched_kws:
                    conflicts.append({
                        "type": "rule_vs_exception",
                        "severity": "Medium",
                        "ruleA": rule_to_dict(r),
                        "exception": exception_to_dict(ex),
                        "reason": (
                            f"Rule-vs-Exception conflict: Approved exception {ex.code} allows practice "
                            f"mentioning '{', '.join(matched_kws[:3])}' which conflicts with active prohibition in {r.code}."
                        ),
                    })

    # Check 5: Proposed-Rule-vs-Ruling conflicts
    proposals = db.query(models.ProposedRule).filter(models.ProposedRule.status.in_(["draft", "pending"])).all()
    for prop in proposals:
        for ex in exceptions:
            if is_expired(ex):
                continue
            prop_dir = _direction(prop.condition or prop.action or "")
            ex_text = f"{(ex.reason or '').lower()} {(ex.conditions or '').lower()}"
            shared_prop = [w for w in (prop.condition or "").lower().split() if len(w) >= 4 and w in ex_text and w not in _PROHIBIT_WORDS]
            if shared_prop and prop_dir == "prohibit":
                conflicts.append({
                    "type": "proposed_vs_ruling",
                    "severity": "Medium",
                    "proposedRule": {
                        "id": prop.id,
                        "ruleCode": prop.rule_code,
                        "title": prop.title,
                        "condition": prop.condition,
                        "action": prop.action,
                    },
                    "exception": exception_to_dict(ex),
                    "reason": (
                        f"Proposed-Rule-vs-Ruling conflict: Proposed change for {prop.rule_code} "
                        f"imposes restrictions overlapping with approved active exception {ex.code} ({', '.join(shared_prop[:3])})."
                    ),
                })

    # Check 6: Potential semantic conflicts (AI assisted, explicitly labeled 'potential')
    try:
        from .. import ai
        if ai.ai_available() and len(rules) >= 2:
            ai_cases = ai.semantic_conflicts(
                [{"code": r.code, "title": r.title, "condition": r.condition, "action": r.action} for r in rules[:8]]
            ) or []
            for case in ai_cases:
                code_a = case.get("ruleCodeA")
                code_b = case.get("ruleCodeB")
                ra = next((r for r in rules if r.code == code_a), None)
                rb = next((r for r in rules if r.code == code_b), None)
                if ra and rb and not any(c.get("ruleA", {}).get("code") == code_a and c.get("ruleB", {}).get("code") == code_b for c in conflicts):
                    conflicts.append({
                        "type": "potential_semantic",
                        "severity": "Low",
                        "status": "potential",
                        "ruleA": rule_to_dict(ra),
                        "ruleB": rule_to_dict(rb),
                        "reason": f"[Potential Semantic Ambiguity] {case.get('explanation', 'AI flagged semantic overlap.')}",
                    })
    except Exception:
        pass

    return conflicts
