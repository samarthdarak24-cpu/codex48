"""Approved-logo detection (A1).

Classical multi-scale template matching with OpenCV (TM_CCOEFF_NORMED).
Deterministic and dependency-light: no deep model, no training.

Why multi-scale: a logo appears at wildly different sizes across a poster, a
story crop and a banner. We sweep plausible widths and keep the best score.

Honest limit: this is correlation, not logo understanding. A rotated or
heavily recoloured logo scores low. Below `logo_match_threshold` the result is
reported as low confidence, and the rule engine turns that into "Needs
review" — never a violation.
"""
from __future__ import annotations

import os
from typing import Any

try:
    import cv2
    import numpy as np
except Exception:  # pragma: no cover
    cv2 = None  # type: ignore[assignment]
    np = None  # type: ignore[assignment]

# Fraction of the poster width a logo is allowed to occupy.
_SCALES = (0.06, 0.08, 0.10, 0.13, 0.16, 0.20, 0.25, 0.30, 0.38, 0.46)
# Longest edge we analyse at. Keeps matching fast and stable.
_WORK_EDGE = 900


def _load_gray(path: str):
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    return img


def _best_at_scales(work, tpl, widths: list[int]) -> dict[str, Any] | None:
    """Best TM_CCOEFF_NORMED hit across a list of template widths."""
    if cv2 is None:
        return None
    wh, ww = work.shape[:2]
    best: dict[str, Any] | None = None
    for tw in widths:
        if tw < 8 or tw >= ww:
            continue
        th = max(6, int(tpl.shape[0] * (tw / float(tpl.shape[1]))))
        if th >= wh:
            continue
        try:
            resized = cv2.resize(tpl, (tw, th), interpolation=cv2.INTER_AREA)
            result = cv2.matchTemplate(work, resized, cv2.TM_CCOEFF_NORMED)
        except Exception:
            continue
        _min_v, max_v, _min_l, max_l = cv2.minMaxLoc(result)
        score = float(max_v)
        if best is None or score > best["score"]:
            best = {"score": score, "x": int(max_l[0]), "y": int(max_l[1]), "w": tw, "h": th}
    return best


def match_logos(
    image_path: str,
    logos: list[dict[str, Any]],
    threshold: float = 0.62,
    max_matches: int = 3,
) -> list[dict[str, Any]]:
    """Find approved logos inside a poster.

    Args:
        image_path: poster on disk.
        logos: [{"id","name","path"}] — approved brand-logo assets only.
        threshold: confidence at or above which a hit is a fact.
        max_matches: keep the N strongest hits.

    Returns:
        [{"logoId","name","box":{"x","y","w","h"},"confidence","method",
          "confident": bool}]

    Boxes are converted back to ORIGINAL image pixel coordinates, so the
    frontend can scale them to any display size.
    """
    if cv2 is None or np is None:
        return []
    if not image_path or not os.path.exists(image_path) or not logos:
        return []

    target = _load_gray(image_path)
    if target is None:
        return []

    h0, w0 = target.shape[:2]
    if h0 < 8 or w0 < 8:
        return []

    # Work on a downscaled copy for speed, then map coordinates back.
    ratio = 1.0
    work = target
    long_edge = max(h0, w0)
    if long_edge > _WORK_EDGE:
        ratio = _WORK_EDGE / float(long_edge)
        work = cv2.resize(target, (int(w0 * ratio), int(h0 * ratio)), interpolation=cv2.INTER_AREA)

    wh, ww = work.shape[:2]
    candidates: list[dict[str, Any]] = []

    for logo in logos:
        tpl_path = logo.get("path")
        if not tpl_path or not os.path.exists(tpl_path):
            continue
        tpl = _load_gray(tpl_path)
        if tpl is None or tpl.shape[0] < 6 or tpl.shape[1] < 6:
            continue

        best = _best_at_scales(work, tpl, [int(ww * f) for f in _SCALES])
        if best is None:
            continue

        # Refinement pass: a coarse sweep can land 10% off the true size,
        # which is enough to lose most of the correlation. Search a narrow
        # band around the winner.
        lo = max(8, int(best["w"] * 0.86))
        hi = min(ww - 1, int(best["w"] * 1.16))
        refined = _best_at_scales(work, tpl, list(range(lo, hi + 1, max(2, (hi - lo) // 10 or 2))))
        if refined is not None and refined["score"] > best["score"]:
            best = refined

        conf = round(max(0.0, min(1.0, best["score"])), 4)
        # Map back to original pixels.
        inv = 1.0 / ratio if ratio else 1.0
        box = {
            "x": int(round(best["x"] * inv)),
            "y": int(round(best["y"] * inv)),
            "w": int(round(best["w"] * inv)),
            "h": int(round(best["h"] * inv)),
        }
        candidates.append(
            {
                "logoId": logo.get("id", ""),
                "name": logo.get("name", ""),
                "box": box,
                "confidence": conf,
                "method": "template_match_multiscale",
                "confident": conf >= threshold,
            }
        )

    candidates.sort(key=lambda c: c["confidence"], reverse=True)
    return candidates[:max_matches]


# Public alias
match_logo = match_logos

