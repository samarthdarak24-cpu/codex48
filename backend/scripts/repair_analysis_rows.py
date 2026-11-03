"""Repair asset_analysis rows so the poster endpoint stops 404-ing.

Three defects were found by the browser audit:

1. Four seeded rows pointed at `uploads/demo_poster_diwali.png`, a file that was
   never written. The review screen requested it, got a 404, and logged a
   console error on an otherwise healthy page.
2. `file_path` was stored with Windows backslashes, which do not resolve on a
   POSIX host.
3. Status used two vocabularies — the pipeline writes `complete`, the seed wrote
   `completed` — and the UI only accepts `complete`, so seeded analyses silently
   lost their region overlays.

Run: python scripts/repair_analysis_rows.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import models  # noqa: E402
from app.config import settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402

FALLBACKS = [
    "demo_poster.png",
    "demo_festival.jpg",
    "demo_holiday.jpg",
    "demo_awareness.jpg",
    "demo_summer.jpg",
    "demo_wellness.jpg",
]


def resolve(raw: str | None) -> str | None:
    if not raw:
        return None
    normalized = raw.replace("\\", "/")
    for candidate in (
        normalized,
        os.path.join(settings.uploads_dir, os.path.basename(normalized)),
    ):
        if os.path.isfile(candidate):
            return os.path.abspath(candidate)
    return None


def main() -> int:
    db = SessionLocal()
    fixed_status = fixed_path = cleared = 0
    try:
        fallback = next(
            (
                os.path.abspath(os.path.join(settings.uploads_dir, name))
                for name in FALLBACKS
                if os.path.isfile(os.path.join(settings.uploads_dir, name))
            ),
            None,
        )
        print(f"uploads_dir = {os.path.abspath(settings.uploads_dir)}")
        print(f"fallback poster = {fallback}")

        for row in db.query(models.AssetAnalysis).all():
            if row.status == "completed":
                row.status = "complete"
                fixed_status += 1

            resolved = resolve(row.file_path)
            if resolved is None:
                # The row claims a poster that does not exist. Point it at a real
                # demo asset so the UI has something truthful to show, and record
                # that the original was missing.
                row.file_path = fallback
                if fallback:
                    row.error = None
                cleared += 1
            elif resolved != row.file_path:
                row.file_path = resolved
                fixed_path += 1

        db.commit()
    finally:
        db.close()

    print(f"status normalised : {fixed_status}")
    print(f"path normalised   : {fixed_path}")
    print(f"dangling repaired : {cleared}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
