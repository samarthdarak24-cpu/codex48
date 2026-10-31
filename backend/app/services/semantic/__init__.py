"""A2 Evidence Intelligence building blocks.

Layout follows the blueprint (section 4.2). The retrieval, reviewer and
citation-validation logic lives in :mod:`app.services.evidence` (one module,
already covered by the A2 test suite); this package owns the pieces that need
their own lifecycle:

* :mod:`app.services.semantic.embeddings` — local multilingual ONNX encoder
  (loaded once, lazy), with an honest "not available" state.
"""
from __future__ import annotations

from .embeddings import DEFAULT_MODEL, DEFAULT_TOKENIZER, OnnxEncoder, encoder_status, get_encoder

__all__ = [
    "DEFAULT_MODEL",
    "DEFAULT_TOKENIZER",
    "OnnxEncoder",
    "encoder_status",
    "get_encoder",
]
