"""Small id helper. Prefixes keep entities readable in logs and exports."""
import uuid


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"
