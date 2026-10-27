"""Brand / product image asset helpers: serialization, secure upload, research."""
import os
import uuid

import httpx

from .. import models
from ..config import settings


def asset_to_dict(a: "models.BrandAsset") -> dict:
    """Serialize a BrandAsset to camelCase JSON matching BrandAsset[] in CONTRACT."""
    return {
        "id": a.id,
        "name": a.name,
        "brand": a.brand,
        "category": a.category,
        "filePath": a.file_path,
        "url": a.url,
        "source": a.source,
        "sourceUrl": a.source_url,
        "status": a.status,
        "width": a.width,
        "height": a.height,
        "notes": a.notes,
        "uploadedById": a.uploaded_by_id,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
    }


def save_upload(file, uploads_dir: str) -> tuple[str, str]:
    """Write uploaded file to a safe random filename (preserving extension).

    Returns (saved_path, ext) where ext includes the leading dot (e.g. ".png").
    """
    ext = os.path.splitext(file.filename or "")[1]
    name = f"{uuid.uuid4().hex}{ext}"
    os.makedirs(uploads_dir, exist_ok=True)
    saved_path = os.path.join(uploads_dir, name)
    with open(saved_path, "wb") as out:
        out.write(file.file.read())
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
