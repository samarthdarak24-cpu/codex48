"""Simulation service — deterministic port of DataContext.runSimulation.

Builds a *modified* rule set by relaxing the target rule according to the
proposed change, then re-evaluates every submission against the patched rule
set. The live rule is NEVER activated; this is a pure what-if projection.
"""
from datetime import datetime, timezone
from types import SimpleNamespace

from sqlalchemy.orm import Session

from .. import models
from ..ai import explain_simulation
from ..ids import new_id
from ..rule_engine import run_rules, VISUAL_ONLY_RULES
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
                   current_value: str, new_value: str, user_id: str) -> models.Simulation:
    target_rule = db.get(models.Rule, rule_id)
    if target_rule is None:
        raise ValueError(f"Rule {rule_id} not found")

    active_rules = db.query(models.Rule).filter(models.Rule.status == "active").all()
    submissions = db.query(models.Submission).all()

    items: list[dict] = []
    cleared = 0
    current_totals = {"checked": 0, "compliant": 0, "needsReview": 0, "nonCompliant": 0}
    new_totals = {"checked": 0, "compliant": 0, "needsReview": 0, "nonCompliant": 0}

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

    totals = new_totals
    insight = _build_insight(target_rule.code, change_type, current_value, new_value,
                             cleared, current_totals, new_totals)

    ai_note = explain_simulation(target_rule.code, change_type, current_value or "",
                                 new_value or "", totals)
    if ai_note:
        insight.append(ai_note)

    sim = models.Simulation(
        id=new_id("sim"),
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
    )
    db.add(sim)
    record(db, action="Simulation", entity_title=name, entity_meta=target_rule.code,
           entity_kind="simulation", entity_id=sim.id, user_id=user_id,
           details=f"{change_type}: {current_value or ''} -> {new_value or ''}")
    db.commit()
    db.refresh(sim)
    return sim


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
    }
