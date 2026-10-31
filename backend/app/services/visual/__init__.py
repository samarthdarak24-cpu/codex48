"""A1 VisualGuard — deterministic poster analysers.

Every function here is classical computer vision / OCR. No model guesses, no
fabricated values. When an analyser cannot measure something it returns an
explicit `unknown`/empty result, and the rule engine turns that into
"Needs review" rather than a pass or a violation.

Modules
-------
ocr          text extraction + word boxes (Tesseract)
colors       dominant background / palette extraction (Pillow quantisation)
logo_match   approved-logo detection (OpenCV template matching, multi-scale)
layout       geometry: margins, clear space, aspect ratio, density
contrast     WCAG 2.x contrast per text block (Pillow + NumPy)
pipeline     orchestration, persistence and rule-engine fact wiring
"""

from .pipeline import analyze_asset, run_pipeline  # noqa: F401

__all__ = ["analyze_asset", "run_pipeline"]
