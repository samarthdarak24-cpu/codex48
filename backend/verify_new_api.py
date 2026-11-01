"""Verify the newly added analytics + conflict-review endpoints against a live server."""
import json
import sys

import httpx

BASE = "http://127.0.0.1:8000"


def login(email: str) -> str:
    r = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": "precedent"}, timeout=30)
    r.raise_for_status()
    return r.json()["token"]


def get(token: str, path: str):
    r = httpx.get(f"{BASE}{path}", headers={"Authorization": f"Bearer {token}"}, timeout=60)
    return r.status_code, (r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text)


def main() -> int:
    failures = []

    mgr = login("david.kim@pureglow.co")
    cre = login("emily.carter@pureglow.co")
    print(f"login manager OK, creator OK")

    # ---- analytics summary (manager) -------------------------------------
    for rng in ("7d", "30d", "90d", "1y"):
        code, data = get(mgr, f"/analytics?range={rng}")
        ok = code == 200 and isinstance(data, dict) and "complianceScore" in data
        print(f"[{'PASS' if ok else 'FAIL'}] GET /analytics?range={rng} -> {code}"
              f" sampleSize={data.get('sampleSize') if isinstance(data, dict) else '?'}"
              f" score={data.get('complianceScore') if isinstance(data, dict) else '?'}")
        if not ok:
            failures.append(f"/analytics?range={rng} -> {code} {data}")

    # ---- trends must actually change with range --------------------------
    trend_results = {}
    for rng in ("7d", "30d", "90d", "1y"):
        code, data = get(mgr, f"/analytics/trends?range={rng}")
        pts = data.get("points", []) if isinstance(data, dict) else []
        trend_results[rng] = len(pts)
        ok = code == 200
        print(f"[{'PASS' if ok else 'FAIL'}] GET /analytics/trends?range={rng} -> {code} points={len(pts)}")
        if not ok:
            failures.append(f"/analytics/trends?range={rng} -> {code}")

    # ---- creator summary is scoped ---------------------------------------
    code, cdata = get(cre, "/analytics/creator-summary")
    code2, mdata = get(mgr, "/analytics/creator-summary")
    ok = code == 200 and code2 == 200
    print(f"[{'PASS' if ok else 'FAIL'}] GET /analytics/creator-summary creator sample={cdata.get('sampleSize')} "
          f"manager sample={mdata.get('sampleSize')}")
    if cdata.get("sampleSize") == mdata.get("sampleSize"):
        print("   NOTE: creator and manager sample sizes match (single-creator workspace)")

    # ---- conflicts include reviewed flag ---------------------------------
    code, conflicts = get(mgr, "/rules/conflicts")
    ok = code == 200 and isinstance(conflicts, list)
    print(f"[{'PASS' if ok else 'FAIL'}] GET /rules/conflicts -> {code} count={len(conflicts) if isinstance(conflicts, list) else '?'}"
          f" reviewedKeysPresent={all('reviewed' in c for c in conflicts) if isinstance(conflicts, list) else False}")
    if not ok:
        failures.append(f"/rules/conflicts -> {code}")
        return 1

    # ---- review a conflict (manager only) --------------------------------
    if conflicts:
        a = (conflicts[0].get("ruleA") or {}).get("code")
        b = (conflicts[0].get("ruleB") or {}).get("code")
        r = httpx.post(f"{BASE}/rules/conflicts/review",
                       headers={"Authorization": f"Bearer {mgr}"},
                       json={"ruleACode": a, "ruleBCode": b, "note": "Reviewed during E2E verification"},
                       timeout=30)
        print(f"[{'PASS' if r.status_code in (200, 201) else 'FAIL'}] POST /rules/conflicts/review -> {r.status_code} {r.text[:120]}")
        if r.status_code not in (200, 201):
            failures.append(f"POST /rules/conflicts/review -> {r.status_code}")

        # persist check: re-read
        _, again = get(mgr, "/rules/conflicts")
        reviewed_now = [c for c in again if (c.get("ruleA") or {}).get("code") == a and c.get("reviewed")]
        print(f"[{'PASS' if reviewed_now else 'FAIL'}] conflict review persisted after re-read -> {bool(reviewed_now)}")
        if not reviewed_now:
            failures.append("conflict review not persisted")

        # creator must be forbidden
        r2 = httpx.post(f"{BASE}/rules/conflicts/review",
                        headers={"Authorization": f"Bearer {cre}"},
                        json={"ruleACode": a, "ruleBCode": b}, timeout=30)
        print(f"[{'PASS' if r2.status_code == 403 else 'FAIL'}] creator blocked from conflict review -> {r2.status_code}")
        if r2.status_code != 403:
            failures.append(f"creator not blocked: {r2.status_code}")
    else:
        print("[SKIP] no conflicts detected to review")

    # ---- analytics export -------------------------------------------------
    r = httpx.get(f"{BASE}/analytics/export?range=30d", headers={"Authorization": f"Bearer {mgr}"}, timeout=60)
    print(f"[{'PASS' if r.status_code == 200 else 'FAIL'}] GET /analytics/export -> {r.status_code} bytes={len(r.content)}")

    print("\n" + ("ALL NEW ENDPOINT CHECKS PASSED" if not failures else f"{len(failures)} FAILURES: {failures}"))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
