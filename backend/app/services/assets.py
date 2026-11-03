"""Brand / product image asset helpers: serialization, secure upload, research."""
import hashlib
import io
import os
import uuid
from typing import Tuple

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
import httpx

from .. import models
from ..config import settings

# SVG is deliberately excluded. An uploaded SVG can carry <script>, and the
# file endpoint serves bytes verbatim on the same origin as the app, where the
# session token lives in sessionStorage. Raster formats cannot execute.
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/octet-stream",  # browsers send this for unrecognized extensions (spaces, special chars); magic bytes validate the real type
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
        "filename": a.filename,
        "mimeType": a.mime_type,
        "size": a.size,
        "checksum": a.checksum,
        "width": a.width,
        "height": a.height,
        "notes": a.notes,
        "uploadedById": a.uploaded_by_id,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
        "workspace": getattr(a, "workspace", "PureGlow"),
    }


def validate_and_save_upload(file: UploadFile, uploads_dir: str) -> dict:
    """Validate file type, size, magic bytes and decodability, then save.

    A valid PNG/JPEG header is not proof of a valid image: a truncated or
    corrupted payload can still start with the right magic bytes. The image is
    fully decoded before anything is written, so a corrupt upload can never
    leave an orphan file or an unopenable asset record behind.

    Returns metadata about the stored file.
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
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 10MB limit.",
        )

    # Magic byte check. SVG is deliberately absent: it can execute script on
    # this origin, and the extension allow-list excludes it too.
    mime_type = ""
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        mime_type = "image/png"
    elif content.startswith(b"\xff\xd8\xff"):
        mime_type = "image/jpeg"
    elif content.startswith(b"RIFF") and b"WEBP" in content[:16]:
        mime_type = "image/webp"
    elif content.startswith(b"GIF87a") or content.startswith(b"GIF89a"):
        mime_type = "image/gif"

    if not mime_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file header does not match valid image format magic bytes.",
        )

    # Decode the whole payload so a truncated/corrupt image is rejected here,
    # not later when a reviewer opens the preview.
    try:
        with Image.open(io.BytesIO(content)) as img:
            width, height = img.size
            img.verify()
        with Image.open(io.BytesIO(content)) as img:
            img.load()
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That file is not a readable image. Re-export it and try again.",
        )

    name = f"{uuid.uuid4().hex}{ext}"
    os.makedirs(uploads_dir, exist_ok=True)
    saved_path = os.path.join(uploads_dir, name)
    with open(saved_path, "wb") as out:
        out.write(content)

    return {
        "path": saved_path,
        "filename": os.path.basename(file.filename or name),
        "ext": ext,
        "mime_type": mime_type,
        "size": len(content),
        "width": width,
        "height": height,
        "checksum": hashlib.sha256(content).hexdigest(),
    }


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
