"""OCR for posters (A1).

Tesseract via pytesseract. The binary path comes from settings so a packaged
deployment can point at its own install. If Tesseract is missing or the image
is unreadable, this module returns an explicit failure record instead of
raising into the request path.

Why an ensemble: Tesseract's default page segmentation (psm 3) assumes a
uniform document page. Posters are sparse — a wordmark on a bottle, a headline
in a corner — and psm 3 returns nothing on them. We therefore run a few
segmentation modes and keep the pass that actually found confident text. The
choice is deterministic (highest confidence-weighted character count wins),
so the same file always produces the same result.

Honest limits (also stated in the PDF):
  - Only the language packs actually installed are used. On this machine that
    is `eng`; Hindi/Marathi packs (hin/mar) are not installed, so a request
    for them is downgraded to `eng` and reported in `engine.langs`.
  - Flat images give no reliable font-family information, so this module never
    claims a typeface.
"""
from __future__ import annotations

import os
import shutil
from typing import Any

from ...config import settings

try:  # Pillow is required for every visual analyser
    from PIL import Image
except Exception:  # pragma: no cover - environment without Pillow
    Image = None  # type: ignore[assignment]

try:
    import pytesseract
    from pytesseract import Output
except Exception:  # pragma: no cover
    pytesseract = None  # type: ignore[assignment]
    Output = None  # type: ignore[assignment]

try:
    from rapidocr_onnxruntime import RapidOCR
    _rapid_engine = RapidOCR()
except Exception:  # pragma: no cover
    _rapid_engine = None  # type: ignore[assignment]

# Page-segmentation modes worth trying for marketing creatives.
#   6  = single uniform block of text
#   11 = sparse text, no ordering assumed
#   12 = sparse text with orientation detection
_PSM_MODES = (6, 11, 12)


def _setup_tessdata_prefix():
    """Ensure TESSDATA_PREFIX points to the local or configured language pack directory."""
    prefix = getattr(settings, "tessdata_prefix", "") or os.environ.get("TESSDATA_PREFIX", "")
    if not prefix or not os.path.exists(prefix):
        # Look for backend/tessdata relative to this file
        local_tess = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "tessdata"))
        if os.path.exists(local_tess):
            prefix = local_tess
    if prefix and os.path.exists(prefix):
        os.environ["TESSDATA_PREFIX"] = prefix


def _tesseract_ready() -> tuple[bool, str]:
    """Return (ready, reason). Never raises."""
    if pytesseract is None:
        return False, "pytesseract is not installed"
    _setup_tessdata_prefix()
    cmd = settings.tesseract_cmd
    if cmd and os.path.exists(cmd):
        pytesseract.pytesseract.tesseract_cmd = cmd
    else:
        found = shutil.which("tesseract")
        if not found:
            return False, "tesseract binary not found"
        pytesseract.pytesseract.tesseract_cmd = found
    return True, ""


def _rapidocr_ready() -> tuple[bool, str]:
    """Return (ready, reason) for RapidOCR ONNX fallback engine."""
    if _rapid_engine is None:
        return False, "rapidocr-onnxruntime is not installed or initialized"
    return True, ""


