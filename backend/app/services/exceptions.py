"""Exception request serialization helpers."""
from datetime import datetime, timezone

from ..models import ExceptionRequest


def exception_to_dict(e: ExceptionRequest) -> dict:
    """Serialize an ExceptionRequest to the camelCase contract shape."""
    return {
        "id": e.id,
        "code": e.code,
        "contentId": e.content_id,
        "contentTitle": e.content_title,
        "contentMeta": e.content_meta,
        "thumb": {
            "kind": e.thumb_kind,
            "palette": e.thumb_palette,
            "glyph": e.thumb_glyph,
        },
        "brand": e.brand,
        "ruleCode": e.rule_code,
        "ruleTitle": e.rule_title,
        "reason": e.reason,
        "scope": e.scope,
        "requestedById": e.requested_by_id,
        "decidedById": e.decided_by_id,
        "effectiveFrom": e.effective_from.isoformat() if e.effective_from else None,
        "expiresAt": e.expires_at.isoformat() if e.expires_at else None,
        "status": e.status,
        "conditions": e.conditions,
        "decidedAt": e.decided_at.isoformat() if e.decided_at else None,
        "revokedAt": e.revoked_at.isoformat() if getattr(e, "revoked_at", None) else None,
        "revokedById": getattr(e, "revoked_by_id", None),
        "revokeReason": getattr(e, "revoke_reason", ""),
        "workspace": getattr(e, "workspace", "PureGlow"),
    }


def is_expired(e: ExceptionRequest) -> bool:
    """True when the exception has an expiry in the past.

    SQLite returns naive datetimes; normalise to UTC before comparing so this
    works identically on SQLite (dev) and PostgreSQL (prod).
    """
    if e.expires_at is None:
        return False
    exp = e.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return exp < datetime.now(timezone.utc)
