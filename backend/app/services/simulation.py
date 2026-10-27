"""Simulation service — deterministic port of DataContext.runSimulation.

Builds a *modified* rule set by relaxing the target rule according to the
proposed change, then re-evaluates every submission against the patched rule
set. The live rule is NEVER activated during simulation; this is a pure what-if projection.
Activation is handled via an explicit, separate manager-only endpoint.
"""
from datetime import datetime, timezone
from types import SimpleNamespace

from sqlalchemy.orm import Session

from .. import models
from ..ai import explain_simulation
from ..ids import new_id
from ..rule_engine import run_rules
from ..services.audit import record


# Rule codes that each change type can actually relax.
_BACKGROUND_RULES = {"BR-01", "IM-03"}
_CLEAR_SPACE_RULES = {"LO-02", "SM-01"}
_TYPEFACE_RULES = {"TY-01"}


def _asset_from_submission(sub: models.Submission) -> SimpleNamespace:
    """Wrap a submission's asset_* columns into the shape run_rules expects."""
    return SimpleNamespace(
        background_colour=sub.asset_background_colour,
        clear_space_ratio=sub.asset_clear_space_ratio,
        typeface=sub.asset_typeface,
        unreadable=sub.asset_unreadable,
    )


def _change_resolves(rule, change_type: str, new_value: str, asset) -> bool:
    """True when the proposed change would make this asset pass the target rule."""
    code = rule.code
    new_value = new_value or ""

    if change_type == "add_allowed_colour" and code in _BACKGROUND_RULES:
        bg = getattr(asset, "background_colour", None)
        if bg and bg.upper() == new_value.upper():
            return True

    elif change_type == "change_clear_space" and code in _CLEAR_SPACE_RULES:
        ratio = getattr(asset, "clear_space_ratio", None)
        if ratio is not None:
            try:
                if ratio >= float(new_value):
                    return True
            except (ValueError, TypeError):
                pass

    elif change_type == "change_typeface" and code in _TYPEFACE_RULES:
        tf = getattr(asset, "typeface", None)
        if tf:
            allowed = [t.strip() for t in new_value.split(",")]
            if tf in allowed:
                return True

    return False


def patched_run_rules(active_rules, text: str, channel: str, asset,
                      target_rule, change_type: str, new_value: str):
    """Run the active rule set, dropping the target rule's finding when the
    proposed change relaxes it for this asset.

    For ``change_text_condition`` the engine is run unmodified (deterministic
    re-evaluation); the relaxation is surfaced only in the insight text.
    """
    findings = run_rules(active_rules, text, channel, asset)
    if change_type == "change_text_condition":
        return findings
    return [
        f for f in findings
        if not (f.rule_code == target_rule.code
                and _change_resolves(target_rule, change_type, new_value, asset))
    ]


def _impact_of(findings) -> str:
    if not findings:
        return "Compliant"
    if any(f.severity == "High" for f in findings):
        return "Non-Compliant"
    return "Needs Review"


def _latest_text(sub: models.Submission) -> str:
    if sub.versions:
        return sub.versions[-1].text
    return ""


