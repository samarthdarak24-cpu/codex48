"""Local multilingual sentence embeddings (ONNX).

Blueprint 5 / 8.1: a small multilingual ONNX model runs locally, so no text
leaves the machine for retrieval. The model is loaded once at first use and
reused; if the runtime, the model file or the tokenizer is missing the encoder
reports itself unavailable and retrieval falls back to BM25 only — it never
invents a vector.

Default model: paraphrase-multilingual-MiniLM-L12-v2 (quantised ONNX export,
Apache-2.0, ~118 MB). Override with EMBEDDING_ONNX_PATH / EMBEDDING_TOKENIZER_PATH.

Encoding = mean pooling over token embeddings, then L2 normalisation, which
makes cosine similarity a plain dot product.
"""
from __future__ import annotations

import logging
import os
import threading
from typing import Optional, Sequence

log = logging.getLogger("precedent.embeddings")

# Default location relative to the backend package (backend/models/...).
_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.abspath(os.path.join(_HERE, "..", "..", "..", "models"))
# multilingual-e5-small is a retrieval model: it expects the "query:" /
# "passage:" prefixes, which is what makes paraphrase search work.
_DEFAULT_DIR = os.path.join(_MODELS_ROOT, "multilingual-e5-small")
_FALLBACK_DIR = os.path.join(_MODELS_ROOT, "paraphrase-multilingual-MiniLM-L12-v2")
DEFAULT_MODEL = os.path.join(_DEFAULT_DIR, "model_quantized.onnx")
DEFAULT_TOKENIZER = os.path.join(_DEFAULT_DIR, "tokenizer.json")


