"""Brand / Product Image Assets router."""
import os

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user, require_manager, require_workspace
from ..ids import new_id
from .. import models
from ..services import assets as svc
from ..services.audit import record

router = APIRouter(prefix="/assets", tags=["assets"])


class ResearchBody(BaseModel):
    query: str
    brand: str


@router.get("")
def list_assets(
    brand: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.BrandAsset)
    if current_user.workspace:
        query = query.filter(
            (models.BrandAsset.workspace == current_user.workspace)
            | (models.BrandAsset.workspace.is_(None) if current_user.workspace == "PureGlow" else False)
        )
    if brand:
        query = query.filter(models.BrandAsset.brand == brand)
    if status:
        query = query.filter(models.BrandAsset.status == status)
    items = query.order_by(models.BrandAsset.created_at.desc()).all()
    return [svc.asset_to_dict(a) for a in items]


@router.post("")
def create_asset(
    file: UploadFile = File(...),
    name: str = Form(...),
    brand: str = Form("PureGlow"),
    category: str = Form("Product Image"),
    notes: str = Form(""),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    uploads_dir = settings.uploads_dir
    stored = svc.validate_and_save_upload(file, uploads_dir)

    ws = getattr(current_user, "workspace", "PureGlow")
    asset = models.BrandAsset(
        id=new_id("asset"),
        workspace=ws,
        name=name,
        filename=stored["filename"],
        brand=brand,
        category=category,
        kind="image",
        storage_key=os.path.basename(stored["path"]),
        file_path=stored["path"],
        mime_type=stored["mime_type"],
        size=stored["size"],
        width=stored["width"],
        height=stored["height"],
        checksum=stored["checksum"],
        source="upload",
        status="pending",
        notes=notes,
        uploaded_by_id=current_user.id,
    )
    db.add(asset)
    db.flush()

    record(
        db,
        action="Revised",
        entity_title=name,
        entity_meta=category,
        brand=brand,
        user_id=current_user.id,
        details="Uploaded brand asset (pending review).",
        entity_kind="asset",
        entity_id=asset.id,
        workspace=ws,
    )

    db.commit()
    db.refresh(asset)
    return svc.asset_to_dict(asset)


@router.post("/{asset_id}/approve")
def approve_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    asset = db.get(models.BrandAsset, asset_id)
    require_workspace(asset, current_user, detail="Asset not found")
    asset.status = "approved"
    record(
        db,
        action="Revised",
        entity_title=asset.name,
        entity_meta=asset.category,
        brand=asset.brand,
        user_id=current_user.id,
        details="Approved brand asset.",
        entity_kind="asset",
        entity_id=asset.id,
        workspace=asset.workspace or "PureGlow",
    )
    db.commit()
    db.refresh(asset)
    return svc.asset_to_dict(asset)


@router.get("/{asset_id}/file")
def get_asset_file(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    asset = db.get(models.BrandAsset, asset_id)
    require_workspace(asset, current_user, detail="File not found")
    if not asset.file_path or not os.path.exists(asset.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    # Force a download: never let the browser render an uploaded file inline
    # on the app's own origin.
    return FileResponse(
        asset.file_path,
        media_type="application/octet-stream",
        filename=os.path.basename(asset.file_path),
    )


@router.post("/research")
def research_assets(
    body: ResearchBody,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return svc.research_external(body.query, body.brand)


@router.get("/{asset_id}/analysis")
def get_asset_analysis(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from ..services.visual import pipeline as visual

    a = db.get(models.AssetAnalysis, asset_id)
    if a is None:
        a = (
            db.query(models.AssetAnalysis)
            .filter(
                (models.AssetAnalysis.submission_id == asset_id)
                | (models.AssetAnalysis.file_path.contains(asset_id))
            )
            .order_by(models.AssetAnalysis.created_at.desc())
            .first()
        )
    if a is None:
        raise HTTPException(404, "Asset analysis not found")
    require_workspace(a, current_user, detail="Analysis not found")
    return visual.analysis_to_dict(a)


@router.post("/{asset_id}/reanalyze")
def reanalyze_asset(
    asset_id: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from ..services.visual import pipeline as visual

    a = db.get(models.AssetAnalysis, asset_id)
    if a is None:
        a = (
            db.query(models.AssetAnalysis)
            .filter(models.AssetAnalysis.submission_id == asset_id)
            .order_by(models.AssetAnalysis.created_at.desc())
            .first()
        )
    if a is None:
        ba = db.get(models.BrandAsset, asset_id)
        if ba and ba.file_path and os.path.exists(ba.file_path):
            ws = getattr(current_user, "workspace", "PureGlow") or "PureGlow"
            a = visual.create_analysis(db, file_path=ba.file_path, workspace=ws, user_id=current_user.id)
    if a is None:
        raise HTTPException(404, "Asset not found for re-analysis")
    require_workspace(a, current_user, detail="Analysis not found")
    a.status = "pending"
    a.error = None
    db.commit()
    background.add_task(visual.analyze_asset_detached, a.id)
    return {"analysisId": a.id, "status": "pending"}


@router.get("/{asset_id}/visual-findings")
def get_visual_findings(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from ..services.visual import pipeline as visual

    a = db.get(models.AssetAnalysis, asset_id)
    if a is None:
        a = (
            db.query(models.AssetAnalysis)
            .filter(models.AssetAnalysis.submission_id == asset_id)
            .order_by(models.AssetAnalysis.created_at.desc())
            .first()
        )
    if a is None:
        raise HTTPException(404, "Asset analysis not found")
    require_workspace(a, current_user, detail="Analysis not found")
    data = visual.analysis_to_dict(a)
    return {
        "analysisId": a.id,
        "submissionId": a.submission_id,
        "status": a.status,
        "textBlocks": data.get("textBlocks", []),
        "dominantColors": data.get("dominantColors", []),
        "logoMatches": data.get("logoMatches", []),
        "contrastFindings": data.get("contrastFindings", []),
        "layoutMetrics": data.get("layoutMetrics", {}),
        "engine": data.get("engine", {}),
    }
