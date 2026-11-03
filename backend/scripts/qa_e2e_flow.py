"""End-to-end QA harness for the creator → manager loop.

Runs against the real FastAPI server and the real SQLite database. Every step
asserts on the HTTP response *and* on the row that the step should have written,
so a green run means the data actually persisted — not that a request returned
200.

Isolation: creates a dedicated `Precedent QA` workspace with its own creator and
manager. `require_workspace` scopes every read/write to `user.workspace`, so the
QA rows cannot be seen by the PureGlow demo accounts and vice versa.

Usage (server must be running on :8000):
    python scripts/qa_e2e_flow.py
Writes: ../qa-results/e2e.json
"""
from __future__ import annotations

import io
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import models  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.ids import new_id  # noqa: E402
from app.security import hash_password  # noqa: E402

BASE = os.environ.get("PRECEDENT_API", "http://127.0.0.1:8000")
QA_WS = "Precedent QA"
QA_PREFIX = "QA_PRECEDENT_2026"
PASSWORD = os.environ.get("QA_PASSWORD", "precedent")

RESULTS: list[dict] = []
EVIDENCE: dict = {"workspace": QA_WS, "prefix": QA_PREFIX, "startedAt": datetime.now(timezone.utc).isoformat()}


def check(step: str, ok: bool, detail: str = "", evidence: dict | None = None) -> bool:
    RESULTS.append({"step": step, "ok": bool(ok), "detail": detail})
    print(f"  {'[PASS]' if ok else '[FAIL]'} {step}{(' — ' + detail) if detail else ''}")
    if evidence and EVIDENCE is not None:
        EVIDENCE.setdefault("evidence", {}).setdefault(step, evidence)
    return ok


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def ensure_users() -> tuple[dict, dict]:
    """Create the two QA accounts in their own workspace (idempotent)."""
    db = SessionLocal()
    out = {}
    try:
        for role, email, name in (
            ("creator", "qa.creator@precedent.qa", f"{QA_PREFIX} Creator"),
            ("manager", "qa.manager@precedent.qa", f"{QA_PREFIX} Manager"),
        ):
            user = db.query(models.User).filter(models.User.email == email).first()
            if user is None:
                user = models.User(
                    id=new_id("u"),
                    name=name,
                    email=email,
                    role=role,
                    title="Content Creator" if role == "creator" else "Brand Manager",
                    initials="QC" if role == "creator" else "QM",
                    workspace=QA_WS,
                    password_hash=hash_password(PASSWORD),
                )
                db.add(user)
                db.commit()
            else:
                # Keep the fixture stable across runs.
                user.workspace = QA_WS
                user.role = role
                user.password_hash = hash_password(PASSWORD)
                db.commit()
            out[role] = {"id": user.id, "email": user.email}
    finally:
        db.close()
    return out["creator"], out["manager"]


def make_poster() -> bytes:
    """A real PNG containing the three test claims (OCR-able text)."""
    img = Image.new("RGB", (1080, 1080), (250, 246, 236))
    draw = ImageDraw.Draw(img)
    draw.rectangle([60, 60, 1020, 1020], outline=(78, 122, 61), width=6)
    draw.text((110, 180), "PureGlow Winter Promotion", fill=(35, 40, 42))
    draw.text((110, 320), "India's No. 1 Skin Care Product.", fill=(35, 40, 42))
    draw.text((110, 420), "100% Safe for Everyone.", fill=(35, 40, 42))
    draw.text((110, 520), "Supports healthy-looking skin.", fill=(35, 40, 42))
    draw.text((110, 900), QA_PREFIX, fill=(160, 110, 20))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def login(email: str) -> requests.Session:
    s = requests.Session()
    r = s.post(f"{BASE}/auth/login", json={"email": email, "password": PASSWORD}, timeout=20)
    r.raise_for_status()
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


def db_row(model, row_id):
    db = SessionLocal()
    try:
        return db.get(model, row_id)
    finally:
        db.close()


def count(model, **filters):
    db = SessionLocal()
    try:
        q = db.query(model)
        for k, v in filters.items():
            q = q.filter(getattr(model, k) == v)
        return q.count()
    finally:
        db.close()


