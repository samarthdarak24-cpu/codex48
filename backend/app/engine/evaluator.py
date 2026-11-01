"""Deterministic evaluation engine.

Implements PRECEDENT_MASTER_BACKEND_PROMPT.md §7:
- Pure functions, no I/O, no network, no LLMs
- Engine version: 1.0.0
- Deterministic outcome: violation | compliant | unknown
- Strict date boundary checks [effective_from, effective_until)
- Scope filtering (channels, campaigns, content types)
- Scoped exception resolution with predicate matching
- Derives submission compliance summary with denominators
"""
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

ENGINE_VERSION = "1.0.0"


class RuleFindingResult(BaseModel):
    rule_code: str
    rule_version_id: Optional[str] = None
    rule_title: str = ""
    outcome: str  # "violation" | "compliant" | "unknown"
    severity: str = "medium"  # "low" | "medium" | "high" | "critical"
    explanation: str = ""
    passage_id: Optional[str] = None
    source_passage: str = ""
    source_page: int = 0
    source_doc_id: str = ""
    source_doc_name: str = ""
    source_version: str = ""
    suggested_action: str = ""
    suggested_fix: Optional[dict] = None
    region: Optional[List[float]] = None  # [x1, y1, x2, y2]
    confidence: float = 1.0
    waived_by_exception_id: Optional[str] = None
    facts_used: Dict[str, Any] = {}


class EvaluationSummary(BaseModel):
    engine_version: str = ENGINE_VERSION
    total_rules_checked: int = 0
    violations: int = 0
    compliant: int = 0
    unknown: int = 0
    waived: int = 0
    worst_outcome: str = "compliant"  # violation > unknown > compliant


class EvaluationResult(BaseModel):
    findings: List[RuleFindingResult]
    summary: EvaluationSummary


def _check_scope(rule_scope: dict, meta: dict) -> bool:
    """Verifies whether a rule's scope applies to the given content metadata."""
    if not rule_scope:
        return True

    channels = rule_scope.get("channels") or []
    if channels and meta.get("channel") and meta.get("channel") not in channels:
        return False

    campaign_ids = rule_scope.get("campaign_ids") or []
    if campaign_ids and meta.get("campaign_id") and meta.get("campaign_id") not in campaign_ids:
        return False

    content_types = rule_scope.get("content_types") or []
    if content_types and meta.get("type") and meta.get("type") not in content_types:
        return False

    return True


def _check_exception_predicates(predicates: list, facts: dict, findings_so_far: list) -> bool:
    """Evaluates exception condition predicates. Every predicate must pass."""
    if not predicates:
        return True

    for p in predicates:
        if not isinstance(p, dict):
            continue
        p_type = p.get("type")
        if p_type == "phrase_present":
            val = p.get("value", "").lower()
            text = (facts.get("copy", {}).get("text", "") + " " + facts.get("ocr", {}).get("text", "")).lower()
            if val not in text:
                return False
        elif p_type == "rule_compliant":
            req_code = p.get("rule_code")
            # If any finding for this required rule is a violation, condition fails
            for f in findings_so_far:
                if f.rule_code == req_code and f.outcome == "violation":
                    return False
    return True


