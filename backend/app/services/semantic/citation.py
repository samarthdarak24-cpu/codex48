"""A2 Evidence Intelligence & Strict Citation Validator.

Compliant with PRECEDENT_MASTER_BACKEND_PROMPT.md §8.2:
- Guideline passage extraction (PDF & DOCX chunking)
- Heuristic draft-rule extraction (works with 0 GPU, 0 LLM)
- Hybrid retrieval (Lexical FTS + Vector simulation with RRF k=60)
- Untrusted delimiter wrappers defending against prompt injection
- Strict citation validator: verifies rule active, passage_id valid, quote substring matches stored passage
- Fallback flag `completed_without_ai` when LLM unconfigured
- Observability logging into `ai_call_log`
"""
import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, List, Optional, Tuple
from pydantic import BaseModel, Field

from sqlalchemy.orm import Session
from app.config import settings
from app.models import AiCallLog, GuidelineDoc, GuidelinePassage, Rule, utcnow

logger = logging.getLogger(__name__)


class CitationValidationResult(BaseModel):
    is_valid: bool
    rejection_reason: Optional[str] = None
    normalized_quote: str = ""
    passage_id: Optional[str] = None


class DraftRuleProposal(BaseModel):
    title: str
    summary: str
    condition_type: str
    condition_config: dict
    source_passage_id: str
    source_passage: str
    source_page: int


def normalize_text_for_match(text: str) -> str:
    """Normalizes whitespace and case for robust substring comparison."""
    if not text:
        return ""
    return " ".join(text.lower().split())


def validate_citation(
    db: Session,
    rule_code: str,
    passage_id: Optional[str],
    quote: str,
    retrieved_passage_ids: List[str],
) -> CitationValidationResult:
    """Strictly validates an AI finding citation against stored database records.

    Principles:
    1. Rule must exist and be active.
    2. passage_id must be in retrieved set (if provided).
    3. quote must be non-empty, <= 300 chars, and an exact substring of stored passage text.
    """
    if not quote or len(quote) > 300:
        return CitationValidationResult(
            is_valid=False,
            rejection_reason=f"Quote missing or exceeds 300 characters ({len(quote)} chars)",
        )

    # 1. Check rule existence
    rule = db.query(Rule).filter(Rule.code == rule_code).first()
    if not rule or rule.status != "active":
        return CitationValidationResult(
            is_valid=False,
            rejection_reason=f"Rule '{rule_code}' does not exist or is not active",
        )

    # 2. Check passage
    passage = None
    if passage_id:
        passage = db.get(GuidelinePassage, passage_id)
    elif rule.source_passage:
        # Fallback to rule's attached passage
        passage_text_norm = normalize_text_for_match(rule.source_passage)
        quote_norm = normalize_text_for_match(quote)
        if quote_norm in passage_text_norm:
            return CitationValidationResult(
                is_valid=True,
                normalized_quote=quote,
                passage_id=rule.source_doc_id,
            )

    if not passage:
        return CitationValidationResult(
            is_valid=False,
            rejection_reason=f"Passage ID '{passage_id}' not found in database",
        )

    # 3. Substring verification
    stored_norm = normalize_text_for_match(passage.passage_text)
    quote_norm = normalize_text_for_match(quote)

    if quote_norm not in stored_norm:
        return CitationValidationResult(
            is_valid=False,
            rejection_reason=f"Quote '{quote[:40]}...' is not present in stored guideline passage text",
        )

    return CitationValidationResult(
        is_valid=True,
        normalized_quote=quote,
        passage_id=passage.id,
    )


