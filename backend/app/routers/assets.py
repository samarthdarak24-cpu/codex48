"""Brand / Product Image Assets router."""
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user, require_manager
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
    saved_path, _ext = svc.save_upload(file, uploads_dir)

    asset = models.BrandAsset(
        id=new_id("asset"),
        name=name,
        brand=brand,
        category=category,
        file_path=saved_path,
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
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
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
    if not asset or not asset.file_path:
        raise HTTPException(status_code=404, detail="File not found")
    if not os.path.exists(asset.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(asset.file_path)


@router.post("/research")
def research_assets(
    body: ResearchBody,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return svc.research_external(body.query, body.brand)
