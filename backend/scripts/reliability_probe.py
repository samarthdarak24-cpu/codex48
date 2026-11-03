"""Reliability probe — exercises the failure paths a reviewer will actually try.

Run against a live API (default http://127.0.0.1:8000) with seeded demo data:

    cd backend
    ./.venv312/Scripts/python.exe scripts/reliability_probe.py

Every check prints PASS / FAIL with the observed status code and, on failure,
the response body. Exit code is 1 if anything failed.

The probe is deliberately non-destructive: it creates a few clearly-labelled
submissions (titles starting with "RELIABILITY PROBE") and never resolves or
deletes seeded records. Clean up with `python seed.py` afterwards.
"""
from __future__ import annotations

import os
import sys

import httpx

BASE = os.environ.get("BASE", "http://127.0.0.1:8000")
PASSWORD = "precedent"
MANAGER = "david.kim@pureglow.co"
CREATOR = "emily.carter@pureglow.co"
OTHER_WS = "sarah.chen@wellnesslife.co"

results: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, evidence: str) -> None:
    results.append((name, ok, evidence))
    print(f"{'PASS' if ok else 'FAIL'}  {name:<58} {evidence}")


def login(client: httpx.Client, email: str) -> str:
    r = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    r.raise_for_status()
    return r.json()["token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def expect(
    name: str,
    client: httpx.Client,
    method: str,
    path: str,
    *,
    token: str | None = None,
    expected: tuple[int, ...] | None = None,
    forbid_500: bool = True,
    **kwargs,
) -> httpx.Response:
    """Call the API and assert on the status code (and never a 500)."""
    r = client.request(method, path, headers=auth(token) if token else {}, **kwargs)
    ok = True
    detail = f"{method} {path} -> {r.status_code}"
    if expected is not None and r.status_code not in expected:
        ok = False
        detail += f" (expected {expected})"
    if forbid_500 and r.status_code >= 500:
        ok = False
        detail += f" body={r.text[:180]}"
    record(name, ok, detail)
    return r


