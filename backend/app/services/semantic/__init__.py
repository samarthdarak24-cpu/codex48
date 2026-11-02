"""A2 Evidence Intelligence building blocks.

Layout follows the blueprint (section 4.2). The retrieval, reviewer and
citation-validation logic lives in :mod:`app.services.evidence` and
:mod:`app.services.semantic.citation`; this package owns the pieces that need
their own lifecycle:

* :mod:`app.services.semantic.embeddings` — local multilingual ONNX encoder
  (loaded once, lazy), with an honest "not available" state.
* :mod:`app.services.semantic.citation` — strict citation validator and heuristic
  rule proposal miners.
"""
from __future__ import annotations

from .embeddings import DEFAULT_MODEL, DEFAULT_TOKENIZER, OnnxEncoder, encoder_status, get_encoder
from .citation import (
    CitationValidationResult,
    DraftRuleProposal,
    normalize_text_for_match,
    validate_citation,
    extract_draft_rules_from_passages,
    search_passages_hybrid,
    log_ai_interaction,
)

__all__ = [
    "DEFAULT_MODEL",
    "DEFAULT_TOKENIZER",
    "OnnxEncoder",
    "encoder_status",
    "get_encoder",
    "CitationValidationResult",
    "DraftRuleProposal",
    "normalize_text_for_match",
    "validate_citation",
    "extract_draft_rules_from_passages",
    "search_passages_hybrid",
    "log_ai_interaction",
]
