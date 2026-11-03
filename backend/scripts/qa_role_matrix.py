"""Role permission matrix.

Signs in as each role and probes the same endpoints, so the permission boundary
is measured rather than assumed. Expected codes come from the guard on each
route (`require_manager`, `require_workspace`, `assert_can_use`).

Usage: python scripts/qa_role_matrix.py
Writes: ../qa-results/role_matrix.json
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

ACCOUNTS = {
    "manager": {"email": "david.kim@pureglow.co", "password": "precedent"},
    "creator": {"email": "emily.carter@pureglow.co", "password": "precedent"},
    "qa_manager": {"email": "qa.manager@precedent.qa", "password": "precedent"},
}

# (label, method, path, role, expected status set, optional JSON body)
CASES = [
    # Governance writes: manager only
    ("Create rule", "POST", "/rules", "manager", {201},
     {"title": "QA_PRECEDENT_2026 Role Probe Rule",
      "summary": "Created by the role matrix to prove the manager write path.",
      "condition": "Probe only.", "action": "flag"}),
    ("Create rule", "POST", "/rules", "creator", {403},
     {"title": "Creator must not create rules"}),
    ("Confirm rule", "POST", "/rules/{rule}/confirm", "creator", {403, 404}, None),
    ("Deactivate rule", "POST", "/rules/{rule}/deactivate", "creator", {403, 404}, None),
    # Reads both roles can do
    ("List rules", "GET", "/rules", "manager", {200}, None),
    ("List rules", "GET", "/rules", "creator", {200}, None),
    ("List submissions", "GET", "/submissions", "manager", {200}, None),
    ("List submissions", "GET", "/submissions", "creator", {200}, None),
    ("List guidelines", "GET", "/guidelines", "creator", {200}, None),
    ("List exceptions", "GET", "/exceptions", "creator", {200}, None),
    ("List notifications", "GET", "/notifications", "creator", {200}, None),
    ("Audit history", "GET", "/audit", "manager", {200}, None),
    ("Audit history", "GET", "/audit", "creator", {200, 403}, None),
    # Agent governance
    ("Publish agent", "POST", "/agents/{agent}/publish", "creator", {403, 404}, None),
    ("Agent stats", "GET", "/agents/stats", "manager", {200}, None),
    # Auth
    ("Current user", "GET", "/auth/me", "manager", {200}, None),
    ("Current user", "GET", "/auth/me", "creator", {200}, None),
    # Unauthenticated
    ("List submissions", "GET", "/submissions", None, {401, 403}, None),
    ("Create rule", "POST", "/rules", None, {401, 403}, {"title": "anon"}),
    # Cross-workspace: QA manager must not read a PureGlow row (404, never 403)
    ("Cross-workspace read", "GET", "/submissions/{pureglow_sub}", "qa_manager", {404}, None),
]


def login(creds) -> dict:
    r = requests.post(f"{BASE}/auth/login", json=creds, timeout=20)
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['token']}"}


def main() -> int:
    headers = {name: login(c) for name, c in ACCOUNTS.items()}

    manager = headers["manager"]
    rules = requests.get(f"{BASE}/rules", headers=manager, timeout=20).json()
    agent = next(
        (a for a in requests.get(f"{BASE}/agents", headers=manager, timeout=20).json()
         if a.get("status") == "published"),
        None,
    )
    pureglow = requests.get(f"{BASE}/submissions", headers=manager, timeout=20).json()
    pureglow_sub = pureglow[0]["id"] if pureglow else "missing"

    fill = {"rule": rules[0]["id"], "agent": agent["id"] if agent else "missing",
            "pureglow_sub": pureglow_sub}

    rows = []
    for label, method, path, role, expected, body in CASES:
        real_path = path.format(**fill)
        hdrs = headers.get(role, {})
        try:
            if method == "GET":
                r = requests.get(f"{BASE}{real_path}", headers=hdrs, timeout=30)
            else:
                r = requests.post(f"{BASE}{real_path}", headers=hdrs, json=body or {}, timeout=30)
            code = r.status_code
        except requests.RequestException as exc:
            code = 0
            label = f"{label} ({type(exc).__name__})"
        ok = code in expected
        rows.append(
            {
                "action": label,
                "method": method,
                "path": real_path,
                "role": role or "anonymous",
                "expected": sorted(expected),
                "actual": code,
                "ok": ok,
            }
        )
        print(f"  [{'PASS' if ok else 'FAIL'}] {label:22} {method:5} {real_path:34} "
              f"{str(role or 'anonymous'):10} -> {code} (expected {sorted(expected)})")

    out = Path(__file__).resolve().parents[2] / "qa-results"
    out.mkdir(exist_ok=True)
    (out / "role_matrix.json").write_text(
        json.dumps(
            {
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "results": rows,
                "passed": sum(1 for r in rows if r["ok"]),
                "total": len(rows),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    passed = sum(1 for r in rows if r["ok"])
    print(f"\n{passed}/{len(rows)} role checks passed")
    return 0 if passed == len(rows) else 1


if __name__ == "__main__":
    raise SystemExit(main())
