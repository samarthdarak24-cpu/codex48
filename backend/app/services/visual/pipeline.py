"""A1 VisualGuard pipeline: upload -> facts -> findings (blueprint 7.1).

`run_pipeline` is pure (image in, facts out) and safe to unit test.
`analyze_asset` is the background task: it loads the row, runs the pipeline,
persists every fact, then re-runs the deterministic engine so the findings the
user sees are derived from measured facts — never from a model.

Failure behaviour (stated honestly in the UI):
  - unreadable / corrupt image -> status="failed", error recorded
  - readable but no text       -> status="complete", unreadable=False, OCR empty
  - a missing analyser         -> that fact stays empty, and the rule that
                                  needs it returns "unknown" (Needs review)
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any
from sqlalchemy.orm import Session

from ... import models
from ...config import settings
from ...ids import new_id
from . import colors as colors_mod
from . import contrast as contrast_mod
from . import layout as layout_mod
from . import logo_match as logo_mod
from . import ocr as ocr_mod

log = logging.getLogger("precedent.visual")

ANALYZER_VERSIONS = {
    "ocr": "tesseract-5.x",
    "colors": "pillow-mediancut-v1",
    "logo": "opencv-template-multiscale-v1",
    "layout": "geometry-v1",
    "contrast": "wcag22-v1",
    "pipeline": "a1-v1",
}


def _image_size(image_path: str) -> tuple[int, int]:
    from PIL import Image

    with Image.open(image_path) as img:
        return img.size


def _is_blank(image_path: str) -> bool:
    """True when the image carries essentially no visual information."""
    try:
        import numpy as np
        from PIL import Image

        with Image.open(image_path) as img:
            arr = np.asarray(img.convert("L").resize((64, 64)))
        return float(arr.std()) < 3.0
    except Exception:
        return False


def approved_logos(db: Session | None, workspace: str) -> list[dict[str, Any]]:
    """Approved brand-logo assets that actually exist on disk."""
    if db is None:
        return []
    rows = (
        db.query(models.BrandAsset)
        .filter(models.BrandAsset.status == "approved")
        .filter(models.BrandAsset.category.ilike("%logo%"))
        .filter((models.BrandAsset.workspace == workspace) | (models.BrandAsset.workspace.is_(None)))
        .all()
    )
    out = []
    for r in rows:
        if r.file_path and os.path.exists(r.file_path):
            out.append({"id": r.id, "name": r.name, "path": r.file_path})
    return out


def run_pipeline(image_path: str, logos: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Analyse one image. Never raises for a bad file; returns status instead."""
    result: dict[str, Any] = {
        "status": "failed",
        "error": None,
        "width": 0,
        "height": 0,
        "ocr_text": "",
        "text_blocks": [],
        "dominant_colors": [],
        "logo_matches": [],
        "layout_metrics": {},
        "contrast_findings": [],
        "analyzer_versions": dict(ANALYZER_VERSIONS),
        "unreadable": False,
        "background_color": None,
        "ocr_confidence": 0.0,
        "worst_contrast": None,
    }

    if not image_path or not os.path.exists(image_path):
        result["error"] = "file not found"
        return result

    try:
        width, height = _image_size(image_path)
    except Exception as exc:
        # Never surface an internal exception name to a creator.
        log.warning("unreadable upload %s: %s", image_path, exc)
        result["error"] = "The image could not be read. Re-export it as PNG or JPG and upload it again."
        result["unreadable"] = True
        return result

    result["width"], result["height"] = width, height

    blank = _is_blank(image_path)
    ocr = ocr_mod.read_text(image_path)
    palette = colors_mod.dominant_colors(image_path)
    bg = colors_mod.background_color(image_path)
    matches = logo_mod.match_logos(
        image_path, logos or [], threshold=settings.logo_match_threshold
    )
    metrics = layout_mod.layout_metrics(
        width=width, height=height, text_blocks=ocr["blocks"], logo_matches=matches
    )
    contrasts = contrast_mod.contrast_findings(image_path, ocr["blocks"])

    result.update(
        {
            "status": "complete",
            "ocr_text": ocr["text"],
            "text_blocks": ocr["blocks"],
            "ocr_confidence": ocr["meanConfidence"],
            "dominant_colors": palette,
            "logo_matches": matches,
            "layout_metrics": metrics,
            "contrast_findings": contrasts,
            "background_color": bg,
            "worst_contrast": contrast_mod.worst_contrast(contrasts),
        }
    )

    if blank:
        # A blank canvas is readable but carries no information: the honest
        # state is "nothing could be measured", not a pile of violations.
        result["unreadable"] = True
        result["error"] = "image appears blank"
        result["ocr_text"] = ""
        result["text_blocks"] = []
        result["contrast_findings"] = []
    elif ocr.get("error") and not ocr["blocks"]:
        # OCR unavailable (missing binary) is not the creator's fault.
        result["error"] = ocr["error"]
        if ocr["error"] and "not installed" in ocr["error"] or "not found" in (ocr["error"] or ""):
            result["status"] = "failed"

    return result