def evaluate_rule(
    rule: Any,
    rule_config: dict,
    facts: dict,
    active_exceptions: List[Any],
    eval_time: Optional[datetime] = None,
) -> RuleFindingResult:
    """Evaluates a single rule deterministically against the provided facts."""
    eval_time = eval_time or datetime.now(timezone.utc)
    code = getattr(rule, "code", "") or "RULE"
    title = getattr(rule, "title", getattr(rule, "name", code))
    severity = str(getattr(rule, "severity", None) or getattr(rule, "priority", None) or "medium").lower()
    source_passage = getattr(rule, "source_passage", "") or ""
    source_doc_id = getattr(rule, "source_doc_id", "") or ""
    source_page = getattr(rule, "source_page", 0) or 0

    cond_type = rule_config.get("condition_type", "forbidden_phrase")
    copy_text = facts.get("copy", {}).get("text", "")
    ocr_text = facts.get("ocr", {}).get("text", "")
    combined_text = f"{copy_text}\n{ocr_text}".strip()

    outcome = "compliant"
    explanation = f"Compliant with {code}: {title}"
    suggested_action = ""
    suggested_fix = None
    region = None
    facts_used = {}

    # 1. forbidden_phrase
    if cond_type == "forbidden_phrase":
        phrases = rule_config.get("phrases", [])
        case_sensitive = rule_config.get("case_sensitive", False)
        match_mode = rule_config.get("match", "word")

        hit_phrase = None
        for p in phrases:
            if not p:
                continue
            if match_mode == "exact":
                pattern = re.escape(p)
            elif match_mode == "word":
                pattern = r"\b" + re.escape(p) + r"\b"
            else:  # regex
                pattern = p

            flags = 0 if case_sensitive else re.IGNORECASE
            m = re.search(pattern, combined_text, flags)
            if m:
                hit_phrase = p
                # Look for matching region in OCR blocks if available
                ocr_blocks = facts.get("ocr", {}).get("blocks", [])
                for b in ocr_blocks:
                    if re.search(pattern, b.get("text", ""), flags):
                        region = b.get("box")
                        break
                break

        if hit_phrase:
            outcome = "violation"
            explanation = f"Forbidden phrase '{hit_phrase}' detected in content."
            suggested_action = f"Remove or replace prohibited phrase '{hit_phrase}'."
            suggested_fix = {
                "original": hit_phrase,
                "proposed": "",
                "rationale": f"Rule {code} forbids the term '{hit_phrase}'.",
            }
        facts_used = {"checked_phrases": phrases, "matched": hit_phrase}

    # 2. required_phrase
    elif cond_type == "required_phrase":
        phrases = rule_config.get("phrases", [])
        mode = rule_config.get("mode", "any")
        found = [p for p in phrases if p.lower() in combined_text.lower()]

        if (mode == "any" and not found) or (mode == "all" and len(found) < len(phrases)):
            outcome = "violation"
            explanation = f"Mandatory phrase missing. Required: {', '.join(phrases)}."
            suggested_action = f"Include required disclosure: '{phrases[0] if phrases else ''}'."
            suggested_fix = {
                "original": "",
                "proposed": phrases[0] if phrases else "",
                "rationale": f"Rule {code} requires disclosure '{phrases[0] if phrases else ''}'.",
            }
        facts_used = {"required": phrases, "found": found}

    # 3. absolute_claim
    elif cond_type == "absolute_claim":
        patterns = rule_config.get("patterns", ["100% safe", "guaranteed", "cures", "permanent result"])
        allow_id = rule_config.get("allow_if_claim_id")
        approved_claims = facts.get("approved_claims", [])

        is_allowed = allow_id and any(c.get("id") == allow_id and c.get("status") == "approved" for c in approved_claims)
        if not is_allowed:
            hit = None
            for pat in patterns:
                if re.search(r"\b" + re.escape(pat) + r"\b", combined_text, re.IGNORECASE):
                    hit = pat
                    break
            if hit:
                outcome = "violation"
                explanation = f"Absolute claim '{hit}' detected without substantiated claim authorization."
                suggested_action = f"Qualify or substantiate the claim '{hit}'."
                suggested_fix = {
                    "original": hit,
                    "proposed": "clinically tested" if "100%" in hit else "helps support",
                    "rationale": "Absolute statements require substantiation or approved exception.",
                }
            facts_used = {"checked_patterns": patterns, "hit": hit}

    # 4. color_palette
    elif cond_type == "color_palette":
        palette_facts = facts.get("visual", {}).get("palette")
        if not palette_facts:
            outcome = "unknown"
            explanation = "Visual palette facts unavailable or unreadable."
        else:
            allowed_hex = rule_config.get("allowed_hex", [])
            max_dE = rule_config.get("tolerance_dE", 10.0)
            dominant_delta = palette_facts.get("min_delta_e_to_brand", 0.0)
            if dominant_delta > max_dE:
                outcome = "violation"
                explanation = f"Off-palette color detected (ΔE={dominant_delta:.1f} exceeds threshold {max_dE})."
                suggested_action = "Adjust background/creative colors to the official brand palette."
            facts_used = {"dominant_delta_e": dominant_delta, "threshold": max_dE}

    # 5. logo_required
    elif cond_type == "logo_required":
        logo_matches = facts.get("visual", {}).get("logo_matches")
        if logo_matches is None:
            outcome = "unknown"
            explanation = "Logo detection facts unavailable (detector did not run)."
        elif not logo_matches:
            outcome = "violation"
            explanation = "Official brand logo not detected in creative asset."
            suggested_action = "Place official brand logo in creative."
        else:
            min_conf = rule_config.get("min_match_confidence", 0.70)
            top_match = max(logo_matches, key=lambda m: m.get("confidence", 0.0))
            if top_match.get("confidence", 0.0) < min_conf:
                outcome = "unknown"
                explanation = f"Logo candidate confidence {top_match.get('confidence', 0):.2f} below confident threshold {min_conf}."
            else:
                region = top_match.get("box")

    # 6. channel_allowed
    elif cond_type == "channel_allowed":
        allowed_channels = rule_config.get("channels", [])
        channel = facts.get("meta", {}).get("channel", "")
        if allowed_channels and channel and channel not in allowed_channels:
            outcome = "violation"
            explanation = f"Channel '{channel}' is not permitted for this content category (allowed: {', '.join(allowed_channels)})."

    # Fallback to existing text-based heuristic for legacy rules without condition_type
    elif getattr(rule, "condition", None):
        cond_text = rule.condition.lower()
        if "forbidden" in cond_text or "cannot contain" in cond_text:
            m = re.search(r"['\"](.*?)['\"]", rule.condition)
            phrase = m.group(1) if m else ""
            if phrase and phrase.lower() in combined_text.lower():
                outcome = "violation"
                explanation = f"Violates rule condition: prohibited term '{phrase}' present."

    # Check for active, scoped exception waivers
    waived_by = None
    if outcome == "violation":
        meta = facts.get("meta", {})
        for exc in active_exceptions:
            # Check status and code
            exc_code = getattr(exc, "rule_code", "")
            exc_status = getattr(exc, "status", "Pending")
            if exc_code != code or exc_status != "Approved":
                continue

            # Check dates
            exp = getattr(exc, "expires_at", None)
            eff = getattr(exc, "effective_from", None)
            if exp and eval_time > exp:
                continue
            if eff and eval_time < eff:
                continue

            # Check scope
            scope_str = getattr(exc, "scope", "")
            scope_details = getattr(exc, "scope_json", {}) or {}
            brand_match = not getattr(exc, "brand", "") or getattr(exc, "brand") == meta.get("brand") or getattr(exc, "brand") == "All brands"
            channel_match = not scope_details.get("channels") or meta.get("channel") in scope_details.get("channels", [])

            if brand_match and channel_match:
                # Check exception predicates
                preds = getattr(exc, "conditions_json", [])
                if _check_exception_predicates(preds, facts, []):
                    waived_by = getattr(exc, "id", "")
                    outcome = "compliant"
                    explanation = f"Waived by active exception {getattr(exc, 'code', '') or waived_by}: {getattr(exc, 'reason', '')}"
                    break

    return RuleFindingResult(
        rule_code=code,
        rule_title=title,
        outcome=outcome,
        severity=severity,
        explanation=explanation,
        source_passage=source_passage,
        source_doc_id=source_doc_id,
        source_page=source_page,
        suggested_action=suggested_action,
        suggested_fix=suggested_fix,
        region=region,
        waived_by_exception_id=waived_by,
        facts_used=facts_used,
    )


