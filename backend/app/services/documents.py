"""Document helpers: text extraction, secure upload, and serialization."""
import os
import uuid

from ..models import GuidelineDoc


def extract_text_and_pages(path: str, file_type: str) -> tuple[str, int]:
    """Return (text, page_count) for a PDF or DOCX. On failure return ("", 0)."""
    try:
        ft = (file_type or "").lower()
        if ft == "pdf" or path.lower().endswith(".pdf"):
            import fitz  # PyMuPDF

            doc = fitz.open(path)
            try:
                text = "\n".join(p.get_text() for p in doc)
                pages = doc.page_count
            finally:
                doc.close()
            return text, pages
        if ft == "docx" or path.lower().endswith((".docx", ".doc")):
            from docx import Document

            d = Document(path)
            text = "\n".join(p.text for p in d.paragraphs)
            pages = max(1, len(d.paragraphs) // 40)
            return text, pages
    except Exception:
        return "", 0
    return "", 0


def save_upload(file, uploads_dir: str) -> tuple[str, str]:
    """Write file content to a safe random filename (preserving extension).

    Returns (saved_path, size_str).
    """
    ext = os.path.splitext(file.filename or "")[1]
    name = f"{uuid.uuid4().hex}{ext}"
    os.makedirs(uploads_dir, exist_ok=True)
    path = os.path.join(uploads_dir, name)
    content = file.file.read()
    with open(path, "wb") as f:
        f.write(content)
    size_str = _human_size(len(content))
    return path, size_str


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