def _region_for(analysis: models.AssetAnalysis, kind: str, explanation: str = "") -> dict | None:
    """Pick the box that best explains a rule finding."""
    if kind == "contrast":
        failing = [f for f in (analysis.contrast_findings or []) if f.get("status") == "fail"]
        if failing:
            return failing[0].get("region")
        if analysis.contrast_findings:
            return analysis.contrast_findings[0].get("region")
    if kind == "logo":
        for m in analysis.logo_matches or []:
            return m.get("box")
    if kind == "text":
        # Point at the OCR line that actually contains the offending phrase,
        # so clicking "100% safe" highlights that line and not the first one.
        blocks = analysis.text_blocks or []
        quotes = sorted(
            (q.strip().lower() for q in _QUOTED.findall(explanation or "") if q.strip()),
            key=len,
            reverse=True,
        )
        for q in quotes:
            for b in blocks:
                if q in (b.get("text") or "").lower():
                    return b.get("box")
        # Fall back to a punctuation-insensitive match: OCR gives "20% off"
        # while the rule quotes "20 off".
        def _norm(s: str) -> str:
            return "".join(ch for ch in s.lower() if ch.isalnum() or ch.isspace())

        for q in quotes:
            nq = _norm(q).strip()
            if not nq:
                continue
            for b in blocks:
                if nq in _norm(b.get("text") or ""):
                    return b.get("box")
        return blocks[0].get("box") if blocks else None
    return None


_QUOTED = __import__("re").compile(r'"([^"]{2,80})"')


_REGION_KIND = {
    "CONTRAST-001": "contrast",
    "LOGO-001": "logo",
    "LOGO-002": "logo",
    "COLOR-001": "logo",
    "FORMAT-001": "logo",
    "BR-01": "logo",
    "LO-02": "logo",
    "SM-01": "logo",
    # IM-03 (lighting) and TY-01 (typeface) are whole-asset properties with no
    # meaningful region, so they deliberately get no box rather than a
    # misleading one.
    # Text rules point at the OCR line they were raised from.
    "CL-03": "text",
    "CL-04": "text",
    "CL-06": "text",
    "MK-02": "text",
    "PA-05": "text",
    "TV-02": "text",
}


def apply_to_submission(
    db: Session, submission: models.Submission, analysis: models.AssetAnalysis
) -> int:
    """Write measured facts onto the submission and rebuild its findings.

    Text rules run over the OCR text as well as the typed copy, so a claim
    printed on the poster is checked exactly like a caption.
    """
    from ...rule_engine import run_rules
    from ..submissions import _AssetObj, _apply_findings

    metrics = analysis.layout_metrics or {}
    best_logo = max(
        (m.get("confidence", 0.0) for m in analysis.logo_matches or []), default=None
    )
    confident_logo = any(m.get("confident") for m in analysis.logo_matches or [])

    asset_obj = _AssetObj(
        background_colour=analysis.dominant_colors[0]["hex"] if analysis.dominant_colors else None,
        clear_space_ratio=metrics.get("clearSpaceRatio"),
        typeface=None,  # never claimed from a flat image
        aspect_ratio=metrics.get("aspectRatio") or None,
        unreadable=bool(analysis.unreadable),
        logo_confidence=best_logo,
        logo_confident=confident_logo,
        logo_count=len(analysis.logo_matches or []),
        contrast_ratio=contrast_mod.worst_contrast(analysis.contrast_findings or []),
        aspect_value=metrics.get("aspectValue"),
    )

    submission.asset_background_colour = asset_obj.background_colour
    submission.asset_clear_space_ratio = asset_obj.clear_space_ratio
    submission.asset_aspect_ratio = asset_obj.aspect_ratio
    submission.asset_unreadable = bool(analysis.unreadable)
    submission.updated_at = datetime.now(timezone.utc)

    ws = submission.workspace or "PureGlow"
    active_rules = (
        db.query(models.Rule)
        .filter(models.Rule.status == "active")
        .filter((models.Rule.workspace == ws) | (models.Rule.workspace.is_(None)))
        .all()
    )

    # Combine typed copy with text printed on the poster.
    latest = max(submission.versions, key=lambda v: v.version) if submission.versions else None
    typed = latest.text if latest else ""
    combined = (typed or "").strip()
    ocr_text = (analysis.ocr_text or "").strip()
    if ocr_text and ocr_text not in combined:
        combined = (combined + "\n" + ocr_text).strip()

    findings = run_rules(active_rules, combined, submission.channel, asset_obj)

    for old in list(submission.findings):
        db.delete(old)
    db.flush()

    open_findings = _apply_findings(db, submission.id, findings, submission.brand, ws)
    db.flush()

    # Attach image regions so the UI can highlight the exact box. Query the
    # rows back rather than trusting the relationship collection, which is
    # stale until the session flushes.
    stored_rows = (
        db.query(models.Finding)
        .filter(models.Finding.submission_id == submission.id)
        .all()
    )
    for finding in stored_rows:
        kind = _REGION_KIND.get(finding.rule_code)
        if kind:
            finding.region = _region_for(analysis, kind, finding.explanation or "")
    db.flush()

    submission.issue_count = len(open_findings)
    submission.updated_at = datetime.now(timezone.utc)
    db.flush()
    return len(open_findings)


