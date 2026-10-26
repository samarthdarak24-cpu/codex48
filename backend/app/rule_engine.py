"""Deterministic rule engine — Python port of src/lib/ruleEngine.ts.

Design rules (identical to the client mirror):
  - Only explicit, testable conditions. No model calls, no guessing.
  - A check that cannot be evaluated from stored text/asset facts returns
    'unknown' rather than a false positive -> surfaced as "Needs review".
  - Every finding carries the rule's stored source passage, so a displayed
    citation always resolves to real source data. Nothing is generated.

Visual rules read AssetFacts captured at submission time. When those facts are
missing or marked unreadable, the verdict is 'unknown'.
"""
from dataclasses import dataclass
from typing import Any, Optional

import re

# Rules whose condition needs asset-level data the text engine cannot read.
VISUAL_ONLY_RULES = ["BR-01", "LO-02", "IM-03", "SM-01"]

# Approved campaign background palette (Colour Palette Guide v1.0, §1.2).
APPROVED_BACKGROUNDS = ["#7AB93B", "#F4EFE3"]
APPROVED_TYPEFACES = ["Inter", "Instrument Serif"]
# LO-02 minimum clear space, in × logo height.
CLEAR_SPACE_MIN = 1.5

URGENCY = re.compile(r"\b(hurry|don'?t miss|limited time|order now|last chance|act now|today only)\b", re.I)
SUPERLATIVE = re.compile(r"\b(100%\s*safe|guaranteed|no risk|perfect|best[- ]in[- ]class|miracle)\b", re.I)
HEALTH = re.compile(r"\b(immun(e|ity)|boosts?\s+immun|detox|cures?|heals?|treats?\s+\w+)\b", re.I)
DISCOUNT = re.compile(r"\b(\d{1,2})\s*%\s*(off|discount|savings?)\b", re.I)
DISCLOSURE = re.compile(r"paid partnership", re.I)
UNAPPROVED_CLAIMS = [
    (re.compile(r"fragrance[- ]free", re.I), "made without added fragrance"),
    (re.compile(r"chemical[- ]free", re.I), "made without parabens"),
    (re.compile(r"clinically proven", re.I), "dermatologically tested"),
]
MONTHS = r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)"


@dataclass
class AssetEvaluation:
    verdict: str  # 'pass' | 'fail' | 'unknown'
    detail: str


@dataclass
class EngineFinding:
    rule_code: str
    severity: str
    type: str
    explanation: str
    suggested_fix: Optional[dict]  # {original, proposed, rationale} | None
    rule_title: str = ""
    source_doc_id: str = ""
    source_version: str = ""
    source_page: int = 0
    source_passage: str = ""
    evidence_verified: bool = False


def hex_tokens(value: str) -> list[str]:
    found = re.findall(r"#[0-9a-fA-F]{6}\b", value or "")
    return sorted({h.upper() for h in found})


def _asset_get(asset: Any, key: str, default=None):
    return getattr(asset, key, default)


def evaluate_background(asset: Any, allowed: list[str]) -> AssetEvaluation:
    if not asset or _asset_get(asset, "unreadable", False):
        return AssetEvaluation("unknown", "Asset properties could not be extracted, so this needs a human check.")
    colour = _asset_get(asset, "background_colour", None)
    if not colour:
        return AssetEvaluation("unknown", "No background colour was recorded for this asset.")
    colour = colour.upper()
    if any(a.upper() == colour for a in allowed):
        return AssetEvaluation("pass", f"Background {colour} is in the approved palette.")
    return AssetEvaluation("fail", f"Background {colour} is outside the approved palette.")


def evaluate_clear_space(asset: Any, min_ratio: float) -> AssetEvaluation:
    if not asset or _asset_get(asset, "unreadable", False):
        return AssetEvaluation("unknown", "Logo spacing could not be measured on this asset.")
    ratio = _asset_get(asset, "clear_space_ratio", None)
    if ratio is None:
        return AssetEvaluation("unknown", "No clear-space measurement was recorded.")
    if ratio >= min_ratio:
        return AssetEvaluation("pass", f"Clear space {ratio}× meets the {min_ratio}× minimum.")
    return AssetEvaluation("fail", f"Clear space {ratio}× is below the {min_ratio}× minimum.")


def evaluate_typeface(asset: Any, allowed: list[str]) -> AssetEvaluation:
    typeface = _asset_get(asset, "typeface", None)
    if not typeface:
        return AssetEvaluation("unknown", "No typeface was recorded for this asset.")
    if typeface in allowed:
        return AssetEvaluation("pass", f"Typeface {typeface} is approved.")
    return AssetEvaluation("fail", f"Typeface {typeface} is not an approved typeface.")


def _matches(text: str, pattern: re.Pattern) -> list[str]:
    found = pattern.findall(text)
    if not found:
        return []
    out: list[str] = []
    for f in found:
        out.append(f.lower() if isinstance(f, str) else " ".join(f).lower())
    return list(dict.fromkeys(out))