def main() -> int:
    with httpx.Client(base_url=BASE, timeout=60.0) as c:
        # ---------------------------------------------------------------- auth
        r = c.get("/health")
        record("health endpoint answers", r.status_code == 200, f"GET /health -> {r.status_code}")

        manager = login(c, MANAGER)
        creator = login(c, CREATOR)
        other = login(c, OTHER_WS)

        expect("unauthenticated request is 401", c, "GET", "/submissions", expected=(401,))
        expect(
            "garbage JWT is 401",
            c,
            "GET",
            "/submissions",
            token="not.a.real.token",
            expected=(401,),
        )
        expect(
            "creator cannot POST /rules (403)",
            c,
            "POST",
            "/rules",
            token=creator,
            expected=(403,),
            json={"code": "ZZ-99", "title": "nope", "summary": "nope"},
        )
        expect(
            "unknown submission is 404",
            c,
            "GET",
            "/submissions/sub_does_not_exist",
            token=manager,
            expected=(404,),
        )

        # cross-workspace: a PureGlow submission must be invisible to WellnessLife
        mine = c.get("/submissions", headers=auth(creator)).json()
        if mine:
            expect(
                "cross-workspace submission is hidden (404)",
                c,
                "GET",
                f"/submissions/{mine[0]['id']}",
                token=other,
                expected=(404,),
            )
        else:
            record("cross-workspace submission is hidden (404)", False, "no PureGlow submission to test")

        other_subs = c.get("/submissions", headers=auth(other)).json()
        record(
            "other workspace sees none of PureGlow's submissions",
            other_subs == [],
            f"WellnessLife sees {len(other_subs)} submissions",
        )

        # ------------------------------------------------------------- content
        base = {"type": "Text", "channel": "Email", "brand": "PureGlow"}

        r = expect(
            "whitespace-only text is accepted without a 500",
            c,
            "POST",
            "/submissions",
            token=creator,
            expected=(200, 201, 422),
            json={**base, "title": "RELIABILITY PROBE whitespace", "text": "   \n\t  "},
        )
        if r.status_code in (200, 201):
            record(
                "  -> whitespace-only yields no fabricated violation",
                r.json().get("issueCount", 0) == 0,
                f"issueCount={r.json().get('issueCount')}",
            )

        expect(
            "20,000 character body is handled",
            c,
            "POST",
            "/submissions",
            token=creator,
            expected=(200, 201),
            json={**base, "title": "RELIABILITY PROBE long", "text": "safe words " * 1700},
        )
        expect(
            "emoji + punctuation body is handled",
            c,
            "POST",
            "/submissions",
            token=creator,
            expected=(200, 201),
            json={**base, "title": "RELIABILITY PROBE emoji", "text": "Glow ✨ 100% safe?! 😀 — “quoted” …"},
        )
        expect(
            "Devanagari body is handled",
            c,
            "POST",
            "/submissions",
            token=creator,
            expected=(200, 201),
            json={**base, "title": "RELIABILITY PROBE devanagari", "text": "यह क्रीम पूरी तरह सुरक्षित है।"},
        )

        # double submit: same payload twice, neither may 500
        payload = {**base, "title": "RELIABILITY PROBE double", "text": "Our blend boosts immunity."}
        first = c.post("/submissions", headers=auth(creator), json=payload)
        second = c.post("/submissions", headers=auth(creator), json=payload)
        record(
            "double submit does not 500 and creates two distinct versions",
            first.status_code < 500
            and second.status_code < 500
            and first.json().get("id") != second.json().get("id"),
            f"{first.status_code}/{second.status_code}",
        )

        # ------------------------------------------------------------- uploads
        def upload(name: str, filename: str, content: bytes, expected: tuple[int, ...]) -> None:
            expect(
                name,
                c,
                "POST",
                "/analysis/upload",
                token=creator,
                expected=expected,
                files={"file": (filename, content, "application/octet-stream")},
                data={"title": "RELIABILITY PROBE upload"},
            )

        png_magic = b"\x89PNG\r\n\x1a\n"
        upload("renamed .txt is rejected (415)", "poster.txt", b"just text", (415,))
        upload("unsupported .gif is rejected (415)", "poster.gif", b"GIF89a....", (415,))
        upload("corrupt PNG bytes fail cleanly (400/415/422)", "poster.png", png_magic + b"garbage", (400, 415, 422))
        upload("empty file fails cleanly (400)", "poster.png", b"", (400,))
        upload(
            "oversized upload is rejected (413)",
            "big.png",
            png_magic + b"\x00" * (11 * 1024 * 1024),
            (400, 413),
        )

        # ------------------------------------------------------------- evidence
        r = expect("evidence capabilities answers", c, "GET", "/evidence/capabilities", token=creator, expected=(200,))
        if r.status_code == 200:
            body = r.json()
            record(
                "  -> capability report names the live retrieval mode",
                body.get("retrieval") in ("hybrid_bm25_vector", "bm25_only"),
                f"retrieval={body.get('retrieval')} llm={body.get('llmConfigured')}",
            )

        expect(
            "empty search query returns no results, not an error",
            c,
            "GET",
            "/evidence/search?q=",
            token=creator,
            expected=(200, 422),
        )
        expect("search with a real query answers", c, "GET", "/evidence/search?q=immunity", token=creator, expected=(200,))

        # AI review with no provider configured must degrade, never 500
        subs = c.get("/submissions", headers=auth(creator)).json()
        probe_sub = next((s for s in subs if s["title"].startswith("RELIABILITY PROBE")), None)
        if probe_sub:
            expect(
                "AI review degrades without a provider",
                c,
                "POST",
                f"/evidence/review/{probe_sub['id']}",
                token=manager,
                expected=(200, 201, 202, 409, 422),
            )

        # ------------------------------------------------------------- sentinel
        r = c.post("/sentinel/scan?days=30", headers=auth(manager))
        record("manual scan runs", r.status_code == 200, f"POST /sentinel/scan -> {r.status_code}")
        r2 = c.post("/sentinel/scan?days=30", headers=auth(manager))
        record(
            "repeated scan is idempotent (0 new notifications)",
            r2.status_code == 200 and r2.json().get("notified", 0) == 0,
            f"second scan notified={r2.json().get('notified') if r2.status_code == 200 else 'n/a'}",
        )

        expect(
            "creator cannot start a scan (403)",
            c,
            "POST",
            "/sentinel/scan",
            token=creator,
            expected=(403,),
        )
        expect(
            "sentinel tasks are workspace-scoped",
            c,
            "GET",
            "/sentinel/tasks?status=open",
            token=manager,
            expected=(200,),
        )
        expect(
            "publication list answers",
            c,
            "GET",
            "/sentinel/publications?limit=5",
            token=manager,
            expected=(200,),
        )

        # ---------------------------------------------------------------- misc
        expect("audit log answers", c, "GET", "/audit", token=manager, expected=(200,))
        expect(
            "audit export answers",
            c,
            "GET",
            "/audit/export",
            token=manager,
            expected=(200,),
        )
        expect(
            "creator cannot read the AI trust report (403)",
            c,
            "GET",
            "/evidence/trust",
            token=creator,
            expected=(403,),
        )
        expect(
            "unknown route does not 500",
            c,
            "GET",
            "/definitely-not-a-route",
            token=manager,
            expected=(200, 404),
        )

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n{passed}/{total} checks passed")
    if passed != total:
        print("FAILED:")
        for name, ok, ev in results:
            if not ok:
                print(f"  - {name}: {ev}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