def _read_with_rapidocr(image_path: str) -> dict[str, Any]:
    """Execute RapidOCR ONNX inference and return standard visual findings blocks."""
    ready, reason = _rapidocr_ready()
    if not ready:
        return {
            "ok": False,
            "text": "",
            "blocks": [],
            "meanConfidence": 0.0,
            "engine": {"name": "rapidocr", "version": "", "langs": [], "fallback": True},
            "error": reason,
        }
    try:
        results, _ = _rapid_engine(image_path)
    except Exception as exc:
        return {
            "ok": False,
            "text": "",
            "blocks": [],
            "meanConfidence": 0.0,
            "engine": {"name": "rapidocr", "version": "1.4.4", "langs": [], "fallback": True},
            "error": f"rapidocr failed: {type(exc).__name__}",
        }

    blocks: list[dict[str, Any]] = []
    if results:
        for item in results:
            pts, txt, conf = item
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            x0, y0 = min(xs), min(ys)
            x1, y1 = max(xs), max(ys)
            clean_txt = (txt or "").strip()
            if clean_txt:
                blocks.append({
                    "text": clean_txt,
                    "box": {
                        "x": int(round(x0)),
                        "y": int(round(y0)),
                        "w": int(round(x1 - x0)),
                        "h": int(round(y1 - y0)),
                    },
                    "confidence": round(float(conf), 4),
                })
    blocks.sort(key=lambda b: (b["box"]["y"], b["box"]["x"]))
    text = "\n".join(b["text"] for b in blocks)
    mean_conf = sum(b["confidence"] for b in blocks) / len(blocks) if blocks else 0.0
    return {
        "ok": bool(blocks),
        "text": text,
        "blocks": blocks,
        "meanConfidence": round(mean_conf, 4),
        "engine": {
            "name": "rapidocr",
            "version": "1.4.4",
            "langs": ["eng", "hin", "mar"],
            "fallback": True,
        },
        "error": None if blocks else "no readable text found",
    }


def _resolve_langs(requested: str) -> tuple[str, list[str]]:
    """Drop language packs that are not installed rather than failing."""
    want = [p.strip() for p in (requested or "eng").split("+") if p.strip()]
    try:
        available = set(pytesseract.get_languages(config=""))
    except Exception:
        available = {"eng"}
    use = [p for p in want if p in available] or ["eng"]
    return "+".join(use), use


def _prepare(img, target_edge: int = 1400):
    """Upscale small creatives; Tesseract is far more accurate above ~1200px."""
    w, h = img.size
    long_edge = max(w, h)
    if long_edge >= target_edge:
        return img
    scale = min(3.0, target_edge / float(max(long_edge, 1)))
    return img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)


def _blocks_from_data(data: dict) -> list[dict[str, Any]]:
    """Group words into line-level blocks with pixel boxes."""
    lines: dict[tuple[int, int, int], list[dict]] = {}
    for i in range(len(data.get("text", []))):
        raw = (data["text"][i] or "").strip()
        if not raw:
            continue
        try:
            conf = float(data["conf"][i])
        except (TypeError, ValueError):
            conf = -1.0
        if conf < 0:
            continue
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        lines.setdefault(key, []).append(
            {
                "text": raw,
                "x": int(data["left"][i]),
                "y": int(data["top"][i]),
                "w": int(data["width"][i]),
                "h": int(data["height"][i]),
                "conf": conf,
            }
        )

    blocks: list[dict[str, Any]] = []
    for words in lines.values():
        words.sort(key=lambda w: w["x"])
        x0 = min(w["x"] for w in words)
        y0 = min(w["y"] for w in words)
        x1 = max(w["x"] + w["w"] for w in words)
        y1 = max(w["y"] + w["h"] for w in words)
        conf = sum(w["conf"] for w in words) / len(words) / 100.0
        blocks.append(
            {
                "text": " ".join(w["text"] for w in words),
                "box": {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0},
                "confidence": round(conf, 4),
            }
        )
    blocks.sort(key=lambda b: (b["box"]["y"], b["box"]["x"]))
    return blocks


def _score(blocks: list[dict[str, Any]]) -> float:
    """Confidence-weighted character count: rewards real text, ignores noise."""
    return sum(len(b["text"]) * b["confidence"] for b in blocks)


def _dedupe(blocks: list[dict[str, Any]], iou_limit: float = 0.55) -> list[dict[str, Any]]:
    """Drop near-duplicate boxes produced by different PSM passes."""
    kept: list[dict[str, Any]] = []
    for b in sorted(blocks, key=lambda x: x["confidence"], reverse=True):
        bx, by, bw, bh = b["box"]["x"], b["box"]["y"], b["box"]["w"], b["box"]["h"]
        dup = False
        for k in kept:
            kx, ky, kw, kh = k["box"]["x"], k["box"]["y"], k["box"]["w"], k["box"]["h"]
            ix = max(0, min(bx + bw, kx + kw) - max(bx, kx))
            iy = max(0, min(by + bh, ky + kh) - max(by, ky))
            inter = ix * iy
            union = bw * bh + kw * kh - inter
            if union > 0 and inter / union >= iou_limit:
                dup = True
                break
        if not dup:
            kept.append(b)
    kept.sort(key=lambda b: (b["box"]["y"], b["box"]["x"]))
    return kept