def run_simulation(db: Session, *, name: str, rule_id: str, change_type: str,
                   current_value: str, new_value: str, user_id: str,
                   workspace: str = "PureGlow") -> models.Simulation:
    target_rule = db.get(models.Rule, rule_id)
    if target_rule is None:
        raise ValueError(f"Rule {rule_id} not found")

    # Snapshot target rule attributes before simulation run to verify immutability
    prev_condition = target_rule.condition
    prev_status = target_rule.status

    rule_query = db.query(models.Rule).filter(models.Rule.status == "active")
    sub_query = db.query(models.Submission)
    if workspace:
        rule_query = rule_query.filter(
            (models.Rule.workspace == workspace)
            | (models.Rule.workspace.is_(None))
            | (models.Rule.workspace == "PureGlow")
        )
        sub_query = sub_query.filter(
            (models.Submission.workspace == workspace)
            | (models.Submission.workspace.is_(None))
            | (models.Submission.workspace == "PureGlow")
        )

    active_rules = rule_query.all()
    submissions = sub_query.all()

    items: list[dict] = []
    cleared = 0
    current_totals = {"checked": 0, "compliant": 0, "needsReview": 0, "nonCompliant": 0}
    new_totals = {"checked": 0, "compliant": 0, "needsReview": 0, "nonCompliant": 0}

    newly_flagged_list = []
    resolved_list = []
    unchanged_list = []

    for sub in submissions:
        asset = _asset_from_submission(sub)
        text = _latest_text(sub)
        channel = sub.channel

        baseline = run_rules(active_rules, text, channel, asset)
        proposed = patched_run_rules(active_rules, text, channel, asset,
                                     target_rule, change_type, new_value)

        current_impact = _impact_of(baseline)
        new_impact = _impact_of(proposed)

        current_totals["checked"] += 1
        current_totals[_impact_key(current_impact)] += 1
        new_totals["checked"] += 1
        new_totals[_impact_key(new_impact)] += 1

        if current_impact != "Compliant" and new_impact == "Compliant":
            cleared += 1
            resolved_list.append({"id": sub.id, "title": sub.title, "brand": sub.brand})
        elif current_impact == "Compliant" and new_impact != "Compliant":
            newly_flagged_list.append({"id": sub.id, "title": sub.title, "brand": sub.brand})
        else:
            unchanged_list.append({"id": sub.id, "title": sub.title, "brand": sub.brand})

        baseline_codes = {f.rule_code for f in baseline}
        proposed_codes = {f.rule_code for f in proposed}
        resolved = sorted(baseline_codes - proposed_codes)

        if current_impact != "Compliant" and new_impact == "Compliant":
            note = (f"Relaxing {target_rule.code} to '{new_value}' clears all "
                    f"flagged issues for this asset.")
        elif resolved:
            note = f"Change removes flags: {', '.join(resolved)} no longer flagged."
        else:
            note = "No change in status for this asset under the proposed rule."

        items.append({
            "submissionId": sub.id,
            "title": sub.title,
            "meta": f"{sub.brand} · {sub.type}",
            "thumb": {"kind": sub.thumb_kind, "palette": sub.thumb_palette, "glyph": sub.thumb_glyph},
            "type": sub.type,
            "currentStatus": sub.status,
            "impact": new_impact,
            "note": note,
        })

    # Check potential conflicts and exceptions needing attention
    from .rules import _direction
    exceptions = db.query(models.ExceptionRequest).filter(
        models.ExceptionRequest.rule_code == target_rule.code,
        models.ExceptionRequest.status == "Approved"
    ).all()
    exceptions_needing_attention = [
        {"id": ex.id, "code": ex.code, "reason": ex.reason, "scope": ex.scope}
        for ex in exceptions
    ]

    potential_conflicts_count = 0
    dir_change = _direction(new_value)
    for r in active_rules:
        if r.code != target_rule.code and r.subject == target_rule.subject:
            dir_r = _direction(r.condition)
            if dir_change and dir_r and dir_change != dir_r:
                potential_conflicts_count += 1

    breakdown = {
        "newlyFlagged": {
            "count": len(newly_flagged_list),
            "items": newly_flagged_list[:10],
        },
        "resolved": {
            "count": len(resolved_list),
            "items": resolved_list[:10],
        },
        "unchanged": {
            "count": len(unchanged_list),
            "items": unchanged_list[:10],
        },
        "potentialConflicts": potential_conflicts_count,
        "exceptionsNeedingAttention": {
            "count": len(exceptions_needing_attention),
            "items": exceptions_needing_attention[:10],
        },
    }

    totals = new_totals
    insight = _build_insight(target_rule.code, change_type, current_value, new_value,
                             cleared, current_totals, new_totals)

    ai_note = explain_simulation(target_rule.code, change_type, current_value or "",
                                 new_value or "", totals)
    if ai_note:
        insight.append(ai_note)

    sim_id = new_id("sim")
    sim = models.Simulation(
        id=sim_id,
        workspace=workspace or "PureGlow",
        name=name,
        rule_id=rule_id,
        rule_code=target_rule.code,
        change_type=change_type,
        current_value=current_value or "",
        new_value=new_value or "",
        status="Completed",
        created_at=datetime.now(timezone.utc),
        created_by_id=user_id,
        items=items,
        insight=insight,
        totals=totals,
        breakdown=breakdown,
    )
    db.add(sim)

    # Store proposed rule in proposed_rules table
    proposed_rule = models.ProposedRule(
        id=new_id("prop"),
        workspace=workspace or "PureGlow",
        simulation_id=sim_id,
        target_rule_id=rule_id,
        target_rule_code=target_rule.code,
        change_type=change_type,
        current_value=current_value or "",
        proposed_value=new_value or "",
        status="simulated",
        created_by_id=user_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(proposed_rule)

    record(db, action="Simulation", entity_title=name, entity_meta=target_rule.code,
           entity_kind="simulation", entity_id=sim.id, user_id=user_id,
           details=f"{change_type}: {current_value or ''} -> {new_value or ''}",
           workspace=workspace or "PureGlow")

    db.commit()
    db.refresh(sim)

    # Prove active rule was not modified by the simulation run
    db.refresh(target_rule)
    assert target_rule.condition == prev_condition, "Target rule condition was modified during simulation!"
    assert target_rule.status == prev_status, "Target rule status was modified during simulation!"

    return sim


def activate_simulation_proposal(db: Session, sim_id: str, manager_id: str) -> tuple[models.Rule, models.Simulation]:
    """Explicit separate manager-only endpoint to activate a proposed rule from a simulation."""
    sim = db.get(models.Simulation, sim_id)
    if not sim:
        raise ValueError(f"Simulation {sim_id} not found")

    target_rule = db.get(models.Rule, sim.rule_id)
    if not target_rule:
        target_rule = db.query(models.Rule).filter(models.Rule.code == sim.rule_code).first()
    if not target_rule:
        raise ValueError(f"Rule for simulation {sim_id} not found")

    now = datetime.now(timezone.utc)

    # Apply proposed change to active rule
    if sim.change_type == "add_allowed_colour":
        existing = target_rule.condition or ""
        target_rule.condition = f"{existing}; Allowed color includes {sim.new_value}".strip("; ")
    elif sim.change_type == "change_clear_space":
        target_rule.condition = f"Clear space ratio must be at least {sim.new_value}x"
    elif sim.change_type == "change_typeface":
        target_rule.condition = f"Permitted typefaces: {sim.new_value}"
    elif sim.change_type == "change_text_condition":
        target_rule.condition = sim.new_value

    target_rule.status = "active"

    # Mark proposed rule as activated
    proposed = (
        db.query(models.ProposedRule)
        .filter(models.ProposedRule.simulation_id == sim_id)
        .first()
    )
    if proposed:
        proposed.status = "activated"
        proposed.activated_at = now
        proposed.activated_by_id = manager_id

    sim.status = "Activated"

    record(
        db,
        action="Rule updated",
        entity_title=target_rule.title,
        entity_meta=target_rule.code,
        brand=target_rule.workspace or "PureGlow",
        user_id=manager_id,
        details=f"Activated proposed changes from simulation '{sim.name}': {sim.new_value}",
        entity_kind="rule",
        entity_id=target_rule.id,
        workspace=target_rule.workspace or "PureGlow",
    )

    db.commit()
    db.refresh(target_rule)
    db.refresh(sim)
    return target_rule, sim


def _impact_key(impact: str) -> str:
    return {"Compliant": "compliant",
            "Needs Review": "needsReview",
            "Non-Compliant": "nonCompliant"}[impact]


def _build_insight(rule_code, change_type, current_value, new_value,
                   cleared, current_totals, new_totals) -> list[str]:
    insight: list[str] = []
    if change_type == "change_text_condition":
        insight.append(
            f"Re-evaluating {rule_code} against the proposed condition leaves "
            f"{new_totals['needsReview']} asset(s) needing manual review."
        )
    elif cleared > 0:
        insight.append(
            f"Relaxing {rule_code} to '{new_value}' clears {cleared} "
            f"previously flagged asset(s)."
        )
    else:
        insight.append(
            f"Relaxing {rule_code} to '{new_value}' does not change the "
            f"flagged set with current assets."
        )

    insight.append(
        f"Compliant assets: {current_totals['compliant']} → {new_totals['compliant']}; "
        f"Non-compliant: {current_totals['nonCompliant']} → {new_totals['nonCompliant']}."
    )

    if new_totals["nonCompliant"] > 0:
        insight.append(
            f"{new_totals['nonCompliant']} asset(s) remain non-compliant and still need attention."
        )
    return insight[:4]


def simulation_to_dict(s) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "ruleId": s.rule_id,
        "ruleCode": s.rule_code,
        "changeType": s.change_type,
        "currentValue": s.current_value,
        "newValue": s.new_value,
        "status": s.status,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
        "createdById": s.created_by_id,
        "items": s.items or [],
        "insight": s.insight or [],
        "totals": s.totals or {},
        "breakdown": getattr(s, "breakdown", {}) or {},
        "workspace": getattr(s, "workspace", "PureGlow"),
    }
