"""Dominant colour extraction for posters (A1).

Deterministic: Pillow's median-cut quantiser, no clustering library, no random
seed, so the same file always yields the same palette.

Two different questions are answered here:
  - `dominant_colors`  what colours are actually in the image (a palette)
  - `background_color` what the background is, estimated from the border ring,
    which is what the brand-colour rule (COLOR-001 / BR-01) cares about
"""
from __future__ import annotations

import os
from typing import Any

try:
    from PIL import Image
except Exception:  # pragma: no cover
    Image = None  # type: ignore[assignment]


def _hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(*(max(0, min(255, int(c))) for c in rgb))


def _kmeans_palette(pixels: list[tuple[int, int, int]], k: int) -> list[dict[str, Any]] | None:
    """KMeans palette (blueprint 7.1 step 4). Deterministic seed, no RNG drift.

    Identical/near-identical centroids are merged so a flat poster reports one
    colour with ratio 1.0 instead of k equal slices. Returns None when sklearn
    is unavailable, which lets the caller fall back to median-cut.
    """
    if not pixels:
        return None
    try:
        import numpy as np
        from sklearn.cluster import KMeans
    except Exception:
        return None
    try:
        arr = np.asarray(pixels, dtype=np.float64)
        unique = np.unique(arr, axis=0)
        n_clusters = int(min(max(1, k), len(unique)))
        model = KMeans(n_clusters=n_clusters, random_state=0, n_init=3)
        labels = model.fit_predict(arr)
        centres = model.cluster_centers_
        counts = np.bincount(labels, minlength=n_clusters)

        merged: list[list[float]] = []  # [r, g, b, count]
        for centre, count in zip(centres, counts):
            r, g, b = (float(centre[0]), float(centre[1]), float(centre[2]))
            placed = False
            for bucket in merged:
                if abs(bucket[0] - r) <= 6 and abs(bucket[1] - g) <= 6 and abs(bucket[2] - b) <= 6:
                    total = bucket[3] + count
                    bucket[0] = (bucket[0] * bucket[3] + r * count) / total
                    bucket[1] = (bucket[1] * bucket[3] + g * count) / total
                    bucket[2] = (bucket[2] * bucket[3] + b * count) / total
                    bucket[3] = total
                    placed = True
                    break
            if not placed:
                merged.append([r, g, b, float(count)])

        total = float(sum(m[3] for m in merged)) or 1.0
        merged.sort(key=lambda m: -m[3])
        return [
            {"hex": _hex((m[0], m[1], m[2])), "ratio": round(m[3] / total, 4)}
            for m in merged[:k]
        ]
    except Exception:
        return None


def dominant_colors(image_path: str, k: int = 6) -> list[dict[str, Any]]:
    """Return [{"hex","ratio"}] sorted by coverage, largest first.

    Primary path: KMeans over the resized pixel grid (deterministic seed).
    Fallback: Pillow median-cut quantisation, used when scikit-learn is not
    installed — the same file still yields a stable palette either way.

    Returns [] when the image cannot be opened — callers must treat that as
    `unknown`, never as "no colours found".
    """
    if Image is None or not image_path or not os.path.exists(image_path):
        return []
    pixels: list[tuple[int, int, int]] = []
    try:
        with Image.open(image_path) as img:
            small = img.convert("RGB").resize((96, 96), Image.LANCZOS)
            pixels = list(small.getdata())
    except Exception:
        return []

    kmeans = _kmeans_palette(pixels, max(2, min(k, 16)))
    if kmeans:
        return kmeans

    try:
        with Image.open(image_path) as img:
            small = img.convert("RGB").resize((160, 160), Image.LANCZOS)
            # Median-cut quantisation: deterministic, no RNG.
            quant = small.quantize(colors=max(2, min(k, 16)), method=Image.MEDIANCUT)
            palette = quant.getpalette() or []
            counts = sorted(quant.getcolors(160 * 160) or [], reverse=True)
    except Exception:
        return []

    total = sum(c for c, _ in counts) or 1
    out: list[dict[str, Any]] = []
    for count, idx in counts[:k]:
        r = palette[idx * 3] if idx * 3 < len(palette) else 0
        g = palette[idx * 3 + 1] if idx * 3 + 1 < len(palette) else 0
        b = palette[idx * 3 + 2] if idx * 3 + 2 < len(palette) else 0
        out.append({"hex": _hex((r, g, b)), "ratio": round(count / total, 4)})
    return out


def background_color(image_path: str, band: int = 8) -> str | None:
    """Estimate the background colour from the outer border ring.

    Posters almost always carry their background to the edge, so the modal
    colour of the border ring is a far better background estimate than the
    single most common colour overall (which can be a large photo).

    Returns a hex string, or None when the image is unreadable.
    """
    if Image is None or not image_path or not os.path.exists(image_path):
        return None
    try:
        with Image.open(image_path) as img:
            rgb = img.convert("RGB")
            w, h = rgb.size
            if w < 4 or h < 4:
                return None
            band = max(1, min(band, w // 4, h // 4))
            px = rgb.load()
            counts: dict[tuple[int, int, int], int] = {}

            def bump(x: int, y: int) -> None:
                c = px[x, y]
                # Quantise to 16-level buckets so near-identical pixels merge.
                key = (c[0] // 16 * 16, c[1] // 16 * 16, c[2] // 16 * 16)
                counts[key] = counts.get(key, 0) + 1

            step = max(1, min(w, h) // 200)  # sample, don't scan every pixel
            for y in range(0, band, step or 1):
                for x in range(0, w, step):
                    bump(x, y)
                    bump(x, h - 1 - y)
            for x in range(0, band, step or 1):
                for y in range(0, h, step):
                    bump(x, y)
                    bump(w - 1 - x, y)
    except Exception:
        return None

    if not counts:
        return None
    modal = max(counts.items(), key=lambda kv: kv[1])[0]
    return _hex(modal)


def colour_distance(hex_a: str, hex_b: str) -> float:
    """Euclidean RGB distance, 0..441. Used for palette tolerance checks."""
    try:
        a = tuple(int(hex_a.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
        b = tuple(int(hex_b.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    except Exception:
        return 999.0
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def extract_palette(image_or_path: Any, k: int = 6) -> list[dict[str, Any]]:
    """Extract dominant color palette from a file path, PIL Image, or numpy array."""
    if isinstance(image_or_path, str):
        return dominant_colors(image_or_path, k)
    
    import tempfile
    # Handle PIL image
    if hasattr(image_or_path, "save"):
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            image_or_path.save(tmp.name)
            tmp_path = tmp.name
        try:
            return dominant_colors(tmp_path, k)
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass
    
    # Handle numpy ndarray
    try:
        import cv2
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            cv2.imwrite(tmp.name, image_or_path)
            tmp_path = tmp.name
        try:
            return dominant_colors(tmp_path, k)
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass
    except Exception:
        pass

    return []