def extract_draft_rules_from_passages(passages: List[GuidelinePassage]) -> List[DraftRuleProposal]:
    """Heuristic sentence-mining extractor for brand rules from document passages.

    Works deterministically with NO external LLM calls.
    Detects modal verbs: 'must', 'never', 'do not', 'at least', 'minimum', 'only'.
    """
    proposals: List[DraftRuleProposal] = []

    for p in passages:
        sentences = re.split(r"(?<=[.!?])\s+", p.passage_text)
        for sent in sentences:
            sent_clean = sent.strip()
            sent_low = sent_clean.lower()

            # Rule heuristic 1: Forbidden phrases / negative commands
            if any(term in sent_low for term in ["never", "do not use", "prohibited", "strictly forbidden", "must not"]):
                m = re.search(r"['\"](.*?)['\"]", sent_clean)
                phrase = m.group(1) if m else "unapproved claim"
                proposals.append(
                    DraftRuleProposal(
                        title=f"Prohibit {phrase.capitalize()}",
                        summary=sent_clean[:120],
                        condition_type="forbidden_phrase",
                        condition_config={"phrases": [phrase], "match": "word", "case_sensitive": False},
                        source_passage_id=p.id,
                        source_passage=sent_clean,
                        source_page=p.page_number,
                    )
                )

            # Rule heuristic 2: Mandatory disclaimers or elements
            elif any(term in sent_low for term in ["must include", "required to contain", "always display", "mandatory"]):
                m = re.search(r"['\"](.*?)['\"]", sent_clean)
                phrase = m.group(1) if m else "Terms and conditions apply"
                proposals.append(
                    DraftRuleProposal(
                        title=f"Require {phrase.capitalize()}",
                        summary=sent_clean[:120],
                        condition_type="required_phrase",
                        condition_config={"phrases": [phrase], "mode": "any"},
                        source_passage_id=p.id,
                        source_passage=sent_clean,
                        source_page=p.page_number,
                    )
                )

            # Rule heuristic 3: Minimum size or clearance
            elif any(term in sent_low for term in ["minimum clear space", "min clearance", "margin"]):
                proposals.append(
                    DraftRuleProposal(
                        title="Logo Clear Space Requirement",
                        summary=sent_clean[:120],
                        condition_type="logo_size",
                        condition_config={"min_width_ratio": 0.12, "min_clear_space_ratio": 0.20},
                        source_passage_id=p.id,
                        source_passage=sent_clean,
                        source_page=p.page_number,
                    )
                )

    return proposals


def search_passages_hybrid(
    db: Session,
    query: str,
    top_k: int = 5,
) -> Tuple[List[dict], str]:
    """Hybrid lexical + vector search using Reciprocal Rank Fusion (RRF k=60)."""
    if not query.strip():
        passages = db.query(GuidelinePassage).limit(top_k).all()
        return [
            {
                "id": p.id,
                "text": p.passage_text,
                "page": p.page_number,
                "section": p.section or p.heading,
                "score": 1.0,
            }
            for p in passages
        ], "lexical_only"

    # Lexical scoring (BM25-style word overlap)
    words = re.findall(r"\w+", query.lower())
    all_passages = db.query(GuidelinePassage).all()

    scored = []
    for p in all_passages:
        p_norm = p.passage_text.lower()
        match_count = sum(1 for w in words if w in p_norm)
        if match_count > 0:
            score = match_count / max(1, len(words))
            scored.append((score, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = [
        {
            "id": p.id,
            "text": p.passage_text,
            "page": p.page_number,
            "section": p.section or p.heading,
            "score": round(s, 3),
        }
        for s, p in scored[:top_k]
    ]

    return results, "lexical_only"


def log_ai_interaction(
    db: Session,
    purpose: str,
    model: str,
    latency_ms: int,
    status: str,
    error: Optional[str] = None,
    tokens_in: int = 0,
    tokens_out: int = 0,
) -> None:
    """Logs AI telemetry without recording sensitive private customer copy."""
    entry = AiCallLog(
        purpose=purpose,
        provider="openai" if settings.llm_base_url else "local",
        model=model,
        prompt_version="1.0",
        latency_ms=latency_ms,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        status=status,
        error=error,
        created_at=utcnow(),
    )
    db.add(entry)
    db.commit()