def analyze_asset(db: Session, analysis_id: str) -> None:
    """Background task entry point. Records its own failures; never raises."""
    analysis = db.get(models.AssetAnalysis, analysis_id)
    if analysis is None:
        return

    analysis.status = "processing"
    db.commit()

    try:
        logos = approved_logos(db, analysis.workspace or "PureGlow")
        result = run_pipeline(analysis.file_path or "", logos)

        analysis.width = result["width"]
        analysis.height = result["height"]
        analysis.ocr_text = result["ocr_text"]
        analysis.text_blocks = result["text_blocks"]
        analysis.dominant_colors = result["dominant_colors"]
        analysis.logo_matches = result["logo_matches"]
        analysis.layout_metrics = result["layout_metrics"]
        analysis.contrast_findings = result["contrast_findings"]
        analysis.analyzer_versions = result["analyzer_versions"]
        analysis.unreadable = result["unreadable"]
        analysis.status = result["status"]
        analysis.error = result["error"]
        analysis.completed_at = datetime.now(timezone.utc)
        db.flush()

        if analysis.submission_id:
            submission = db.get(models.Submission, analysis.submission_id)
            if submission is not None and result["status"] == "complete":
                apply_to_submission(db, submission, analysis)

        db.commit()
    except Exception as exc:  # keep the row inspectable rather than crashing
        db.rollback()
        analysis = db.get(models.AssetAnalysis, analysis_id)
        if analysis is not None:
            analysis.status = "failed"
            analysis.error = f"{type(exc).__name__}: {exc}"[:500]
            analysis.completed_at = datetime.now(timezone.utc)
            db.commit()


def analyze_asset_detached(analysis_id: str) -> None:
    """Background entry point that owns its own session.

    FastAPI BackgroundTasks run after the response is sent, so the request's
    session is already closed. Opening a fresh session here avoids sharing a
    session across threads (SQLite would raise otherwise).
    """
    from ...db import SessionLocal

    db = SessionLocal()
    try:
        analyze_asset(db, analysis_id)
    except Exception:
        db.rollback()
    finally:
        db.close()


def create_analysis(
    db: Session,
    *,
    file_path: str,
    workspace: str,
    user_id: str,
    asset_id: str | None = None,
    submission_id: str | None = None,
) -> models.AssetAnalysis:
    """Create a pending row. The caller schedules `analyze_asset`."""
    row = models.AssetAnalysis(
        id=new_id("aa"),
        workspace=workspace,
        asset_id=asset_id,
        submission_id=submission_id,
        file_path=file_path,
        status="pending",
        created_by_id=user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def analysis_to_dict(a: models.AssetAnalysis) -> dict:
    """camelCase payload for the frontend PosterCanvas."""
    return {
        "id": a.id,
        "assetId": a.asset_id,
        "submissionId": a.submission_id,
        "status": a.status,
        "error": a.error,
        "width": a.width,
        "height": a.height,
        "ocrText": a.ocr_text,
        "ocrConfidence": round(
            sum(b.get("confidence", 0) for b in (a.text_blocks or [])) / len(a.text_blocks), 4
        ) if a.text_blocks else 0.0,
        "textBlocks": a.text_blocks or [],
        "dominantColors": a.dominant_colors or [],
        "logoMatches": a.logo_matches or [],
        "layoutMetrics": a.layout_metrics or {},
        "contrastFindings": a.contrast_findings or [],
        "analyzerVersions": a.analyzer_versions or {},
        "unreadable": bool(a.unreadable),
        "createdAt": a.created_at.isoformat() if a.created_at else None,
        "completedAt": a.completed_at.isoformat() if a.completed_at else None,
        "summary": {
            "textRegions": len(a.text_blocks or []),
            "logos": len(a.logo_matches or []),
            "contrastFailures": len(
                [f for f in (a.contrast_findings or []) if f.get("status") == "fail"]
            ),
            "contrastUnknown": len(
                [f for f in (a.contrast_findings or []) if f.get("status") == "unknown"]
            ),
            "background": (a.dominant_colors or [{}])[0].get("hex") if a.dominant_colors else None,
            "aspectRatio": (a.layout_metrics or {}).get("aspectRatio", ""),
        },
    }