def evaluate_text_rule(rule: Any, text: str, channel: str) -> Optional[EngineFinding]:
    """Port of evaluateRule() from the client engine. Returns a finding or None."""
    code = rule.code

    if code == "CL-04":
        hits = _matches(text, SUPERLATIVE)
        if not hits:
            return None
        return EngineFinding(
            rule_code=code, severity="High", type="Claims",
            explanation=(f'Unsubstantiated absolute claim detected: "{hits[0]}". '
                         "Absolute terms require a substantiation reference on the same asset, or must be removed."),
            suggested_fix={"original": hits[0], "proposed": "Gentle care for sensitive skin",
                           "rationale": "Replaces the absolute claim with an approved claim covering the same benefit."},
        )

    if code == "CL-06":
        hits = _matches(text, HEALTH)
        if not hits:
            return None
        return EngineFinding(
            rule_code=code, severity="High", type="Claims",
            explanation=(f'Regulated health language detected: "{hits[0]}". '
                         "Copy may not state or imply immunity, treatment or cure benefits."),
            suggested_fix={"original": hits[0], "proposed": "feel good, naturally",
                           "rationale": "Swaps the regulated claim for an approved lifestyle phrasing."},
        )

    if code == "MK-02":
        hits = _matches(text, DISCOUNT)
        if not hits:
            return None
        has_window = re.search(r"\b(until|ends|before)\b", text, re.I) or re.search(rf"\b\d{{1,2}}\s+{MONTHS}", text, re.I)
        if has_window:
            return None
        return EngineFinding(
            rule_code=code, severity="Medium", type="Claims",
            explanation=(f'Discount claim "{hits[0]}" has no campaign window or reference price attached, '
                         "so it cannot be verified."),
            suggested_fix={"original": hits[0], "proposed": f"{hits[0]} — offer ends 31 July",
                           "rationale": "Adds the dated campaign window required by MK-02 without changing the offer value."},
        )

    if code == "TV-02":
        urgency = _matches(text, URGENCY)
        exclamations = text.count("!")
        if len(urgency) < 2 and exclamations <= 1:
            return None
        explanation = (
            f"Multiple urgency constructions detected ({', '.join(f'"{u}"' for u in urgency)}). We never pressure readers."
            if len(urgency) >= 2
            else f"Copy uses {exclamations} exclamation marks. The tone guide limits this to one per asset."
        )
        return EngineFinding(
            rule_code=code, severity="Low", type="Tone of voice",
            explanation=explanation, suggested_fix=None,
        )

    if code == "CL-03":
        for pattern, approved in UNAPPROVED_CLAIMS:
            m = pattern.search(text)
            if m:
                return EngineFinding(
                    rule_code=code, severity="Medium", type="Claims",
                    explanation=f'"{m.group(0)}" is not in the Approved Claims List. The approved wording is "{approved}".',
                    suggested_fix={"original": m.group(0), "proposed": approved,
                                   "rationale": "Uses the exact approved wording instead of a paraphrase."},
                )
        return None

    if code == "PA-05":
        if not (re.search(r"influencer|paid", channel, re.I) or re.search(r"influencer|partner", text, re.I)):
            return None
        if DISCLOSURE.search(text):
            return None
        return EngineFinding(
            rule_code=code, severity="High", type="Disclosure",
            explanation="Paid partnership asset has no disclosure line. PA-05 requires it in the first two caption lines.",
            suggested_fix={"original": "(no disclosure)", "proposed": "Paid partnership with @brand — [caption]",
                           "rationale": "Prepends the approved disclosure wording."},
        )

    return None


def evaluate_visual_rule(rule: Any, asset: Any) -> Optional[EngineFinding]:
    """Evaluate a visual-only rule against stored AssetFacts."""
    code = rule.code
    if code == "BR-01":
        ev = evaluate_background(asset, APPROVED_BACKGROUNDS)
    elif code == "LO-02":
        ev = evaluate_clear_space(asset, CLEAR_SPACE_MIN)
    elif code == "TY-01":
        ev = evaluate_typeface(asset, APPROVED_TYPEFACES)
    elif code == "IM-03":
        # Image palette: reuse background palette check.
        ev = evaluate_background(asset, APPROVED_BACKGROUNDS)
    elif code == "SM-01":
        # Social clear space: reuse clear-space check.
        ev = evaluate_clear_space(asset, CLEAR_SPACE_MIN)
    else:
        return None

    if ev.verdict == "pass":
        return None
    type_map = {"BR-01": "Brand colour", "LO-02": "Logo usage", "TY-01": "Typography",
                "IM-03": "Brand colour", "SM-01": "Logo usage"}
    return EngineFinding(
        rule_code=code,
        severity="High" if ev.verdict == "fail" else "Medium",
        type=type_map.get(code, "Brand colour"),
        explanation=ev.detail,
        suggested_fix=None,
    )


def _attach_source(f: EngineFinding, rule: Any) -> EngineFinding:
    f.rule_title = rule.title
    f.source_doc_id = rule.source_doc_id or ""
    f.source_version = rule.source_version or ""
    f.source_page = rule.source_page or 0
    f.source_passage = rule.source_passage or ""
    f.evidence_verified = bool(rule.source_passage)
    return f


def run_rules(rules: list[Any], text: str, channel: str, asset: Any = None) -> list[EngineFinding]:
    """Run the active rule set against one piece of content.

    `rules` are ORM Rule objects (must expose code/title/subject/source_* fields).
    `asset` is an object exposing background_colour / clear_space_ratio /
    typeface / unreadable (or None).
    """
    findings: list[EngineFinding] = []
    for rule in rules:
        if getattr(rule, "status", "active") != "active":
            continue
        if rule.code in VISUAL_ONLY_RULES:
            f = evaluate_visual_rule(rule, asset)
        else:
            f = evaluate_text_rule(rule, text, channel)
        if f:
            findings.append(_attach_source(f, rule))
    return findings
