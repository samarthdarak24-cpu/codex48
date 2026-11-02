"""HTTP-level Agent Studio smoke test.

Requires the API to be running on http://127.0.0.1:8000 with the seeded
database. Exercises the real endpoints, including role permissions.
"""
from __future__ import annotations

import json
import sys

import httpx

BASE = "http://127.0.0.1:8000"
PROMPT = (
    "Create an agent that reviews marketing submissions against our brand guidelines "
    "and identifies unsupported claims with exact evidence."
)


def login(email: str) -> str:
    response = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": "precedent"}, timeout=20)
    response.raise_for_status()
    return response.json()["token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def main() -> int:
    failures: list[str] = []
    manager = login("david.kim@pureglow.co")
    creator = login("emily.carter@pureglow.co")

    print("== stats ==")
    stats = httpx.get(f"{BASE}/agents/stats", headers=auth(manager), timeout=20).json()
    print(json.dumps(stats))

    print("\n== templates ==")
    templates = httpx.get(f"{BASE}/agents/templates", headers=auth(manager), timeout=20).json()
    print("count", len(templates))

    print("\n== draft from prompt ==")
    response = httpx.post(
        f"{BASE}/agents/draft-from-prompt",
        headers=auth(manager),
        json={"prompt": PROMPT},
        timeout=60,
    )
    print("status", response.status_code)
    if response.status_code != 201:
        print(response.text[:800])
        return 1
    payload = response.json()
    agent = payload["agent"]
    agent_id = agent["id"]
    print(
        "agent", agent["name"], "| status", agent["status"],
        "| validation", payload["validation"]["ok"],
        "| generatedBy", payload["generation"]["generatedBy"],
    )

    print("\n== validate ==")
    validation = httpx.post(f"{BASE}/agents/{agent_id}/validate", headers=auth(manager), timeout=20).json()
    print("ok", validation["ok"], "errors", validation["errors"])

    print("\n== save workflow ==")
    detail = httpx.get(f"{BASE}/agents/{agent_id}", headers=auth(manager), timeout=20).json()
    graph = detail["version"]["workflow"]
    saved = httpx.put(
        f"{BASE}/agents/{agent_id}/workflow",
        headers=auth(manager),
        json={"graph": graph},
        timeout=20,
    )
    print("status", saved.status_code, "validation", saved.json().get("validation", {}).get("ok"))
    if saved.status_code != 200:
        failures.append("workflow save failed")

    print("\n== publish ==")
    published = httpx.post(f"{BASE}/agents/{agent_id}/publish", headers=auth(manager), timeout=20)
    print("status", published.status_code)
    if published.status_code != 200:
        print(published.text[:800])
        failures.append("publish failed")

    print("\n== creator visibility ==")
    creator_agents = httpx.get(f"{BASE}/agents", headers=auth(creator), timeout=20).json()
    print("creator sees", len(creator_agents), [a["name"] for a in creator_agents])
    if not any(a["id"] == agent_id for a in creator_agents):
        failures.append("creator cannot see the published agent")

    print("\n== creator cannot create ==")
    forbidden = httpx.post(
        f"{BASE}/agents",
        headers=auth(creator),
        json={
            "name": "Unauthorised",
            "description": "",
            "category": "brand_compliance",
            "instructions": "x",
            "tools": [],
            "workflow": {"nodes": [], "edges": []},
        },
        timeout=20,
    )
    print("status", forbidden.status_code)
    if forbidden.status_code != 403:
        failures.append("creator was able to create an agent")

    print("\n== creator cannot publish ==")
    forbidden_publish = httpx.post(f"{BASE}/agents/{agent_id}/publish", headers=auth(creator), timeout=20)
    print("status", forbidden_publish.status_code)
    if forbidden_publish.status_code != 403:
        failures.append("creator was able to publish")

    print("\n== execute as creator ==")
    submissions = httpx.get(f"{BASE}/submissions", headers=auth(manager), timeout=20).json()
    submission_id = submissions[0]["id"] if submissions else None
    print("submission", submission_id)
    if submission_id:
        executed = httpx.post(
            f"{BASE}/agents/{agent_id}/execute",
            headers=auth(creator),
            json={"input": {"submission_id": submission_id}},
            timeout=120,
        )
        print("status", executed.status_code)
        if executed.status_code != 201:
            print(executed.text[:800])
            failures.append("creator execute failed")
        else:
            run = executed.json()["run"]
            print("run", run["status"], "steps", len(run.get("steps", [])))
            if run["status"] == "waiting_approval":
                approved = httpx.post(
                    f"{BASE}/agent-runs/{run['id']}/approve",
                    headers=auth(manager),
                    json={"decision": "approve", "note": "API smoke approval"},
                    timeout=120,
                )
                print("approve status", approved.status_code)
                if approved.status_code != 200:
                    failures.append("approval failed")
                else:
                    run = approved.json()["run"]
                    print("after approval", run["status"])
            if run["status"] != "completed":
                failures.append(f"run finished as {run['status']}")

            print("\n== run detail ==")
            detail_run = httpx.get(f"{BASE}/agent-runs/{run['id']}", headers=auth(manager), timeout=20).json()
            print("steps", len(detail_run.get("steps", [])), "approvals", len(detail_run.get("approvals", [])))

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