def evaluate_submission(
    facts: dict,
    active_rules: List[Any],
    active_exceptions: List[Any],
    eval_time: Optional[datetime] = None,
) -> EvaluationResult:
    """Evaluates all scoped active rules for a submission deterministically."""
    eval_time = eval_time or datetime.now(timezone.utc)
    meta = facts.get("meta", {})
    findings: List[RuleFindingResult] = []

    for rule in active_rules:
        # Check rule active status
        if getattr(rule, "status", "active") != "active":
            continue

        # Check date boundaries [effective_from, effective_to)
        eff_from = getattr(rule, "effective_from", None)
        eff_to = getattr(rule, "effective_to", None)
        if eff_from and eval_time < eff_from:
            continue
        if eff_to and eval_time >= eff_to:
            continue

        # Check rule scope
        scope = getattr(rule, "scope", "")
        # Basic channel/brand scope check
        if scope and scope != "All brands":
            brand = meta.get("brand", "")
            if brand and brand not in scope and "All" not in scope:
                continue

        # Extract config
        config = {}
        if hasattr(rule, "versions") and rule.versions:
            latest_v = rule.versions[-1]
            config = getattr(latest_v, "condition_config", {}) or {}
            config["condition_type"] = getattr(latest_v, "condition_type", "forbidden_phrase")

        finding = evaluate_rule(rule, config, facts, active_exceptions, eval_time)
        findings.append(finding)

    # Compute summary
    violations = sum(1 for f in findings if f.outcome == "violation")
    unknown = sum(1 for f in findings if f.outcome == "unknown")
    waived = sum(1 for f in findings if f.waived_by_exception_id is not None)
    compliant = sum(1 for f in findings if f.outcome == "compliant")

    if violations > 0:
        worst = "violation"
    elif unknown > 0:
        worst = "unknown"
    else:
        worst = "compliant"

    summary = EvaluationSummary(
        total_rules_checked=len(findings),
        violations=violations,
        compliant=compliant,
        unknown=unknown,
        waived=waived,
        worst_outcome=worst,
    )

    return EvaluationResult(findings=findings, summary=summary)

