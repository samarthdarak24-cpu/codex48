"""WCAG 2.2 text-contrast checks per text region (A1).

For every OCR text block we estimate two colours:
  - background: the median colour of a ring just OUTSIDE the block
  - foreground: the dominant colour INSIDE the block that is furthest from
    that background

Then we compute the WCAG relative-luminance contrast ratio.

Thresholds (WCAG 2.2 AA):
  - normal text  4.5:1
  - large text   3.0:1   (>= 24 px, or >= 18.66 px bold)

Honest limit: this is an automated accessibility *check*, never a
certification. If a block has no measurable foreground/background split the
result is `unknown`, not a pass.
"""
from __future__ import annotations

import os
from typing import Any

try:
    from PIL import Image
except Exception:  # pragma: no cover
    Image = None  # type: ignore[assignment]


def _srgb_channel(c: float) -> float:
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(rgb: tuple[int, int, int]) -> float:
    r, g, b = (_srgb_channel(float(v)) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(rgb_a: tuple[int, int, int], rgb_b: tuple[int, int, int]) -> float:
    la = relative_luminance(rgb_a)
    lb = relative_luminance(rgb_b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def _hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(*(max(0, min(255, int(c))) for c in rgb))


def _median_colour(pixels: list[tuple[int, int, int]]) -> tuple[int, int, int] | None:
    if not pixels:
        return None
    rs = sorted(p[0] for p in pixels)
    gs = sorted(p[1] for p in pixels)
    bs = sorted(p[2] for p in pixels)
    mid = len(pixels) // 2
    return rs[mid], gs[mid], bs[mid]


def _colours_inside(img, box: tuple[int, int, int, int]) -> list[tuple[float, tuple[int, int, int]]]:
    """Quantised colours inside a block, as [(share, rgb)] sorted by share."""
    try:
        crop = img.crop(box)
        if crop.width < 2 or crop.height < 2:
            return []
        q = crop.convert("RGB").quantize(colors=4, method=Image.MEDIANCUT)
        pal = q.getpalette() or []
        counts = q.getcolors(crop.width * crop.height) or []
        if not counts:
            return []
        total = sum(c for c, _ in counts) or 1
        out = []
        for count, idx in counts:
            rgb = (
                pal[idx * 3] if idx * 3 < len(pal) else 0,
                pal[idx * 3 + 1] if idx * 3 + 1 < len(pal) else 0,
                pal[idx * 3 + 2] if idx * 3 + 2 < len(pal) else 0,
            )
            out.append((count / total, rgb))
        out.sort(key=lambda t: t[0], reverse=True)
        return out
    except Exception:
        return []


def _pick_foreground(
    inside: list[tuple[float, tuple[int, int, int]]],
    bg: tuple[int, int, int],
    min_share: float = 0.05,
) -> tuple[int, int, int] | None:
    """Pick the text colour: the in-box cluster furthest from the background.

    A text block is mostly background *inside its own box* too, so taking the
    most common colour would compare the background to itself (ratio 1.0).
    Instead we choose the cluster that differs most from the ring background
    and is large enough to be glyphs rather than anti-aliasing noise.
    """
    candidates = [rgb for share, rgb in inside if share >= min_share]
    if not candidates:
        return None
    return max(candidates, key=lambda rgb: contrast_ratio(rgb, bg))


def contrast_findings(
    image_path: str,
    text_blocks: list[dict[str, Any]],
    *,
    normal_threshold: float = 4.5,
    large_threshold: float = 3.0,
    large_px: int = 24,
) -> list[dict[str, Any]]:
    """Return one finding per text block.

    Each: {"check","region","value","threshold","status","foreground",
           "background","isLargeText"}
    status is "pass" | "fail" | "unknown".
    """
    if Image is None or not image_path or not os.path.exists(image_path):
        return []

    out: list[dict[str, Any]] = []
    try:
        with Image.open(image_path) as raw:
            img = raw.convert("RGB")
            w, h = img.size
            px = img.load()

            for blk in text_blocks or []:
                box = blk.get("box") or {}
                try:
                    x, y = int(box["x"]), int(box["y"])
                    bw, bh = int(box["w"]), int(box["h"])
                except (KeyError, TypeError, ValueError):
                    continue
                if bw <= 0 or bh <= 0:
                    continue
                # Ignore low-confidence OCR noise: measuring contrast on a
                # misread speck produces a meaningless ratio.
                if float(blk.get("confidence", 0) or 0) < 0.45:
                    continue
                # A real text region carries at least three letters/digits.
                alnum = sum(ch.isalnum() for ch in (blk.get("text") or ""))
                if alnum < 3:
                    continue
                # ...and covers a meaningful area of the canvas.
                if (bw * bh) < (w * h) * 0.0004:
                    continue
                x0, y0 = max(0, x), max(0, y)
                x1, y1 = min(w, x + bw), min(h, y + bh)
                if x1 - x0 < 6 or y1 - y0 < 6:
                    continue

                # Ring just outside the block = background estimate.
                pad = max(3, min(12, bh // 3))
                ring: list[tuple[int, int, int]] = []
                for xx in range(max(0, x0 - pad), min(w, x1 + pad)):
                    for yy in (max(0, y0 - pad), min(h - 1, y1 + pad)):
                        ring.append(px[xx, yy])
                for yy in range(max(0, y0 - pad), min(h, y1 + pad)):
                    for xx in (max(0, x0 - pad), min(w - 1, x1 + pad)):
                        ring.append(px[xx, yy])

                bg = _median_colour(ring)
                inside = _colours_inside(img, (x0, y0, x1, y1))
                fg = _pick_foreground(inside, bg) if bg else None
                is_large = bh >= large_px
                threshold = large_threshold if is_large else normal_threshold

                if bg is None or fg is None:
                    out.append(
                        {
                            "check": "wcag_contrast",
                            "region": {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0},
                            "text": blk.get("text", "")[:120],
                            "value": None,
                            "threshold": threshold,
                            "status": "unknown",
                            "foreground": None,
                            "background": None,
                            "isLargeText": is_large,
                        }
                    )
                    continue

                ratio = contrast_ratio(fg, bg)
                out.append(
                    {
                        "check": "wcag_contrast",
                        "region": {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0},
                        "text": blk.get("text", "")[:120],
                        "value": round(ratio, 2),
                        "threshold": threshold,
                        "status": "pass" if ratio >= threshold else "fail",
                        "foreground": _hex(fg),
                        "background": _hex(bg),
                        "isLargeText": is_large,
                    }
                )
    except Exception:
        return out

    return out


def worst_contrast(findings: list[dict[str, Any]]) -> float | None:
    """Lowest measured ratio, or None when nothing could be measured."""
    vals = [f["value"] for f in findings or [] if isinstance(f.get("value"), (int, float))]
    return min(vals) if vals else None


def evaluate_contrast(
    image_or_path: Any,
    text_blocks: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Evaluate WCAG contrast for an image or text blocks.
    
    Returns standard summary: {"status": "pass" | "fail" | "unknown", "worst_ratio": float, "findings": list}
    """
    if isinstance(image_or_path, str):
        path = image_or_path
        cleanup = False
    else:
        import tempfile
        cleanup = True
        if hasattr(image_or_path, "save"):
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                image_or_path.save(tmp.name)
                path = tmp.name
        else:
            import cv2
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                cv2.imwrite(tmp.name, image_or_path)
                path = tmp.name

    try:
        blocks = text_blocks or []
        if not blocks:
            # If no blocks provided, check overall image luminance contrast
            try:
                with Image.open(path) as img:
                    rgb = img.convert("RGB")
                    # Sample corners vs center
                    w, h = rgb.size
                    px = rgb.load()
                    bg = px[0, 0]
                    fg = px[w // 2, h // 2]
                    ratio = contrast_ratio(fg, bg)
                    status = "pass" if ratio >= 4.5 else "fail"
                    return {
                        "status": status,
                        "ratio": round(ratio, 2),
                        "findings": [],
                    }
            except Exception:
                return {"status": "unknown", "ratio": 1.0, "findings": []}

        findings = contrast_findings(path, blocks)
        worst = worst_contrast(findings)
        status = "unknown"
        if findings:
            status = "fail" if any(f["status"] == "fail" for f in findings) else "pass"
        return {
            "status": status,
            "worst_ratio": worst,
            "findings": findings,
        }
    finally:
        if cleanup and os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass

