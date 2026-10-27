"""Brand / product image asset helpers: serialization, secure upload, research."""
import os
import uuid
from typing import Tuple

from fastapi import HTTPException, UploadFile, status
import httpx

from .. import models
from ..config import settings

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
    "image/gif",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def asset_to_dict(a: "models.BrandAsset") -> dict:
    """Serialize a BrandAsset to camelCase JSON matching BrandAsset[] in CONTRACT."""
    return {
        "id": a.id,
        "name": a.name,
        "brand": a.brand,
        "category": a.category,
        "filePath": a.file_path,
        "url": a.url or (f"/assets/{a.id}/file" if a.file_path else None),
        "source": a.source,
        "sourceUrl": a.source_url,
        "status": a.status,
        "width": a.width,
        "height": a.height,
        "notes": a.notes,
        "uploadedById": a.uploaded_by_id,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
        "workspace": getattr(a, "workspace", "PureGlow"),
    }


def validate_and_save_upload(file: UploadFile, uploads_dir: str) -> Tuple[str, str]:
    """Validate file type, size, and magic bytes, then safely write to disk.

    Returns (saved_path, ext).
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported content type '{content_type}'.",
        )

    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 10MB limit.",
        )

    # Magic byte check
    is_valid = False
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        is_valid = True
    elif content.startswith(b"\xff\xd8\xff"):
        is_valid = True
    elif content.startswith(b"RIFF") and b"WEBP" in content[:16]:
        is_valid = True
    elif content.startswith(b"GIF87a") or content.startswith(b"GIF89a"):
        is_valid = True
    elif b"<svg" in content[:512] or b"<?xml" in content[:128]:
        is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file header does not match valid image format magic bytes.",
        )

    name = f"{uuid.uuid4().hex}{ext}"
    os.makedirs(uploads_dir, exist_ok=True)
    saved_path = os.path.join(uploads_dir, name)
    with open(saved_path, "wb") as out:
        out.write(content)

    return saved_path, ext


def research_external(query: str, brand: str) -> dict:
    """Call the optional external image-source API. NEVER fabricate results.

    Returns {"configured": bool, "results": list}. On any error the configured
    flag stays True but results is an empty list.
    """
    if not settings.image_source_api_url:
        return {"configured": False, "results": []}
    try:
        resp = httpx.post(
            settings.image_source_api_url,
            headers={"Authorization": f"Bearer {settings.image_source_api_key}"},
            json={"query": query, "brand": brand},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", []) if isinstance(data, dict) else []
        if not isinstance(results, list):
            results = []
        return {"configured": True, "results": results}
    except Exception:
        return {"configured": True, "results": []}