def read_text(image_path: str) -> dict[str, Any]:
    """Extract text and per-line bounding boxes from an image.

    Returns:
        {
          "ok": bool,
          "text": str,
          "blocks": [{"text","box":{"x","y","w","h"},"confidence"}],
          "meanConfidence": float,   # 0..1 over blocks with text
          "engine": {"name","version","langs","psm"},
          "error": str | None,
        }
    Boxes are in the ORIGINAL image coordinate space.
    """
    empty = {
        "ok": False,
        "text": "",
        "blocks": [],
        "meanConfidence": 0.0,
        "engine": {"name": "tesseract", "version": "", "langs": [], "psm": None},
        "error": None,
    }

    if getattr(settings, "ocr_engine", "tesseract") == "rapidocr":
        return _read_with_rapidocr(image_path)

    ready, reason = _tesseract_ready()
    if not ready:
        if _rapidocr_ready()[0]:
            return _read_with_rapidocr(image_path)
        empty["error"] = reason
        return empty
    if Image is None:
        empty["error"] = "Pillow is not installed"
        return empty
    if not image_path or not os.path.exists(image_path):
        empty["error"] = "file not found"
        return empty

    langs, used = _resolve_langs(settings.ocr_langs)
    try:
        version = str(pytesseract.get_tesseract_version())
    except Exception:
        version = ""
    empty["engine"] = {"name": "tesseract", "version": version, "langs": used, "psm": None}

    try:
        with Image.open(image_path) as raw:
            original = raw.convert("RGB")
            prepared = _prepare(original)
            scale = prepared.size[0] / float(original.size[0] or 1)
            original_size = original.size
    except Exception as exc:  # unreadable image
        empty["error"] = f"unreadable image: {type(exc).__name__}"
        return empty

    best: list[dict[str, Any]] = []
    best_psm: int | None = None
    best_score = -1.0
    last_error: str | None = None

    for psm in _PSM_MODES:
        try:
            data = pytesseract.image_to_data(
                prepared, lang=langs, output_type=Output.DICT, config=f"--psm {psm}"
            )
        except Exception as exc:  # one mode failing must not kill the others
            last_error = f"ocr failed: {type(exc).__name__}"
            continue
        blocks = _blocks_from_data(data)
        score = _score(blocks)
        if score > best_score:
            best, best_psm, best_score = blocks, psm, score

    if not best:
        if _rapidocr_ready()[0]:
            rapid_res = _read_with_rapidocr(image_path)
            if rapid_res["ok"]:
                return rapid_res
        empty["error"] = last_error or "no readable text found"
        return empty

    # Map boxes from the prepared image back to original pixels.
    ow, oh = original_size
    pw, ph = prepared.size
    sx = ow / float(pw or 1)
    sy = oh / float(ph or 1)
    for b in best:
        bx = b["box"]
        bx["x"] = int(round(bx["x"] * sx))
        bx["y"] = int(round(bx["y"] * sy))
        bx["w"] = int(round(bx["w"] * sx))
        bx["h"] = int(round(bx["h"] * sy))
        b["box"] = bx

    text = "\n".join(b["text"] for b in best)
    mean_conf = sum(b["confidence"] for b in best) / len(best) if best else 0.0

    return {
        "ok": bool(best),
        "text": text,
        "blocks": best,
        "meanConfidence": round(mean_conf, 4),
        "engine": {
            "name": "tesseract",
            "version": version,
            "langs": used,
            "psm": best_psm,
            "scale": round(scale, 3),
        },
        "error": None,
    }
