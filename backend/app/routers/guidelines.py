"""Guidelines + Documents router."""
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status as http_status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import ai, models
from ..config import settings
from ..db import get_db
from ..deps import get_current_user, require_manager
from ..ids import new_id
from ..services import documents
from ..services.audit import record

router = APIRouter(prefix="/guidelines", tags=["guidelines"])


@router.get("", dependencies=[Depends(get_current_user)])
def list_guidelines(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.GuidelineDoc)
    if current_user.role == "creator":
        query = query.filter(models.GuidelineDoc.visible_to_creators == True)  # noqa: E712
    docs = query.order_by(models.GuidelineDoc.updated_at.desc()).all()
    return [documents.guideline_to_dict(d) for d in docs]


@router.post("")
def create_guideline(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    category: str = Form("Visual Identity"),
    brand: str = Form("All brands"),
    visible_to_creators: bool = Form(True),
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    uploads_dir = settings.uploads_dir
    saved_path, size_str = documents.save_upload(file, uploads_dir)

    ext = os.path.splitext(file.filename or "")[1].lstrip(".").upper() or "PDF"
    file_type = ext if ext in ("PDF", "DOCX") else "PDF"

    text, pages = documents.extract_text_and_pages(saved_path, file_type)
    extracted_passages = max(1, len(text) // 1200)

    doc = models.GuidelineDoc(
        id=new_id("gdoc"),
        name=name,
        description=description,
        category=category,
        version="1.0",
        status="active",
        file_type=file_type,
        file_size=size_str,
        pages=pages,
        owner_id=current_user.id,
        extracted_passages=extracted_passages,
        visible_to_creators=visible_to_creators,
        file_path=saved_path,
    )
    db.add(doc)
    db.flush()

    suggested = ai.suggest_rules_from_text(text) or []
    record(
        db,
        action="Guideline updated",
        entity_title=name,
        entity_meta=category,
        brand=brand,
        user_id=current_user.id,
        details=f"Uploaded guideline document ({file_type}, {pages} pages).",
        entity_kind="guideline",
        entity_id=doc.id,
    )

    db.commit()
    db.refresh(doc)

    result = documents.guideline_to_dict(doc)
    result["suggestedRules"] = suggested
    return result


@router.patch("/{guideline_id}/status")
def update_guideline_status(
    guideline_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    new_status = body.get("status")
    if not new_status:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="status required")
    doc = db.get(models.GuidelineDoc, guideline_id)
    if not doc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Guideline not found")
    doc.status = new_status
    record(
        db,
        action="Guideline updated",
        entity_title=doc.name,
        entity_meta=doc.category,
        user_id=current_user.id,
        details=f"Status set to {new_status}.",
        entity_kind="guideline",
        entity_id=doc.id,
    )
    db.commit()
    db.refresh(doc)
    return documents.guideline_to_dict(doc)


@router.get("/{guideline_id}/file")
def get_guideline_file(
    guideline_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doc = db.get(models.GuidelineDoc, guideline_id)
    if not doc or not doc.file_path:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="File not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(doc.file_path)
