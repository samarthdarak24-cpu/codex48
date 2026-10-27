"""Configurable LLM client — graceful degradation with Pydantic-validated output.

If LLM_API_KEY / LLM_BASE_URL are not set, every helper returns None. The
caller then falls back to the deterministic rule engine. This guarantees the
product never fabricates citations or claims: AI is an assistant, not a source
of truth. The client is OpenAI-compatible (/v1/chat/completions).
"""
import json
from typing import List, Optional

from pydantic import BaseModel, ValidationError
import httpx

from .config import settings


class RuleSuggestion(BaseModel):
    code: Optional[str] = None
    title: str
    summary: str = ""
    subject: str = ""
    condition: str = ""
    priority: str = "Medium"
    sourcePassage: str = ""


class SemanticFinding(BaseModel):
    ruleCode: str
    explanation: str
    severity: str = "Medium"


class MinimalEdit(BaseModel):
    original: str
    proposed: str
    rationale: str


class SemanticConflict(BaseModel):
    ruleCodeA: str
    ruleCodeB: str
    explanation: str


def ai_available() -> bool:
    return bool(settings.llm_api_key and settings.llm_base_url)


def llm_complete(system: str, user: str, max_tokens: int = 800, temperature: float = 0.2) -> Optional[str]:
    """Return the model's text, or None on any failure / when not configured."""
    if not ai_available():
        return None
    try:
        resp = httpx.post(
            settings.llm_base_url,
            headers={"Authorization": f"Bearer {settings.llm_api_key}", "Content-Type": "application/json"},
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception:
        # Never raise into the request path; degrade to deterministic behaviour.
        return None


def _parse_json_list(text: Optional[str]) -> Optional[list]:
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        try:
            start = text.index("[")
            end = text.rindex("]") + 1
            return json.loads(text[start:end])
        except Exception:
            return None


def suggest_rules_from_text(guideline_text: str) -> Optional[list[dict]]:
    """Given extracted guideline text, suggest candidate rules with a source quote.

    Returns a list of Pydantic-validated dicts or None.
    """
    system = (
        "You are a brand-governance analyst. Given extracted guideline text, propose "
        "structured brand rules. Every rule MUST include a verbatim 'sourcePassage' "
        "quote taken directly from the supplied text — never invent or paraphrase a "
        "passage that is not present. Respond ONLY with a JSON array."
    )
    user = f"Guideline text:\n\n{guideline_text[:6000]}\n\nReturn a JSON array of rules."
    raw = _parse_json_list(llm_complete(system, user, max_tokens=1500))
    if not raw or not isinstance(raw, list):
        return None

    validated = []
    for item in raw:
        try:
            r = RuleSuggestion(**item)
            validated.append(r.model_dump())
        except (ValidationError, TypeError):
            continue
    return validated or None


def semantic_findings(text: str, rules: list[dict]) -> Optional[list[dict]]:
    """Ask the model for semantic issues mapped to EXISTING rule codes only.

    Returns [{ruleCode, explanation, severity}] or None.
    """
    if not ai_available():
        return None
    system = (
        "You review marketing copy against brand rules. Return ONLY a JSON array of "
        "objects {ruleCode, explanation, severity} where ruleCode MUST be one of the "
        "provided codes. Never invent codes or quotes. Return [] if none."
    )
    rule_list = "\n".join(
        f"- {r.get('code')}: {r.get('title')} — {r.get('summary', '')}" for r in rules
    )
    user = f"Rules:\n{rule_list}\n\nCopy:\n{text[:4000]}\n\nReturn a JSON array."
    raw = _parse_json_list(llm_complete(system, user, max_tokens=900))
    if not raw or not isinstance(raw, list):
        return None

    allowed_codes = {r.get("code") for r in rules if r.get("code")}
    validated = []
    for item in raw:
        try:
            sf = SemanticFinding(**item)
            if sf.ruleCode in allowed_codes:
                validated.append(sf.model_dump())
        except (ValidationError, TypeError):
            continue
    return validated or None


def semantic_conflicts(rules: list[dict]) -> Optional[list[dict]]:
    """Ask the model to assist identifying ambiguous semantic conflicts between rules."""
    if not ai_available() or len(rules) < 2:
        return None
    system = (
        "You identify subtle or ambiguous semantic contradictions between brand rules. "
        "Return ONLY a JSON array of {ruleCodeA, ruleCodeB, explanation}. "
        "Rule codes MUST be chosen from the provided rules list. Return [] if no ambiguity found."
    )
    rule_list = "\n".join(
        f"- {r.get('code')}: {r.get('title')} — Condition: {r.get('condition')}" for r in rules
    )
    user = f"Rules:\n{rule_list}\n\nReturn JSON array."
    raw = _parse_json_list(llm_complete(system, user, max_tokens=600))
    if not raw or not isinstance(raw, list):
        return None

    allowed_codes = {r.get("code") for r in rules if r.get("code")}
    validated = []
    for item in raw:
        try:
            sc = SemanticConflict(**item)
            if sc.ruleCodeA in allowed_codes and sc.ruleCodeB in allowed_codes:
                validated.append(sc.model_dump())
        except (ValidationError, TypeError):
            continue
    return validated or None


def explain_conflict(rule_a: dict, rule_b: dict) -> Optional[str]:
    system = "You explain brand-rule conflicts concisely for a manager. No fabrication."
    user = (
        f"Rule A ({rule_a.get('code')}): {rule_a.get('title')} — {rule_a.get('condition')}\n"
        f"Rule B ({rule_b.get('code')}): {rule_b.get('title')} — {rule_b.get('condition')}\n"
        "Explain, in 2 sentences, why these may conflict and what a manager should check."
    )
    return llm_complete(system, user)


def minimal_edit_suggestion(rule_title: str, explanation: str, current_text: str) -> Optional[dict]:
    """Suggest a minimal edit for a finding. Returns {original, proposed, rationale} or None."""
    system = (
        "You produce minimal, safe copy edits for brand-review findings. Return ONLY JSON "
        "of the form {\"original\": str, \"proposed\": str, \"rationale\": str}. Do not invent "
        "claims that are unsubstantiated."
    )
    user = (
        f"Finding: {rule_title}\nExplanation: {explanation}\nCurrent copy:\n{current_text[:1500]}\n"
        "Propose the smallest edit that resolves the finding."
    )
    raw = llm_complete(system, user, max_tokens=400)
    if not raw:
        return None
    try:
        data = json.loads(raw)
        edit = MinimalEdit(**data)
        return edit.model_dump()
    except Exception:
        return None


def explain_simulation(rule_code: str, change_type: str, current_value: str, new_value: str,
                       totals: dict) -> Optional[str]:
    system = "You summarise rule-impact simulation results for a brand manager, in 2 sentences. No fabrication."
    user = (
        f"Rule {rule_code} {change_type}: '{current_value}' -> '{new_value}'.\n"
        f"Results across stored content: {json.dumps(totals)}.\nSummarise the business impact."
    )
    return llm_complete(system, user)
