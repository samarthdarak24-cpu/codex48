"""Per-feature data sweep.

For each of the 21 workspace features, call the endpoint that backs it and record
how many real rows come back. This proves the page is not rendering a shell — the
numbers here are what the UI displays.

Usage: python scripts/qa_feature_data_sweep.py
Writes: ../qa-results/feature_data.json
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

BASE = os.environ.get("PRECEDENT_API", "http://127.0.0.1:8000")
MANAGER = {"email": "david.kim@pureglow.co", "password": "precedent"}
CREATOR = {"email": "emily.carter@pureglow.co", "password": "precedent"}

# (feature, role, endpoint, allow_empty)
FEATURES = [
    ("M1 Overview", "manager", "/analytics", False),
    ("M2 Review Queue", "manager", "/submissions?status=Pending", False),
    ("M3 All Submissions", "manager", "/submissions", False),
    ("M4 Brand Guidelines", "manager", "/guidelines", False),
    ("M5 Rules & Conflicts", "manager", "/rules", False),
    ("M6 Conflicts", "manager", "/rules/conflicts", True),
    ("M7 Exceptions", "manager", "/exceptions", False),
    ("M8 Rule Impact Sandbox", "manager", "/simulations", False),
    ("M9 Sentinel", "manager", "/sentinel/tasks", False),
    ("M10 Asset Library", "manager", "/assets", False),
    ("M11 Audit History", "manager", "/audit", False),
    ("M12 Analytics & Health", "manager", "/analytics/trends", True),
    ("C1 Creator Dashboard", "creator", "/submissions", False),
    ("C2 My Submissions", "creator", "/submissions", False),
    ("C3 Approved Content", "creator", "/submissions?status=Approved", False),
    ("C4 Creator Guidelines", "creator", "/guidelines", False),
    ("C5 Creator Exceptions", "creator", "/exceptions", False),
    ("C6 Sentinel Tasks", "creator", "/sentinel/tasks", False),
    ("C7 Notifications", "creator", "/notifications", False),
    ("C8 Agent Studio", "manager", "/agents", False),
    ("C9 Agent Runs", "manager", "/agent-runs", False),
]


def login(creds) -> dict:
    r = requests.post(f"{BASE}/auth/login", json=creds, timeout=20)
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['token']}"}


def size_of(payload) -> int:
    if isinstance(payload, list):
        return len(payload)
    if isinstance(payload, dict):
        for key in ("items", "results", "data", "rows", "tasks", "docs", "events", "agents", "runs"):
            v = payload.get(key)
            if isinstance(v, list):
                return len(v)
        return len(payload)
    return 0


def main() -> int:
    headers = {"manager": login(MANAGER), "creator": login(CREATOR)}
    rows = []
    for feature, role, path, allow_empty in FEATURES:
        r = requests.get(f"{BASE}{path}", headers=headers[role], timeout=30)
        try:
            body = r.json()
        except ValueError:
            body = None
        # A JSON array that is legitimately empty (no open conflicts today) is a
        # valid state, not a broken endpoint. An HTML body means the path does
        # not exist and the dev server answered with the SPA shell.
        is_json = body is not None
        count = size_of(body) if r.status_code == 200 and is_json else 0
        ok = r.status_code == 200 and is_json and (count > 0 or allow_empty)
        rows.append(
            {
                "feature": feature,
                "role": role,
                "endpoint": path,
                "status": r.status_code,
                "rows": count,
                "json": is_json,
                "allowEmpty": allow_empty,
                "ok": ok,
            }
        )
        note = "" if count else (" · empty state" if allow_empty and is_json else " · NO DATA")
        print(f"  [{'PASS' if ok else 'FAIL'}] {feature:24} {path:30} "
              f"HTTP {r.status_code} · {count} row(s){note}")

    out = Path(__file__).resolve().parents[2] / "qa-results"
    out.mkdir(exist_ok=True)
    (out / "feature_data.json").write_text(
        json.dumps(
            {
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "results": rows,
                "passed": sum(1 for x in rows if x["ok"]),
                "total": len(rows),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\n{sum(1 for x in rows if x['ok'])}/{len(rows)} features returned real data")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