def snapshots(sub_id: str):
    """Return the immutable version snapshots for a submission, oldest first."""
    db = SessionLocal()
    try:
        rows = (
            db.query(models.SubmissionVersion)
            .filter(models.SubmissionVersion.submission_id == sub_id)
            .order_by(models.SubmissionVersion.version_number)
            .all()
        )
        return [
            {
                "id": r.id,
                "versionNumber": r.version_number,
                "status": r.status,
                "contentHash": r.content_hash,
                "copy": r.copy,
                "frozenAt": r.frozen_at.isoformat() if r.frozen_at else None,
                "reviewSnapshot": r.review_snapshot or {},
            }
            for r in rows
        ]
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Flow
# ---------------------------------------------------------------------------

def main() -> int:
    print("=" * 70)
    print("PRECEDENT E2E — creator to manager loop")
    print("=" * 70)

    creator_ids, manager_ids = ensure_users()
    EVIDENCE["users"] = {"creator": creator_ids, "manager": manager_ids}
    check("QA workspace users exist", bool(creator_ids["id"] and manager_ids["id"]), QA_WS)

    creator = login(creator_ids["email"])
    manager = login(manager_ids["email"])
    check("Creator login", True, creator_ids["email"])
    check("Manager login", True, manager_ids["email"])

    # --- QA rules ---------------------------------------------------------
    # A rule created through the API lands as `needs_confirmation` by design: a
    # machine-proposed rule must be accepted by a human before it starts judging
    # live content. The harness therefore confirms it, exactly as the UI does.
    rule_ids = []
    rule_specs = (
        ("CL-03", "Only Approved Product Claims",
         "Only claims on the approved claims list may appear in external communication."),
        ("CL-04", "No Unqualified Superlatives",
         "Claims such as 'No. 1' require approved supporting evidence."),
        ("CL-05", "Substantiation Required",
         "Absolute safety claims such as '100% safe' require supporting evidence."),
    )
    for code, title, text in rule_specs:
        r = manager.post(
            f"{BASE}/rules",
            json={
                "code": code,
                "title": title,
                "summary": text,
                "condition": text,
                "action": "flag",
                "priority": "High",
                "category": "Claims",
            },
            timeout=20,
        )
        if r.status_code == 201:
            rid = r.json().get("id")
        else:
            # Already exists in this workspace from a previous run.
            listing = manager.get(f"{BASE}/rules", timeout=20).json()
            match = next((x for x in listing if x.get("code") == code), None)
            rid = match.get("id") if match else None
            if rid is None:
                print(f"  ! {code}: HTTP {r.status_code} {r.text[:160]}")
        if rid:
            # Confirming twice is harmless and keeps reruns idempotent.
            manager.post(f"{BASE}/rules/{rid}/confirm", timeout=20)
            rule_ids.append(rid)

    listing = manager.get(f"{BASE}/rules", timeout=20).json()
    active = [x for x in listing if x.get("code") in {c for c, _, _ in rule_specs} and x.get("status") == "active"]
    check(
        "QA rules CL-03/04/05 exist and are active",
        len(active) == 3,
        f"{len(active)}/3 active in {QA_WS}",
    )
    EVIDENCE["rules"] = [
        {"id": x["id"], "code": x["code"], "title": x.get("title"), "status": x.get("status")}
        for x in active
    ]

    # --- Creator: create the submission ----------------------------------
    r = creator.post(
        f"{BASE}/submissions",
        json={
            "title": f"{QA_PREFIX} PureGlow Winter Promotion",
            "excerpt": "Winter skincare promotion with three controlled claims.",
            "type": "Image",
            "channel": "Instagram",
            "brand": "PureGlow",
            "text": (
                "PureGlow Winter Promotion. India's No. 1 Skin Care Product. "
                "100% Safe for Everyone. Supports healthy-looking skin."
            ),
        },
        timeout=20,
    )
    ok = check("Creator creates submission", r.status_code in (200, 201), f"HTTP {r.status_code}")
    if not ok:
        print(r.text[:400])
        return 1
    sub = r.json()
    sub_id = sub["id"]
    EVIDENCE["submissionId"] = sub_id
    EVIDENCE["submissionTitle"] = sub.get("title")
    row = db_row(models.Submission, sub_id)
    check(
        "Submission persisted with creator + workspace",
        row is not None and row.creator_id == creator_ids["id"] and row.workspace == QA_WS,
        f"{sub_id} · status={row.status if row else 'MISSING'}",
    )

    # --- Upload the poster + run analysis --------------------------------
    files = {"file": ("qa_poster.png", make_poster(), "image/png")}
    data = {"submission_id": sub_id, "title": sub["title"], "channel": "Instagram", "brand": "PureGlow"}
    r = creator.post(f"{BASE}/analysis/upload", files=files, data=data, timeout=60)
    analysis_ok = check("Poster upload accepted", r.status_code in (200, 201), f"HTTP {r.status_code}")
    if analysis_ok:
        EVIDENCE["analysis"] = r.json()
    else:
        print(r.text[:400])

    # Analysis runs in a background task. Findings already exist from creation
    # (they are derived from the typed copy), so waiting on findings alone
    # returned before OCR had finished. Wait for the analysis itself instead.
    findings = []
    ocr_text = ""
    analysis_status = ""
    for _ in range(40):
        time.sleep(1.5)
        rr = creator.get(f"{BASE}/analysis/submission/{sub_id}", timeout=20)
        if rr.status_code == 200:
            payload = rr.json()
            analysis_status = payload.get("status") or ""
            ocr_text = payload.get("ocrText") or ""
            findings = (payload.get("submission") or {}).get("findings") or []
            if analysis_status in ("complete", "failed") and findings:
                break
    check(
        "OCR read the poster copy",
        "no. 1" in ocr_text.lower() or "100%" in ocr_text,
        f"status={analysis_status} · {len(ocr_text)} chars of OCR text",
    )
    check(
        "AI review produced findings",
        len(findings) > 0,
        f"{len(findings)} finding(s)",
        {"sample": findings[:2]} if findings else None,
    )
    codes = sorted({f.get("ruleCode") for f in findings})
    check(
        "Findings cover the seeded rules",
        {"CL-04", "CL-05"}.issubset(set(codes)),
        f"codes={codes}",
    )

    row = db_row(models.Submission, sub_id)
    check(
        "Score stored on the submission",
        row is not None and row.compliance_score is not None,
        f"score={getattr(row, 'compliance_score', None)} formula={getattr(row, 'score_formula_version', None)}",
    )

    # --- Immutable version snapshot --------------------------------------
    snaps = snapshots(sub_id)
    check(
        "Immutable version snapshot exists",
        len(snaps) >= 1,
        f"{len(snaps)} submission_version row(s)",
    )
    first = snaps[0] if snaps else None
    check(
        "Snapshot carries copy + content hash",
        bool(first and first["contentHash"] and first["copy"]),
        f"hash={(first['contentHash'][:12] + '…') if first and first['contentHash'] else 'MISSING'}",
    )
    check(
        "Snapshot records the rulebook it was judged against",
        bool(first and first["reviewSnapshot"].get("ruleVersionIds")),
        f"{len(first['reviewSnapshot'].get('ruleVersionIds') or []) if first else 0} rule version(s)",
    )
    check(
        "Submission points at its current version",
        row is not None and bool(row.current_version_id) and row.current_version_id == snaps[-1]["id"],
        f"currentVersionId={getattr(row, 'current_version_id', None)}",
    )

    # --- Manager: sees it in the queue -----------------------------------
    queue = manager.get(f"{BASE}/submissions", timeout=20).json()
    in_queue = any(x["id"] == sub_id for x in queue)
    check("Manager sees the submission", in_queue, f"{len(queue)} visible")

    # --- Manager: request changes ----------------------------------------
    r = manager.post(
        f"{BASE}/submissions/{sub_id}/decide",
        json={
            "action": "Changes Requested",
            "note": "Remove the unsupported 'No. 1' and '100% Safe' claims; keep only approved claims.",
            "version": sub.get("version", 1),
        },
        timeout=20,
    )
    check("Manager requests changes", r.status_code == 200, f"HTTP {r.status_code}")
    row = db_row(models.Submission, sub_id)
    check("Status persisted as changes requested", row.status in ("Changes Requested", "Needs Changes"), str(row.status))
    check(
        "Decision row written",
        count(models.ReviewDecision, submission_id=sub_id) >= 1,
        f"{count(models.ReviewDecision, submission_id=sub_id)} decision(s)",
    )

    # --- Creator: notification + new version ------------------------------
    notes = creator.get(f"{BASE}/notifications", timeout=20)
    note_rows = notes.json() if notes.status_code == 200 else []
    check(
        "Creator notified of the decision",
        isinstance(note_rows, list) and len(note_rows) > 0,
        f"{len(note_rows) if isinstance(note_rows, list) else 0} notification(s)",
    )

    r = creator.post(
        f"{BASE}/submissions/{sub_id}/versions",
        json={
            "text": "PureGlow Winter Promotion. Supports healthy-looking skin.",
            "note": "Removed unsupported superlative and absolute safety claim.",
        },
        timeout=20,
    )
    check("Creator creates a new version", r.status_code in (200, 201), f"HTTP {r.status_code}")
    row = db_row(models.Submission, sub_id)
    check("Version number incremented", row.version >= 2, f"v{row.version}")

    mnotes = manager.get(f"{BASE}/notifications", timeout=20)
    mrows = mnotes.json() if mnotes.status_code == 200 else []
    check(
        "Manager notified of the resubmission",
        isinstance(mrows, list) and any(n.get("type") == "submission_resubmitted" for n in mrows),
        f"{len(mrows) if isinstance(mrows, list) else 0} notification(s)",
    )

    # --- Manager: approve the new version --------------------------------
    r = manager.post(
        f"{BASE}/submissions/{sub_id}/decide",
        json={"action": "Approved", "note": "Only approved claims remain.", "version": row.version},
        timeout=20,
    )
    check("Manager approves the revision", r.status_code == 200, f"HTTP {r.status_code}")
    row = db_row(models.Submission, sub_id)
    check("Status persisted as approved", row.status == "Approved", str(row.status))

    # --- Cross-role visibility -------------------------------------------
    approved = creator.get(f"{BASE}/submissions", timeout=20).json()
    mine = next((x for x in approved if x["id"] == sub_id), None)
    check(
        "Creator sees the approved status",
        mine is not None and mine.get("status") == "Approved",
        str(mine.get("status") if mine else "missing"),
    )

    # --- Audit trail ------------------------------------------------------
    audit = manager.get(f"{BASE}/audit", timeout=20)
    events = audit.json() if audit.status_code == 200 else []
    if isinstance(events, dict):
        events = events.get("items", [])
    related = [e for e in events if e.get("entityId") == sub_id or sub_id in json.dumps(e)]
    check("Audit trail records this submission", len(related) >= 2, f"{len(related)} event(s)")
    EVIDENCE["auditEvents"] = [{"action": e.get("action"), "status": e.get("status")} for e in related[:8]]

    # --- Workspace isolation ---------------------------------------------
    pureglow = requests.post(
        f"{BASE}/auth/login",
        json={"email": "david.kim@pureglow.co", "password": "precedent"},
        timeout=20,
    )
    if pureglow.status_code == 200:
        ph = {"Authorization": f"Bearer {pureglow.json()['token']}"}
        other = requests.get(f"{BASE}/submissions", headers=ph, timeout=20).json()
        leaked = any(x["id"] == sub_id for x in other)
        check("QA submission is invisible to the PureGlow workspace", not leaked, f"{len(other)} rows in PureGlow")
        # And the reverse: QA manager must not read a PureGlow row.
        if other:
            probe = manager.get(f"{BASE}/submissions/{other[0]['id']}", timeout=20)
            check("QA manager cannot read a PureGlow submission", probe.status_code == 404, f"HTTP {probe.status_code}")

    # --- Version history: superseded, frozen, hash-stable -----------------
    snaps = snapshots(sub_id)
    check(
        "Version history grew with the revision",
        len(snaps) >= 3,
        f"{len(snaps)} snapshot(s): {[s['status'] for s in snaps]}",
    )
    frozen = [s for s in snaps if s["frozenAt"]]
    check(
        "Approved version is frozen with a hash",
        any(s["status"] == "approved" and s["frozenAt"] and s["contentHash"] for s in snaps),
        f"{len(frozen)} frozen snapshot(s)",
    )
    check(
        "Earlier versions are marked superseded",
        any(s["status"] == "superseded" for s in snaps),
        f"statuses={[s['status'] for s in snaps]}",
    )
    check(
        "Approved snapshot holds the cleaned copy",
        any(
            s["status"] == "approved" and "no. 1" not in s["copy"].lower() and "100%" not in s["copy"]
            for s in snaps
        ),
        f"approved copy={next((s['copy'][:48] for s in snaps if s['status'] == 'approved'), 'MISSING')}",
    )

    # --- Write evidence ---------------------------------------------------
    EVIDENCE["finishedAt"] = datetime.now(timezone.utc).isoformat()
    EVIDENCE["results"] = RESULTS
    out = Path(__file__).resolve().parents[2] / "qa-results"
    out.mkdir(exist_ok=True)
    (out / "e2e.json").write_text(json.dumps(EVIDENCE, indent=2, default=str), encoding="utf-8")

    passed = sum(1 for r in RESULTS if r["ok"])
    print(f"\n{passed}/{len(RESULTS)} checks passed")
    print(f"submission id: {sub_id}")
    print(f"evidence: {out / 'e2e.json'}")
    return 0 if passed == len(RESULTS) else 2


if __name__ == "__main__":
    raise SystemExit(main())
