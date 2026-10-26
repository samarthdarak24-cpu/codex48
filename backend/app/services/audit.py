"""Shared audit recorder.

Every mutation in the system calls `record(...)` so the Audit Log is complete.
`thumb` is an optional ThumbSpec dict; pass None when not applicable.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..ids import new_id
from ..models import AuditEvent


def record(
    db: Session,
    *,
    action: str,
    entity_title: str,
    entity_meta: str = "",
    brand: str = "PureGlow",
    user_id: str = "",
    details: str = "",
    status: str = "Recorded",
    entity_kind: str = "auth",
    entity_id: str = "",
    version: int | None = None,
    thumb: dict | None = None,
) -> AuditEvent:
    ev = AuditEvent(
        id=new_id("audit"),
        at=datetime.now(timezone.utc),
        action=action,
        entity_title=entity_title,
        entity_meta=entity_meta,
        brand=brand,
        user_id=user_id,
        details=details,
        status=status,
        entity_kind=entity_kind,
        entity_id=entity_id,
        version=version,
        thumb=thumb,
    )
    db.add(ev)
    db.flush()
    return ev
