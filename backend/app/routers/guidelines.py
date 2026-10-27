"""Guidelines + Documents router with passage indexing, validation, and full-text search."""
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status as http_status
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
    current_user: models.User = Depends(get_current_user),
):
    ws = getattr(current_user, "workspace", "PureGlow")
    # Workspace isolation: only this workspace's documents (NULL = legacy/shared).
    query = db.query(models.GuidelineDoc).filter(
        (models.GuidelineDoc.workspace == ws) | (models.GuidelineDoc.workspace.is_(None))
    )
    if current_user.role == "creator":
        query = query.filter(models.GuidelineDoc.visible_to_creators == True)  # noqa: E712
    docs = query.order_by(models.GuidelineDoc.updated_at.desc()).all()
    return [documents.guideline_to_dict(d) for d in docs]


@router.get("/search")
def search_guidelines(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Full-text / keyword search across stored guideline passages."""
    ws = getattr(current_user, "workspace", "PureGlow")
    passages = (
        db.query(models.GuidelinePassage, models.GuidelineDoc.name)
        .join(models.GuidelineDoc, models.GuidelinePassage.doc_id == models.GuidelineDoc.id)
        .filter(
            (models.GuidelinePassage.workspace == ws) | (models.GuidelinePassage.workspace.is_(None)),
            (models.GuidelinePassage.passage_text.ilike(f"%{q}%"))
            | (models.GuidelinePassage.heading.ilike(f"%{q}%"))
            | (models.GuidelineDoc.name.ilike(f"%{q}%")),
        )
        .limit(30)
        .all()
    )
    results = []
    for p, doc_name in passages:
        res = documents.passage_to_dict(p)
        res["docName"] = doc_name
        results.append(res)
    return results


@router.post("")
def create_guideline(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    category: str = Form("Visual Identity"),
    brand: str = Form("All brands"),
    visible_to_creators: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager),
):
    uploads_dir = settings.uploads_dir
    # Validates file extension, magic bytes, and size <= 15MB
    saved_path, size_str, file_type = documents.validate_and_save_upload(file, uploads_dir)

    # Extract text, page count, and individual passages
    text, pages, passages_data = documents.extract_text_and_passages(saved_path, file_type)
    extracted_passages = len(passages_data) if passages_data else max(1, len(text) // 1200)

    doc_id = new_id("gdoc")
    ws = getattr(current_user, "workspace", "PureGlow")
    doc = models.GuidelineDoc(
        id=doc_id,
        workspace=ws,
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

    # Save individual passages for evidence linking and search
    for p in passages_data:
        db.add(
            models.GuidelinePassage(
                id=new_id("gp"),
                doc_id=doc_id,
                workspace=ws,
                page_number=p["page_number"],
                paragraph_number=p["paragraph_number"],
                heading=p.get("heading", ""),
                passage_text=p["passage_text"],
            )
        )

    suggested = ai.suggest_rules_from_text(text) or []
    record(
        db,
        action="Guideline updated",
        entity_title=name,
        entity_meta=category,
        brand=brand if brand != "All brands" else ws,
        user_id=current_user.id,
        details=f"Uploaded guideline document ({file_type}, {pages} pages, {extracted_passages} passages indexed).",
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
    current_user: models.User = Depends(require_manager),
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
    current_user: models.User = Depends(get_current_user),
):
    doc = db.get(models.GuidelineDoc, guideline_id)
    if not doc or not doc.file_path:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="File not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(doc.file_path)


@router.get("/{guideline_id}/passages")
def get_guideline_passages(
    guideline_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    passages = (
        db.query(models.GuidelinePassage)
        .filter(models.GuidelinePassage.doc_id == guideline_id)
        .order_by(models.GuidelinePassage.page_number, models.GuidelinePassage.paragraph_number)
        .all()
    )
    return [documents.passage_to_dict(p) for p in passages]
