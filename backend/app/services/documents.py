"""Document helpers: text extraction, secure upload, passage chunking and serialization.

Uses pypdf (BSD-3-Clause) as primary PDF parser to comply with permissive licensing
requirements, with fitz (PyMuPDF) as optional fallback.
"""
import io
import os
import uuid
from typing import Any

from fastapi import HTTPException, UploadFile, status

from ..models import GuidelineDoc, GuidelinePassage

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_DOC_EXTS = {".pdf", ".docx", ".doc", ".txt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/octet-stream",  # often sent by generic clients
    "text/plain",
}


def validate_and_save_upload(file: UploadFile, uploads_dir: str) -> tuple[str, str, str]:
    """Validate document file type, magic bytes, and size, then save securely.

    Returns (saved_path, human_size, file_type).
    Raises HTTPException 400/415 on invalid files.
    """
    filename = file.filename or "document.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_DOC_EXTS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file extension '{ext}'. Only PDF, DOCX and TXT files are permitted.",
        )

    content = file.file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 15 MB limit.",
        )

    # Magic byte validation
    if ext == ".pdf":
        if not content.startswith(b"%PDF"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content does not match a valid PDF header.",
            )
        file_type = "PDF"
    elif ext in (".docx", ".doc"):
        # Modern docx is a PK zip archive
        if not content.startswith(b"PK"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content does not match a valid DOCX document.",
            )
        file_type = "DOCX"
    elif ext == ".txt":
        file_type = "TXT"
    else:
        file_type = "PDF"

    os.makedirs(uploads_dir, exist_ok=True)
    saved_name = f"{uuid.uuid4().hex}{ext}"
    saved_path = os.path.join(uploads_dir, saved_name)
    with open(saved_path, "wb") as f:
        f.write(content)

    human_size = _human_size(len(content))
    return saved_path, human_size, file_type


def extract_text_and_passages(path: str, file_type: str) -> tuple[str, int, list[dict]]:
    """Extract full text, page count, and structured passages with page & paragraph refs.

    Returns (full_text, pages_count, passages).
    Each passage: {"page_number": int, "paragraph_number": int, "heading": str, "passage_text": str}.
    """
    ft = (file_type or "").lower()
    passages: list[dict] = []
    full_text_parts: list[str] = []
    page_count = 1

    if ft == "pdf" or path.lower().endswith(".pdf"):
        # Primary: pypdf (BSD-3-Clause)
        try:
            from pypdf import PdfReader

            reader = PdfReader(path)
            page_count = max(1, len(reader.pages))
            for page_idx, page in enumerate(reader.pages, start=1):
                raw_page_text = page.extract_text() or ""
                if not raw_page_text.strip():
                    continue
                full_text_parts.append(raw_page_text)
                # Split into paragraphs
                paragraphs = [p.strip() for p in raw_page_text.split("\n\n") if p.strip()]
                if not paragraphs:
                    paragraphs = [p.strip() for p in raw_page_text.split("\n") if len(p.strip()) > 30]

                for p_idx, para in enumerate(paragraphs, start=1):
                    # Simple heuristic for section heading
                    first_line = para.split("\n")[0].strip()
                    heading = first_line[:60] if len(first_line) < 60 and ("Section" in first_line or "Chapter" in first_line or first_line.isupper()) else f"Page {page_idx}"
                    passages.append({
                        "page_number": page_idx,
                        "paragraph_number": p_idx,
                        "heading": heading,
                        "passage_text": para,
                    })
        except Exception:
            # Fallback to fitz if installed and pypdf errored
            try:
                import fitz

                doc = fitz.open(path)
                page_count = max(1, doc.page_count)
                for page_idx in range(doc.page_count):
                    page = doc[page_idx]
                    page_text = page.get_text() or ""
                    if page_text.strip():
                        full_text_parts.append(page_text)
                        paras = [p.strip() for p in page_text.split("\n\n") if p.strip()]
                        for p_idx, para in enumerate(paras, start=1):
                            passages.append({
                                "page_number": page_idx + 1,
                                "paragraph_number": p_idx,
                                "heading": f"Page {page_idx + 1}",
                                "passage_text": para,
                            })
                doc.close()
            except Exception:
                pass

    elif ft == "docx" or path.lower().endswith((".docx", ".doc")):
        try:
            from docx import Document

            d = Document(path)
            current_heading = "General"
            for p_idx, para in enumerate(d.paragraphs, start=1):
                p_text = para.text.strip()
                if not p_text:
                    continue
                if para.style and para.style.name and "Heading" in para.style.name:
                    current_heading = p_text[:60]
                full_text_parts.append(p_text)
                approx_page = max(1, p_idx // 8 + 1)
                passages.append({
                    "page_number": approx_page,
                    "paragraph_number": p_idx,
                    "heading": current_heading,
                    "passage_text": p_text,
                })
            page_count = max(1, len(d.paragraphs) // 8 + 1)
        except Exception:
            pass

    elif ft == "txt" or path.lower().endswith(".txt"):
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                raw_text = f.read()
            full_text_parts.append(raw_text)
            paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
            for p_idx, para in enumerate(paragraphs, start=1):
                first_line = para.split("\n")[0].strip()
                heading = first_line[:60] if len(first_line) < 60 and ("Paragraph" in first_line or "Section" in first_line or first_line.isupper()) else f"Paragraph {p_idx}"
                passages.append({
                    "page_number": 1,
                    "paragraph_number": p_idx,
                    "heading": heading,
                    "passage_text": para,
                })
            page_count = 1
        except Exception:
            pass

    full_text = "\n\n".join(full_text_parts)
    # If no passages could be segmented, create at least one baseline passage if text exists
    if not passages and full_text.strip():
        passages.append({
            "page_number": 1,
            "paragraph_number": 1,
            "heading": "Document Content",
            "passage_text": full_text[:2000],
        })

    return full_text, page_count, passages


def _human_size(num_bytes: int) -> str:
    size = float(num_bytes)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size < 1024 or unit == "TB":
            if unit == "B":
                return f"{int(size)} B"
            return f"{size / 1024:.1f} {unit}" if unit != "KB" else f"{size:.1f} KB"
        size /= 1024
    return f"{size:.1f} TB"


def guideline_to_dict(doc: GuidelineDoc) -> dict:
    """Serialize a GuidelineDoc to the camelCase frontend shape."""
    return {
        "id": doc.id,
        "name": doc.name,
        "description": doc.description,
        "category": doc.category,
        "version": doc.version,
        "status": doc.status,
        "updatedAt": doc.updated_at.isoformat() if doc.updated_at else None,
        "fileType": doc.file_type,
        "fileSize": doc.file_size,
        "pages": doc.pages,
        "ownerId": doc.owner_id,
        "extractedPassages": doc.extracted_passages,
        "visibleToCreators": doc.visible_to_creators,
    }


def passage_to_dict(p: GuidelinePassage) -> dict:
    return {
        "id": p.id,
        "docId": p.doc_id,
        "pageNumber": p.page_number,
        "paragraphNumber": p.paragraph_number,
        "heading": p.heading,
        "passageText": p.passage_text,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
    }
