"""Agent Studio error-handling and permission checks (Test E + Test G)."""
from __future__ import annotations

import json
import sys

import httpx

BASE = "http://127.0.0.1:8000"


def login(email: str, password: str = "precedent") -> str:
    r = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=20)
    r.raise_for_status()
    return r.json()["token"]


def h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def main() -> int:
    manager = login("david.kim@pureglow.co")
    creator = login("emily.carter@pureglow.co")
    outsider = login("sarah.chen@wellnesslife.co")
    failures: list[str] = []
    created_ids: list[str] = []

    def check(name: str, condition: bool, detail: str = "") -> None:
        print(("PASS " if condition else "FAIL ") + name + (f" — {detail}" if detail else ""))
        if not condition:
            failures.append(name)

    # 1. Invalid prompt is rejected by schema validation.
    r = httpx.post(f"{BASE}/agents/draft-from-prompt", headers=h(manager), json={"prompt": "hi"}, timeout=20)
    check("invalid prompt rejected", r.status_code == 422, f"status {r.status_code}")

    # 2. Unknown tool: draft can be saved but cannot be published.
    unknown_spec = {
        "name": "Unknown Tool Agent",
        "description": "error test",
        "category": "brand_compliance",
        "instructions": "test",
        "tools": ["evil_tool"],
        "workflow": {
            "nodes": [
                {"id": "t", "type": "trigger", "position": {"x": 0, "y": 0}, "data": {"label": "Manual", "subtype": "manual_trigger"}},
                {"id": "a", "type": "tool", "position": {"x": 0, "y": 100}, "data": {"label": "Evil", "subtype": "tool", "toolId": "evil_tool"}},
            ],
            "edges": [{"id": "e1", "source": "t", "target": "a"}],
        },
    }
    r = httpx.post(f"{BASE}/agents", headers=h(manager), json=unknown_spec, timeout=20)
    check("unknown-tool draft saved", r.status_code == 201, f"status {r.status_code}")
    if r.status_code == 201:
        aid = r.json()["agent"]["id"]
        created_ids.append(aid)
        p = httpx.post(f"{BASE}/agents/{aid}/publish", headers=h(manager), timeout=20)
        errors = json.dumps(p.json())
        check("unknown-tool publish blocked", p.status_code == 422 and "evil_tool" in errors, f"status {p.status_code}")

    # 3. Cyclic workflow: saved as a draft, refused at publish.
    cycle_spec = {
        "name": "Cycle Agent",
        "description": "error test",
        "category": "brand_compliance",
        "instructions": "test",
        "tools": ["get_submission"],
        "workflow": {
            "nodes": [
                {"id": "t", "type": "trigger", "position": {"x": 0, "y": 0}, "data": {"label": "Manual", "subtype": "manual_trigger"}},
                {"id": "a", "type": "tool", "position": {"x": 0, "y": 100}, "data": {"label": "A", "subtype": "tool", "toolId": "get_submission"}},
                {"id": "b", "type": "tool", "position": {"x": 0, "y": 200}, "data": {"label": "B", "subtype": "tool", "toolId": "get_submission"}},
            ],
            "edges": [
                {"id": "e1", "source": "t", "target": "a"},
                {"id": "e2", "source": "a", "target": "b"},
                {"id": "e3", "source": "b", "target": "a"},
            ],
        },
    }
    r = httpx.post(f"{BASE}/agents", headers=h(manager), json=cycle_spec, timeout=20)
    check("cyclic draft saved", r.status_code == 201, f"status {r.status_code}")
    if r.status_code == 201:
        aid = r.json()["agent"]["id"]
        created_ids.append(aid)
        p = httpx.post(f"{BASE}/agents/{aid}/publish", headers=h(manager), timeout=20)
        errors = json.dumps(p.json())
        check("cyclic publish blocked", p.status_code == 422 and "cycle" in errors.lower(), f"status {p.status_code}")

    # Published agent for execution checks.
    agents = httpx.get(f"{BASE}/agents", headers=h(manager), timeout=20).json()
    published = next((a for a in agents if a["status"] == "published"), None)
    if published is None:
        print("FAIL no published agent available")
        return 1
    agent_id = published["id"]

    # 4. Tool failure surfaces as a failed run, not a crash.
    r = httpx.post(
        f"{BASE}/agents/{agent_id}/test",
        headers=h(manager),
        json={"input": {"submission_id": "does-not-exist"}},
        timeout=60,
    )
    ok = r.status_code == 200 and r.json().get("run", {}).get("status") == "failed"
    check("missing submission fails cleanly", ok, f"status {r.status_code}")

    # 5. Cancellation of a waiting run.
    submissions = httpx.get(f"{BASE}/submissions", headers=h(manager), timeout=20).json()
    submission_id = submissions[0]["id"] if submissions else None
    if submission_id:
        r = httpx.post(
            f"{BASE}/agents/{agent_id}/execute",
            headers=h(creator),
            json={"input": {"submission_id": submission_id}},
            timeout=120,
        )
        run = r.json().get("run", {}) if r.status_code == 201 else {}
        check("run pauses for approval", run.get("status") == "waiting_approval", run.get("status", ""))
        if run.get("status") == "waiting_approval":
            c = httpx.post(f"{BASE}/agent-runs/{run['id']}/cancel", headers=h(manager), timeout=20)
            check("waiting run can be cancelled", c.status_code == 200 and c.json()["run"]["status"] == "cancelled")
            a = httpx.post(
                f"{BASE}/agent-runs/{run['id']}/approve",
                headers=h(creator),
                json={"decision": "approve", "note": ""},
                timeout=20,
            )
            check("creator cannot approve", a.status_code == 403, f"status {a.status_code}")

    # 6. Cross-workspace isolation.
    r = httpx.get(f"{BASE}/agents/{agent_id}", headers=h(outsider), timeout=20)
    check("cross-workspace agent hidden", r.status_code == 404, f"status {r.status_code}")
    r = httpx.get(f"{BASE}/agents", headers=h(outsider), timeout=20)
    check("cross-workspace list empty", r.status_code == 200 and len(r.json()) == 0, f"{len(r.json())} rows")

    # 7. Persistence across a new login session.
    manager2 = login("david.kim@pureglow.co")
    r = httpx.get(f"{BASE}/agents/{agent_id}", headers=h(manager2), timeout=20)
    check("agent persists across login", r.status_code == 200 and r.json()["id"] == agent_id)
    runs = httpx.get(f"{BASE}/agents/{agent_id}/runs", headers=h(manager2), timeout=20)
    check("run history persists", runs.status_code == 200 and len(runs.json()) > 0, f"{len(runs.json())} runs")

    # Cleanup error-test drafts (hard delete is allowed for never-run drafts).
    for aid in created_ids:
        httpx.delete(f"{BASE}/agents/{aid}", headers=h(manager), timeout=20)

    print("\n== RESULT ==")
    if failures:
        print("FAIL")
        for item in failures:
            print(" -", item)
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
