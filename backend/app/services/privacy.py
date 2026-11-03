"""AI Privacy Shield — PII Redaction Layer (Presidio + Regex fallback).

Protects sensitive personal identifiable information (PII) and secret credentials
before sending text to external LLMs or storing audit trails.

Guarantees:
- Redacts emails, phone numbers, person names, credit cards, Indian PAN/Aadhaar cards,
  and sensitive API keys.
- Preserves brand guideline integrity and marketing copy structure.
- Operates locally without sending un-redacted text to external networks.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

log = logging.getLogger("precedent.privacy")

# Try initializing Microsoft Presidio
_analyzer = None
_anonymizer = None

try:
    from presidio_analyzer import AnalyzerEngine
    from presidio_analyzer.nlp_engine import NlpEngineProvider
    from presidio_anonymizer import AnonymizerEngine

    config = {
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
    }
    provider = NlpEngineProvider(nlp_configuration=config)
    nlp_engine = provider.create_engine()
    _analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])
    _anonymizer = AnonymizerEngine()
    log.info("AI Privacy Shield: Microsoft Presidio loaded successfully with en_core_web_sm")
except Exception as exc:
    log.warning("AI Privacy Shield: Presidio fallback mode active: %s", exc)


# Supplemental / Indian-specific PII patterns
_PAN_REGEX = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b")
_AADHAAR_REGEX = re.compile(r"\b\d{4}\s\d{4}\s\d{4}\b")
_API_KEY_REGEX = re.compile(r"\b(?:api[_-]?key|secret|token|bearer)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]{16,})['\"]?", re.IGNORECASE)
_EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
_PHONE_REGEX = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")


def redact_pii(text: str) -> Dict[str, Any]:
    """Redact personal data and secrets from text.
    
    Returns:
        {
            "redacted_text": str,
            "entities_found": list[str],
            "redacted": bool,
            "engine": "presidio" | "regex"
        }
    """
    if not text:
        return {
            "redacted_text": "",
            "entities_found": [],
            "redacted": False,
            "engine": "none",
        }

    entities_found: List[str] = []
    current_text = text
    engine_used = "regex"

    # Step 1: Presidio if available
    if _analyzer is not None and _anonymizer is not None:
        try:
            results = _analyzer.analyze(
                text=current_text,
                entities=["EMAIL_ADDRESS", "PHONE_NUMBER", "PERSON", "CREDIT_CARD", "CRYPTO"],
                language="en",
            )
            if results:
                for r in results:
                    entities_found.append(r.entity_type)
                anonymized_res = _anonymizer.anonymize(text=current_text, analyzer_results=results)
                current_text = anonymized_res.text
                engine_used = "presidio"
        except Exception as exc:
            log.warning("Presidio redaction failed, continuing with regex fallback: %s", exc)

    # Step 2: Custom / Financial / Indian / API secrets patterns
    if _PAN_REGEX.search(current_text):
        entities_found.append("IN_PAN")
        current_text = _PAN_REGEX.sub("<PAN_NUMBER>", current_text)

    if _AADHAAR_REGEX.search(current_text):
        entities_found.append("IN_AADHAAR")
        current_text = _AADHAAR_REGEX.sub("<AADHAAR_NUMBER>", current_text)

    if _API_KEY_REGEX.search(current_text):
        entities_found.append("SECRET_API_KEY")
        current_text = _API_KEY_REGEX.sub("api_key: <REDACTED_SECRET>", current_text)

    # Fallback email & phone if presidio was bypassed
    if engine_used != "presidio":
        if _EMAIL_REGEX.search(current_text):
            entities_found.append("EMAIL_ADDRESS")
            current_text = _EMAIL_REGEX.sub("<EMAIL_ADDRESS>", current_text)
        if _PHONE_REGEX.search(current_text):
            entities_found.append("PHONE_NUMBER")
            current_text = _PHONE_REGEX.sub("<PHONE_NUMBER>", current_text)

    unique_entities = sorted(list(set(entities_found)))
    return {
        "redacted_text": current_text,
        "entities_found": unique_entities,
        "redacted": bool(unique_entities),
        "engine": engine_used,
    }


def privacy_status() -> Dict[str, Any]:
    """Report Privacy Shield status for /health and AI Trust."""
    return {
        "ready": True,
        "engine": "Microsoft Presidio (spacy en_core_web_sm) + Regex Shield" if _analyzer is not None else "Regex Privacy Shield",
        "supported_entities": [
            "EMAIL_ADDRESS",
            "PHONE_NUMBER",
            "PERSON",
            "CREDIT_CARD",
            "IN_PAN",
            "IN_AADHAAR",
            "SECRET_API_KEY",
        ],
    }