class OnnxEncoder:
    """Thread-safe wrapper around an ONNX sentence-embedding model."""

    def __init__(self, model_path: str, tokenizer_path: str, max_length: int = 256) -> None:
        self.model_path = model_path
        self.tokenizer_path = tokenizer_path
        self.max_length = max_length
        self.model_name = os.path.basename(os.path.dirname(model_path)) or "onnx"
        self._session = None
        self._tokenizer = None
        self._input_names: set[str] = set()
        self._dim: Optional[int] = None
        self._lock = threading.Lock()
        self._error: Optional[str] = None

    # -- lifecycle ---------------------------------------------------------

    @property
    def available(self) -> bool:
        return self._session is not None

    @property
    def dim(self) -> Optional[int]:
        return self._dim

    @property
    def error(self) -> Optional[str]:
        return self._error

    def load(self) -> bool:
        """Load runtime + model. Returns False (and records why) on failure."""
        if self._session is not None:
            return True
        with self._lock:
            if self._session is not None:
                return True
            if not self.model_path or not os.path.isfile(self.model_path):
                self._error = f"model file not found: {self.model_path}"
                return False
            if not self.tokenizer_path or not os.path.isfile(self.tokenizer_path):
                self._error = f"tokenizer file not found: {self.tokenizer_path}"
                return False
            try:
                import onnxruntime as ort  # type: ignore
                from tokenizers import Tokenizer  # type: ignore

                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 1
                opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                self._session = ort.InferenceSession(
                    self.model_path, sess_options=opts, providers=["CPUExecutionProvider"]
                )
                self._input_names = {i.name for i in self._session.get_inputs()}
                self._tokenizer = Tokenizer.from_file(self.tokenizer_path)
                self._tokenizer.enable_truncation(max_length=self.max_length)
                self._tokenizer.enable_padding(length=None)
                self._error = None
                return True
            except Exception as exc:  # pragma: no cover - depends on runtime
                self._error = f"{type(exc).__name__}: {exc}"
                log.warning("ONNX embedding model unavailable: %s", self._error)
                self._session = None
                return False

    # -- encoding ----------------------------------------------------------

    def _prefix(self, kind: str) -> str:
        """E5 models need asymmetric prefixes; other models must not get one."""
        if "e5" not in self.model_name.lower():
            return ""
        return "query: " if kind == "query" else "passage: "

    def encode(self, texts: Sequence[str], kind: str = "passage") -> list[list[float]]:
        """Return one unit-length vector per input. Raises if not loaded."""
        if not self.load() or self._session is None or self._tokenizer is None:
            raise RuntimeError(self._error or "embedding model not available")
        import numpy as np  # type: ignore

        prefix = self._prefix(kind)
        cleaned = [prefix + ((t or " ").strip() or " ") for t in texts]
        encodings = self._tokenizer.encode_batch(cleaned)
        max_len = max((len(e.ids) for e in encodings), default=1) or 1
        ids = np.zeros((len(encodings), max_len), dtype=np.int64)
        mask = np.zeros((len(encodings), max_len), dtype=np.int64)
        types = np.zeros((len(encodings), max_len), dtype=np.int64)
        for row, enc in enumerate(encodings):
            length = len(enc.ids)
            ids[row, :length] = enc.ids
            mask[row, :length] = enc.attention_mask
            types[row, :length] = enc.type_ids

        feeds = {"input_ids": ids, "attention_mask": mask}
        if "token_type_ids" in self._input_names:
            feeds["token_type_ids"] = types
        outputs = self._session.run(None, feeds)
        # First output is last_hidden_state: (batch, seq, dim).
        hidden = np.asarray(outputs[0], dtype=np.float32)
        if hidden.ndim == 2:  # already pooled
            pooled = hidden
        else:
            m = mask[:, :, None].astype(np.float32)
            summed = (hidden * m).sum(axis=1)
            counts = np.clip(m.sum(axis=1), 1e-9, None)
            pooled = summed / counts
        norms = np.linalg.norm(pooled, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        unit = pooled / norms
        self._dim = int(unit.shape[1])
        return unit.tolist()

    def encode_query(self, query: str) -> list[float]:
        """Encode a single query string using asymmetric query prefix."""
        res = self.encode([query], kind="query")
        return res[0] if res else []

    def encode_passage(self, passage: str) -> list[float]:
        """Encode a single passage text using asymmetric passage prefix."""
        res = self.encode([passage], kind="passage")
        return res[0] if res else []



_ENCODERS: dict[tuple[str, str], Optional[OnnxEncoder]] = {}


def get_encoder(model_path: str = "", tokenizer_path: str = "") -> Optional[OnnxEncoder]:
    """Return a cached encoder for these paths, or None when unavailable.

    The cache is keyed by path, so pointing the config at a different (or
    deliberately missing) model is honoured instead of returning a stale
    encoder from an earlier configuration. When the preferred model is absent
    the older MiniLM export is used, if it was downloaded.
    """
    path = (model_path or "").strip()
    tok = (tokenizer_path or "").strip()
    if not path:
        path = DEFAULT_MODEL if os.path.isfile(DEFAULT_MODEL) else os.path.join(_FALLBACK_DIR, "model_quantized.onnx")
    if not tok:
        tok = DEFAULT_TOKENIZER if os.path.isfile(DEFAULT_TOKENIZER) else os.path.join(_FALLBACK_DIR, "tokenizer.json")
    key = (path, tok)
    if key in _ENCODERS:
        return _ENCODERS[key]
    encoder = OnnxEncoder(path, tok)
    _ENCODERS[key] = encoder if encoder.load() else None
    return _ENCODERS[key]


def encoder_status(model_path: str = "", tokenizer_path: str = "") -> dict:
    """Non-fatal status for /health and the AI Trust panel."""
    enc = get_encoder(model_path, tokenizer_path)
    if enc is None or not enc.available:
        path = (model_path or "").strip() or DEFAULT_MODEL
        return {
            "configured": bool(path),
            "available": False,
            "model": "",
            "dim": None,
            "error": f"model unavailable at {path}",
        }
    return {
        "configured": True,
        "available": True,
        "model": enc.model_name,
        "dim": enc.dim,
        "error": None,
    }
