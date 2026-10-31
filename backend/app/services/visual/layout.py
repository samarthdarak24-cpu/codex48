"""Poster geometry: margins, clear space, aspect ratio, density (A1).

Pure arithmetic over boxes already extracted by OCR and logo matching. No
pixels are reinterpreted here, which keeps these metrics reproducible.

Clear space is the one visual fact the existing LO-02 / SM-01 rules already
consume (`clear_space_ratio`), so the definition here matches the rule text:
the smallest gap between the logo and anything else, divided by the logo's
height. The width-relative figure is also stored for LOGO-002.
"""
from __future__ import annotations

from typing import Any


def _box(b: dict | None) -> tuple[int, int, int, int] | None:
    if not isinstance(b, dict):
        return None
    try:
        x, y = int(b["x"]), int(b["y"])
        w, h = int(b["w"]), int(b["h"])
    except (KeyError, TypeError, ValueError):
        return None
    if w <= 0 or h <= 0:
        return None
    return x, y, w, h


def _gap(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
    """Shortest distance between two axis-aligned rectangles (0 if touching)."""
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    dx = max(bx - (ax + aw), ax - (bx + bw), 0)
    dy = max(by - (ay + ah), ay - (by + bh), 0)
    return (dx * dx + dy * dy) ** 0.5


def aspect_ratio(width: int, height: int) -> str:
    """Return a reduced 'W:H' string, e.g. '4:5'. Never raises."""
    if not width or not height:
        return ""
    from math import gcd

    g = gcd(int(width), int(height)) or 1
    return f"{int(width) // g}:{int(height) // g}"


def layout_metrics(
    *,
    width: int,
    height: int,
    text_blocks: list[dict[str, Any]],
    logo_matches: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compute geometry facts for one poster.

    Returns a dict with:
      width, height, aspectRatio, aspectValue (w/h),
      margins {top,right,bottom,left} in px over all detected elements,
      textAreaRatio (fraction of canvas covered by text boxes),
      emptySpaceRatio,
      clearSpaceRatio (× logo height, min over confident logos),
      clearSpaceRatioWidth (× logo width),
      logoCount, textBlockCount,
      status ("measured" | "no_text" | "no_logo")
    """
    out: dict[str, Any] = {
        "width": int(width),
        "height": int(height),
        "aspectRatio": aspect_ratio(width, height),
        "aspectValue": round(width / height, 4) if width and height else 0.0,
        "margins": {"top": 0, "right": 0, "bottom": 0, "left": 0},
        "textAreaRatio": 0.0,
        "emptySpaceRatio": 1.0,
        "clearSpaceRatio": None,
        "clearSpaceRatioWidth": None,
        "logoCount": len(logo_matches or []),
        "textBlockCount": len(text_blocks or []),
        "status": "measured",
    }
    if not width or not height:
        out["status"] = "unreadable"
        return out

    boxes = [b for b in (_box(t.get("box")) for t in (text_blocks or [])) if b]
    logo_boxes = [b for b in (_box(l.get("box")) for l in (logo_matches or [])) if b]

    all_boxes = boxes + logo_boxes
    if all_boxes:
        # A margin is the distance from the canvas edge to the NEAREST element,
        # so all four use min(). Using max() on right/bottom would report the
        # widest empty column instead of the actual margin.
        left = min(b[0] for b in all_boxes)
        top = min(b[1] for b in all_boxes)
        right = min(width - (b[0] + b[2]) for b in all_boxes)
        bottom = min(height - (b[1] + b[3]) for b in all_boxes)
        out["margins"] = {
            "top": max(0, top),
            "right": max(0, right),
            "bottom": max(0, bottom),
            "left": max(0, left),
        }

    if boxes:
        covered = sum(b[2] * b[3] for b in boxes)
        out["textAreaRatio"] = round(min(1.0, covered / float(width * height)), 4)
    out["emptySpaceRatio"] = round(max(0.0, 1.0 - out["textAreaRatio"]), 4)

    if logo_boxes:
        # Clear space = distance from the logo to the nearest *other* element,
        # including the canvas edge.
        best_ratio = None
        best_ratio_w = None
        for i, lb in enumerate(logo_boxes):
            lx, ly, lw, lh = lb
            gaps = [lx, ly, width - (lx + lw), height - (ly + lh)]
            for j, other in enumerate(all_boxes):
                if other == lb:
                    continue
                gaps.append(_gap(lb, other))
            min_gap = max(0.0, min(gaps))
            r_h = min_gap / float(lh) if lh else 0.0
            r_w = min_gap / float(lw) if lw else 0.0
            if best_ratio is None or r_h > best_ratio:
                best_ratio = r_h
                best_ratio_w = r_w
        out["clearSpaceRatio"] = round(best_ratio, 4) if best_ratio is not None else None
        out["clearSpaceRatioWidth"] = round(best_ratio_w, 4) if best_ratio_w is not None else None

    if not boxes:
        out["status"] = "no_text"
    elif not logo_boxes:
        out["status"] = "no_logo"
    return out
