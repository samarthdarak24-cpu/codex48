"""Precedent — full-stack QA harness (GreenLeaf Organics).

Runs against a DEDICATED test database (backend/qa_test.db) and a temporary
uploads dir, so it never touches the demo `precedent.db`.

It seeds a fictional "GreenLeaf Organics" workspace plus a second "PureGlow"
workspace (used purely as an isolation probe), then exercises the real FastAPI
app through TestClient and verifies the resulting SQLite rows directly.

Run:  python qa_audit.py
Writes: ../reports/qa_results.json
"""
import base64
import json
import os
import sys
import traceback
from datetime import datetime, timedelta, timezone

# --- configure a dedicated test environment BEFORE importing the app --------
_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
QA_DB = os.path.join(_HERE, "qa_test.db")
QA_UPLOADS = os.path.join(_HERE, "qa_uploads")
os.environ["DATABASE_URL"] = f"sqlite:///{QA_DB}"
os.environ["UPLOADS_DIR"] = QA_UPLOADS
# Ensure AI/image providers are treated as unconfigured for deterministic runs.
for _v in ("LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL", "IMAGE_SOURCE_API_URL", "IMAGE_SOURCE_API_KEY"):
    os.environ.pop(_v, None)

from fastapi.testclient import TestClient  # noqa: E402

import app.db  # noqa: E402
from app import models  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.ids import new_id  # noqa: E402
from app.security import hash_password  # noqa: E402
from app.rule_engine import run_rules  # noqa: E402

RESULTS = []
CTX = {}
PNG_1x1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)
PW = "qa-pass-123"


def check(area, name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    RESULTS.append({"area": area, "name": name, "status": status, "detail": "" if cond else detail})
    print(f"[{status}] {area} :: {name}" + ("" if cond else f"  -- {detail}"))
    return cond


def hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


def login(client, email, password=PW):
    return client.post("/auth/login", json={"email": email, "password": password})


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------
def seed():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        pw = hash_password(PW)
        grace = models.User(id="u_grace", name="Grace Lin", email="grace@greenleaf.test",
                            role="manager", title="Brand Manager", initials="GL",
                            workspace="GreenLeaf", workspace_status="active", password_hash=pw)
        leo = models.User(id="u_leo", name="Leo Park", email="leo@greenleaf.test",
                          role="creator", title="Content Creator", initials="LP",
                          workspace="GreenLeaf", workspace_status="active", password_hash=pw)
        mia = models.User(id="u_mia", name="Mia Chen", email="mia@greenleaf.test",
                          role="creator", title="Copywriter", initials="MC",
                          workspace="GreenLeaf", workspace_status="active", password_hash=pw)
        rival = models.User(id="u_rival", name="Rival Manager", email="rival@pureglow.test",
                            role="manager", title="Brand Manager", initials="RM",
                            workspace="PureGlow", workspace_status="active", password_hash=pw)
        db.add_all([grace, leo, mia, rival])
        db.flush()

        # GreenLeaf guideline doc + passages
        doc = models.GuidelineDoc(id="doc_gl", workspace="GreenLeaf",
                                  name="GreenLeaf Brand Guide v1.0",
                                  description="Colour, claims and tone rules.",
                                  category="Visual Identity", version="v1.0", status="active",
                                  file_type="TXT", file_size="1 KB", pages=1, owner_id=grace.id,
                                  extracted_passages=0, visible_to_creators=True)
        db.add(doc)
        db.flush()
        passages = [
            "Section 1.2 — Backgrounds. Campaign backgrounds must use the approved green #7AB93B or neutral sand #F4EFE3.",
            "Section 2.4 — Superlatives. Terms such as 100% safe or guaranteed must be substantiated or removed.",
            "Section 3.2 — Health. Copy must not state or imply immunity, treatment, cure or healing.",
            "Section 4.1 — Claims. Only claims on the Approved Claims List may appear, using exact wording.",
            "Section 6.2 — Promotions. Any percent-off statement needs a dated campaign window.",
            "Section 2.2 — Tone. We never pressure readers; avoid urgency stacking and repeated exclamation marks.",
            "Section 2.3 — Clear space. Maintain clear space equal to the shield height on all sides.",
            "Section 1.1 — Typefaces. Use Inter for headlines and Instrument Serif for body copy.",
        ]
        for i, p in enumerate(passages, start=1):
            db.add(models.GuidelinePassage(id=new_id("gp"), doc_id=doc.id, workspace="GreenLeaf",
                                           page_number=1, paragraph_number=i,
                                           heading=p.split("—")[0].strip(), passage_text=p))
        doc.extracted_passages = len(passages)

        rule_specs = [
            ("CL-04", "No unqualified superlatives", "Absolute claim", "Absolute terms require substantiation.",
             passages[1], "High"),
            ("CL-06", "No medical or immunity claims", "Health claim", "No immunity/treatment claims.",
             passages[2], "High"),
            ("CL-03", "Only approved product claims", "Product claim", "Use approved claim wording.",
             passages[3], "Medium"),
            ("MK-02", "Discount claims must be verifiable", "Promotional claim", "Needs a campaign window.",
             passages[4], "Medium"),
            ("TV-02", "Warm, plain-spoken tone", "Tone of voice", "No urgency pressure.", passages[5], "Low"),
            ("BR-01", "Approved background colours", "Visual background", "Background must be approved.",
             passages[0], "High"),
            ("LO-02", "Logo clear space", "Logo usage", "Clear space minimum.", passages[6], "High"),
            ("TY-01", "Approved typefaces only", "Typography", "Approved typefaces.", passages[7], "Medium"),
        ]
        for code, title, subject, cond, passage, prio in rule_specs:
            db.add(models.Rule(id=new_id("rule"), workspace="GreenLeaf", code=code, title=title,
                               summary=passage, subject=subject, condition=cond, action="Review",
                               scope="GreenLeaf · All channels", priority=prio, status="active",
                               source_doc_id=doc.id, source_version="v1.0",
                               source_passage=passage, source_page=1, overrides_this_quarter=0))

        # PureGlow isolation probe: doc + rule + claim (must NOT leak to GreenLeaf)
        pdoc = models.GuidelineDoc(id="doc_pg", workspace="PureGlow", name="PureGlow Brand Book",
                                   description="PureGlow only.", category="Visual Identity",
                                   version="v1.0", status="active", file_type="PDF", file_size="1 MB",
                                   pages=1, owner_id=rival.id, extracted_passages=1, visible_to_creators=True)
        db.add(pdoc)
        db.flush()
        db.add(models.GuidelinePassage(id=new_id("gp"), doc_id=pdoc.id, workspace="PureGlow",
                                       page_number=1, paragraph_number=1, heading="Intro",
                                       passage_text="PureGlow confidential guidance."))
        db.add(models.Rule(id=new_id("rule"), workspace="PureGlow", code="PG-01", title="PureGlow only rule",
                           subject="Internal", condition="internal", action="Review", scope="PureGlow",
                           status="active", source_doc_id=pdoc.id, source_passage="PureGlow confidential guidance.",
                           source_page=1))
        db.add(models.ApprovedClaim(id=new_id("cl"), workspace="GreenLeaf", text="made without added fragrance",
                                    product="GreenLeaf Serum", source="GreenLeaf guide", scope="GreenLeaf · All",
                                    status="approved", approved_at=datetime.now(timezone.utc), approved_by=grace.id))
        db.add(models.ApprovedClaim(id=new_id("cl"), workspace="GreenLeaf", text="Gentle care for sensitive skin",
                                    product="GreenLeaf Serum", source="GreenLeaf guide", scope="GreenLeaf · All",
                                    status="approved", approved_at=datetime.now(timezone.utc), approved_by=grace.id))
        db.add(models.ApprovedClaim(id=new_id("cl"), workspace="PureGlow", text="PUREGLOW SECRET CLAIM",
                                    product="PureGlow", source="PureGlow", scope="PureGlow",
                                    status="approved", approved_at=datetime.now(timezone.utc), approved_by=rival.id))

        # PureGlow approved exception for TV-02 (isolation probe): must NOT
        # suppress a GreenLeaf TV-02 finding.
        db.add(models.ExceptionRequest(id="ex_pg_probe", workspace="PureGlow", code="EXC-PG-1",
                                       content_id="", content_title="PureGlow campaign", content_meta="",
                                       brand="PureGlow", rule_code="TV-02", rule_title="Warm tone",
                                       reason="PureGlow exception", scope="All brands",
                                       requested_by_id=rival.id, decided_by_id=rival.id,
                                       effective_from=datetime.now(timezone.utc) - timedelta(days=1),
                                       expires_at=datetime.now(timezone.utc) + timedelta(days=30),
                                       status="Approved", conditions="PureGlow only"))
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
def run_tests(client):
    # ---- AUTH -------------------------------------------------------------
    r = login(client, "leo@greenleaf.test")
    check("auth", "valid login returns token + user", r.status_code == 200 and "token" in r.json(), r.text[:200])
    creator = r.json().get("token")
    r = login(client, "grace@greenleaf.test")
    manager = r.json().get("token")
    r = login(client, "mia@greenleaf.test")
    creator2 = r.json().get("token")
    r = login(client, "rival@pureglow.test")
    rival = r.json().get("token")
    CTX.update(creator=creator, manager=manager, creator2=creator2, rival=rival)

    r = login(client, "leo@greenleaf.test", "wrong-password")
    check("auth", "invalid password rejected (401)", r.status_code == 401, f"got {r.status_code}")
    r = client.get("/auth/me")
    check("auth", "unauthenticated /auth/me rejected (401)", r.status_code == 401, f"got {r.status_code}")
    r = client.get("/auth/me", headers=hdr(creator))
    check("auth", "/auth/me returns role", r.status_code == 200 and r.json().get("role") == "creator", r.text[:200])
    r = client.post("/auth/logout", headers=hdr(creator))
    check("auth", "logout succeeds", r.status_code == 200 and r.json().get("success") is True, r.text[:200])

    # ---- RBAC -------------------------------------------------------------
    r = client.post("/rules", json={"title": "Creator attempt"}, headers=hdr(creator))
    check("rbac", "creator cannot create rule (403)", r.status_code == 403, f"got {r.status_code}")
    r = client.post("/claims", json={"text": "x", "product": "p", "source": "s", "scope": "z"}, headers=hdr(creator))
    check("rbac", "creator cannot create claim (403)", r.status_code == 403, f"got {r.status_code}")
    r = client.post("/guidelines", files={"file": ("x.txt", b"hello world", "text/plain")},
                    data={"name": "x"}, headers=hdr(creator))
    check("rbac", "creator cannot upload guideline (403)", r.status_code == 403, f"got {r.status_code}")
    r = client.post("/assets", files={"file": ("x.png", PNG_1x1, "image/png")}, data={"name": "x"},
                    headers=hdr(creator))
    check("rbac", "creator CAN upload asset (own content)", r.status_code == 200, r.text[:200])

    # ---- GUIDELINES -------------------------------------------------------
    txt = ("Section 1.2 — Backgrounds. Campaign backgrounds must use the approved green #7AB93B.\n\n"
           "Section 2.4 — Superlatives. Terms such as 100% safe must be substantiated.\n\n"
           "Section 6.2 — Promotions. Percent-off statements need a dated window.")
    r = client.post("/guidelines",
                    files={"file": ("greenleaf_guide.txt", txt.encode(), "text/plain")},
                    data={"name": "GreenLeaf Upload Guide", "category": "Visual Identity",
                          "brand": "GreenLeaf Organics", "visible_to_creators": "true"},
                    headers=hdr(manager))
    ok = r.status_code == 200
    gl_doc = r.json() if ok else {}
    check("guidelines", "manager uploads TXT guideline", ok, r.text[:200])
    check("guidelines", "extracted passages indexed", gl_doc.get("extractedPassages", 0) >= 1,
          f"extractedPassages={gl_doc.get('extractedPassages')}")
    check("guidelines", "AI suggestions empty when unconfigured (no fabrication)",
          gl_doc.get("suggestedRules") == [], f"suggestedRules={gl_doc.get('suggestedRules')}")
    if ok:
        rp = client.get(f"/guidelines/{gl_doc['id']}/passages", headers=hdr(creator))
        check("guidelines", "passages retrievable with page refs",
              rp.status_code == 200 and len(rp.json()) >= 1 and "pageNumber" in rp.json()[0], rp.text[:200])
        rs = client.get("/guidelines/search", params={"q": "background"}, headers=hdr(creator))
        check("guidelines", "full-text search returns passages",
              rs.status_code == 200 and isinstance(rs.json(), list) and len(rs.json()) >= 1, rs.text[:200])
    r = client.post("/guidelines", files={"file": ("bad.exe", b"MZ...", "application/octet-stream")},
                    data={"name": "bad"}, headers=hdr(manager))
    check("guidelines", "invalid extension rejected (415)", r.status_code == 415, f"got {r.status_code}")
    r = client.post("/guidelines", files={"file": ("empty.pdf", b"", "application/pdf")},
                    data={"name": "empty"}, headers=hdr(manager))
    check("guidelines", "empty upload rejected (400)", r.status_code == 400, f"got {r.status_code}")

    # ---- RULES ------------------------------------------------------------
    r = client.post("/rules", json={"title": "GreenLeaf New Rule"}, headers=hdr(manager))
    check("rules", "create draft without code -> 201 + auto code",
          r.status_code == 201 and bool(r.json().get("code")), r.text[:200])
    new_rule = r.json() if r.status_code == 201 else {}
    check("rules", "new draft needs confirmation", new_rule.get("status") == "needs_confirmation",
          f"status={new_rule.get('status')}")
    if new_rule:
        rc = client.post(f"/rules/{new_rule['id']}/confirm", headers=hdr(manager))
        check("rules", "confirm draft -> active", rc.status_code == 200 and rc.json().get("status") == "active",
              rc.text[:200])
    r = client.post("/rules", json={"title": "dup", "code": "CL-04"}, headers=hdr(manager))
    check("rules", "duplicate explicit code rejected (409)", r.status_code == 409, f"got {r.status_code}")
    r = client.get("/rules/conflicts", headers=hdr(manager))
    check("rules", "conflict report returns list", r.status_code == 200 and isinstance(r.json(), list), r.text[:200])

    # ---- CLAIMS -----------------------------------------------------------
    r = client.post("/claims", json={"text": "Recyclable glass jar", "product": "GreenLeaf Serum",
                                     "source": "GreenLeaf guide", "scope": "GreenLeaf · All"},
                    headers=hdr(manager))
    check("claims", "manager creates claim", r.status_code == 200 and r.json().get("text") == "Recyclable glass jar",
          r.text[:200])
    claim_id = r.json().get("id") if r.status_code == 200 else None
    if claim_id:
        db = SessionLocal()
        row = db.get(models.ApprovedClaim, claim_id)
        check("claims", "claim persisted with correct workspace",
              row is not None and row.workspace == "GreenLeaf", f"workspace={getattr(row,'workspace',None)}")
        db.close()

    # ---- SUBMISSIONS ------------------------------------------------------
    def create_sub(title, text, asset=None, assetId=None, tok=None):
        body = {"title": title, "type": "Image", "channel": "Instagram",
                "brand": "GreenLeaf Organics", "text": text}
        if asset:
            body["asset"] = asset
        if assetId:
            body["assetId"] = assetId
        rr = client.post("/submissions", json=body, headers=hdr(tok or creator))
        return rr

    # compliant
    r = create_sub("Compliant Post", "Gentle care for sensitive skin.",
                   {"backgroundColour": "#7AB93B", "typeface": "Inter", "clearSpaceRatio": 2.0})
    comp = r.json() if r.status_code == 200 else {}
    check("submissions", "create compliant content", r.status_code == 200, r.text[:200])
    check("submissions", "compliant content has 0 open issues", comp.get("issueCount") == 0,
          f"issueCount={comp.get('issueCount')}, findings={[f['ruleCode'] for f in comp.get('findings', [])]}")
    check("submissions", "version 1 created", comp.get("version") == 1 and len(comp.get("versions", [])) == 1,
          f"version={comp.get('version')}")

    # violating (text + visual)
    r = create_sub("Violating Banner",
                   "100% safe. Boosts immunity. 20% off. Hurry! Don't miss out! Order now!",
                   {"backgroundColour": "#FF0000", "typeface": "Sohne", "clearSpaceRatio": 0.8})
    viol = r.json() if r.status_code == 200 else {}
    codes = sorted({f["ruleCode"] for f in viol.get("findings", [])})
    check("submissions", "violating content flagged", r.status_code == 200 and viol.get("issueCount", 0) >= 4,
          f"issueCount={viol.get('issueCount')}")
    for c in ("CL-04", "CL-06", "MK-02", "BR-01"):
        check("rule_engine", f"expected finding {c}", c in codes, f"codes={codes}")
    check("rule_engine", "evidence verified against stored passage",
          all(f.get("evidenceVerified") for f in viol.get("findings", []) if f.get("sourcePassage")),
          "some findings lack verified evidence")

    # unapproved claim
    r = create_sub("Unapproved Claim", "Fragrance-free and chemical-free formula.",
                   {"backgroundColour": "#7AB93B", "typeface": "Inter", "clearSpaceRatio": 2.0})
    ua = r.json() if r.status_code == 200 else {}
    check("submissions", "unapproved claim -> CL-03", "CL-03" in {f["ruleCode"] for f in ua.get("findings", [])},
          f"codes={[f['ruleCode'] for f in ua.get('findings', [])]}")

    # needs review (unreadable asset)
    r = create_sub("Needs Review", "Simple, calm copy.", {"unreadable": True})
    nr = r.json() if r.status_code == 200 else {}
    check("submissions", "unreadable asset -> needs-review findings",
          r.status_code == 200 and nr.get("issueCount", 0) >= 1, f"issueCount={nr.get('issueCount')}")

    # ---- VERSIONS / COMMENTS / DECISIONS ---------------------------------
    sid = viol.get("id")
    r = client.post(f"/submissions/{sid}/versions",
                    json={"text": "Gentle care for sensitive skin.", "note": "Fixed claims"},
                    headers=hdr(creator))
    v2 = r.json() if r.status_code == 200 else {}
    check("submissions", "add version -> version 2", v2.get("version") == 2 and len(v2.get("versions", [])) == 2,
          f"version={v2.get('version')}")
    v2_codes = {f["ruleCode"] for f in v2.get("findings", [])}
    check("submissions", "new version clears text-rule findings",
          not ({"CL-04", "CL-06", "MK-02", "TV-02", "CL-03"} & v2_codes), f"codes={sorted(v2_codes)}")
    check("submissions", "issueCount equals open findings after revision",
          v2.get("issueCount") == len([f for f in v2.get("findings", []) if f.get("status") == "open"]),
          f"issueCount={v2.get('issueCount')}")
    check("submissions", "new version resets status to Pending", v2.get("status") == "Pending",
          f"status={v2.get('status')}")

    r = client.post(f"/submissions/{sid}/comments", json={"body": "Please confirm the claim."}, headers=hdr(manager))
    check("submissions", "comment persists", r.status_code == 200 and len(r.json().get("comments", [])) >= 1,
          r.text[:200])

    r = client.post(f"/submissions/{sid}/decide", json={"action": "approve", "note": "ok", "version": 1},
                    headers=hdr(manager))
    check("submissions", "stale-version decision rejected (409)", r.status_code == 409, f"got {r.status_code}")
    r = client.post(f"/submissions/{sid}/decide", json={"action": "approve", "note": "ok", "version": 2},
                    headers=hdr(manager))
    dec = r.json() if r.status_code == 200 else {}
    check("submissions", "manager approves current version", r.status_code == 200 and dec.get("status") == "Approved",
          r.text[:200])
    check("submissions", "decision recorded at reviewed version",
          any(d.get("action") == "Approved" and d.get("version") == 2 for d in dec.get("decisions", [])),
          f"decisions={dec.get('decisions')}")
    r = client.post(f"/submissions/{sid}/decide", json={"action": "approve"}, headers=hdr(creator))
    check("rbac", "creator cannot decide (403)", r.status_code == 403, f"got {r.status_code}")

    # ownership: another creator cannot read Leo's submission
    r = client.get(f"/submissions/{sid}", headers=hdr(creator2))
    check("rbac", "other creator cannot read submission (403)", r.status_code == 403, f"got {r.status_code}")

    # DB persistence
    db = SessionLocal()
    row = db.get(models.Submission, sid)
    fcount = db.query(models.Finding).filter(models.Finding.submission_id == sid).count()
    check("database", "submission persisted in DB", row is not None and row.version == 2, f"version={getattr(row,'version',None)}")
    check("database", "finding rows match recomputed version",
          fcount == v2.get("issueCount"), f"finding_rows={fcount}, issueCount={v2.get('issueCount')}")
    db.close()

    # ---- EXCEPTIONS -------------------------------------------------------
    # Approved exception suppresses a finding on re-evaluation
    r = create_sub("Exception Target", "100% safe for everyone.",
                   {"backgroundColour": "#7AB93B", "typeface": "Inter", "clearSpaceRatio": 2.0})
    ex_sub = r.json()
    check("exceptions", "submission with CL-04 created",
          "CL-04" in {f["ruleCode"] for f in ex_sub.get("findings", [])},
          f"codes={[f['ruleCode'] for f in ex_sub.get('findings', [])]}")
    r = client.post("/exceptions", json={"contentId": ex_sub["id"], "ruleCode": "CL-04",
                                         "reason": "Approved campaign wording", "scope": "All brands",
                                         "expiresAt": "2099-01-01T00:00:00"},
                    headers=hdr(creator))
    ex = r.json() if r.status_code == 200 else {}
    check("exceptions", "create exception (frontend contract, no titles)", r.status_code == 200, r.text[:200])
    check("exceptions", "exception titles derived server-side",
          ex.get("contentTitle") == "Exception Target" and ex.get("ruleTitle"), f"{ex.get('contentTitle')}/{ex.get('ruleTitle')}")
    check("exceptions", "new exception is Pending", ex.get("status") == "Pending", f"status={ex.get('status')}")
    r = client.post(f"/exceptions/{ex.get('id')}/decide", json={"decision": "Approved", "conditions": "Campaign only"},
                    headers=hdr(manager))
    check("exceptions", "manager approves exception", r.status_code == 200 and r.json().get("status") == "Approved",
          r.text[:200])
    # re-evaluate by adding a version with the same text
    r = client.post(f"/submissions/{ex_sub['id']}/versions", json={"text": "100% safe for everyone.", "note": "resubmit"},
                    headers=hdr(creator))
    re_eval = r.json() if r.status_code == 200 else {}
    cl04 = [f for f in re_eval.get("findings", []) if f["ruleCode"] == "CL-04"]
    check("exceptions", "approved exception -> accepted_exception (suppressed)",
          bool(cl04) and cl04[0]["status"] == "accepted_exception",
          f"cl04={cl04}")
    check("exceptions", "suppressed finding excluded from issueCount",
          re_eval.get("issueCount") == len([f for f in re_eval.get("findings", []) if f["status"] == "open"]),
          f"issueCount={re_eval.get('issueCount')}")

    # expired exception cannot be approved
    r = client.post("/exceptions", json={"contentId": ex_sub["id"], "ruleCode": "CL-04",
                                         "reason": "old", "scope": "All brands",
                                         "expiresAt": "2020-01-01T00:00:00"}, headers=hdr(creator))
    expired = r.json()
    r = client.post(f"/exceptions/{expired['id']}/decide", json={"decision": "Approved"}, headers=hdr(manager))
    check("exceptions", "expired exception approval rejected (409)", r.status_code == 409, f"got {r.status_code}")

    # reject
    r = client.post("/exceptions", json={"contentId": ex_sub["id"], "ruleCode": "CL-04", "reason": "reject me",
                                         "scope": "All brands", "expiresAt": "2099-01-01T00:00:00"},
                    headers=hdr(creator))
    to_reject = r.json()
    r = client.post(f"/exceptions/{to_reject['id']}/decide", json={"decision": "Rejected", "conditions": "no"},
                    headers=hdr(manager))
    check("exceptions", "manager rejects exception", r.status_code == 200 and r.json().get("status") == "Rejected",
          r.text[:200])

    # revoke + history
    r = client.post(f"/exceptions/{ex['id']}/revoke", json={"reason": "Campaign ended"}, headers=hdr(manager))
    check("exceptions", "revoke approved exception", r.status_code == 200 and r.json().get("status") == "Revoked",
          r.text[:200])
    r = client.get(f"/exceptions/{ex['id']}/history", headers=hdr(manager))
    hist = r.json() if r.status_code == 200 else []
    check("exceptions", "ruling history records Requested+Approved+Revoked",
          len(hist) >= 3 and {"Requested", "Approved", "Revoked"}.issubset({x["action"] for x in hist}),
          f"actions={[x['action'] for x in hist]}")

    # scope: exception for a different campaign must not apply
    r = create_sub("Scope Target", "20% off everything.",
                   {"backgroundColour": "#7AB93B", "typeface": "Inter", "clearSpaceRatio": 2.0})
    scope_sub = r.json()
    r = client.post("/exceptions", json={"contentId": scope_sub["id"], "ruleCode": "MK-02",
                                         "reason": "Summer campaign", "scope": "Summer Campaign 2025",
                                         "expiresAt": "2099-01-01T00:00:00"}, headers=hdr(creator))
    scope_ex = r.json()
    client.post(f"/exceptions/{scope_ex['id']}/decide", json={"decision": "Approved"}, headers=hdr(manager))
    r = create_sub("Out Of Scope", "30% off everything.",
                   {"backgroundColour": "#7AB93B", "typeface": "Inter", "clearSpaceRatio": 2.0})
    oos = r.json()
    mk = [f for f in oos.get("findings", []) if f["ruleCode"] == "MK-02"]
    check("exceptions", "out-of-scope exception does NOT apply",
          bool(mk) and mk[0]["status"] == "open", f"mk02={mk}")

    # ---- SIMULATIONS ------------------------------------------------------
    # A submission whose ONLY violation is BR-01, so relaxing BR-01 resolves it.
    r = create_sub("Red Background Only", "Gentle care for sensitive skin.",
                   {"backgroundColour": "#FF0000", "typeface": "Inter", "clearSpaceRatio": 2.0})
    red_only = r.json()
    check("simulations", "red-only submission flagged solely by BR-01",
          {f["ruleCode"] for f in red_only.get("findings", [])} == {"BR-01"},
          f"codes={[f['ruleCode'] for f in red_only.get('findings', [])]}")
    rules = client.get("/rules", headers=hdr(manager)).json()
    br01 = next((x for x in rules if x["code"] == "BR-01"), None)
    r = client.post("/simulations", json={"name": "Allow red background", "ruleId": br01["id"],
                                          "changeType": "add_allowed_colour", "currentValue": "green",
                                          "newValue": "#FF0000"}, headers=hdr(manager))
    sim = r.json() if r.status_code == 200 else {}
    check("simulations", "run simulation", r.status_code == 200, r.text[:200])
    check("simulations", "simulation totals computed from real records",
          isinstance(sim.get("totals"), dict) and sim.get("totals", {}).get("checked", 0) >= 1,
          f"totals={sim.get('totals')}")
    check("simulations", "proposed change resolves red-background content",
          sim.get("breakdown", {}).get("resolved", {}).get("count", 0) >= 1,
          f"breakdown={sim.get('breakdown', {}).get('resolved')}")
    # rule unchanged by simulation
    r = client.get(f"/rules/{br01['id']}", headers=hdr(manager))
    check("simulations", "target rule NOT activated by simulation",
          r.json().get("status") == "active" and "Allowed color includes" not in (r.json().get("condition") or ""),
          f"condition={r.json().get('condition')}")
    r = client.post("/simulations", json={"name": "x", "ruleId": br01["id"], "changeType": "add_allowed_colour",
                                          "newValue": "#FF0000"}, headers=hdr(creator))
    check("rbac", "creator cannot run simulation (403)", r.status_code == 403, f"got {r.status_code}")
    # activate
    r = client.post(f"/simulations/{sim['id']}/activate", headers=hdr(manager))
    check("simulations", "explicit activation applies proposed change",
          r.status_code == 200 and "Allowed color includes" in (r.json().get("rule", {}).get("condition") or ""),
          r.text[:300])

    # ---- ASSETS -----------------------------------------------------------
    r = client.post("/assets", files={"file": ("leaf.png", PNG_1x1, "image/png")},
                    data={"name": "GreenLeaf Leaf Logo", "brand": "GreenLeaf Organics",
                          "category": "Brand logo", "notes": "fixture"}, headers=hdr(creator))
    asset = r.json() if r.status_code == 200 else {}
    check("assets", "upload valid PNG", r.status_code == 200 and asset.get("status") == "pending", r.text[:200])
    r = client.post("/assets", files={"file": ("evil.exe", b"MZ", "application/octet-stream")},
                    data={"name": "bad"}, headers=hdr(creator))
    check("assets", "invalid file type rejected", r.status_code in (400, 415), f"got {r.status_code}")
    r = client.post(f"/assets/{asset.get('id')}/approve", headers=hdr(manager))
    check("assets", "manager approves asset", r.status_code == 200 and r.json().get("status") == "approved",
          r.text[:200])
    r = client.post("/assets/research", json={"query": "green leaf bottle", "brand": "GreenLeaf Organics"},
                    headers=hdr(creator))
    body = r.json() if r.status_code == 200 else {}
    check("assets", "research reports unconfigured (no fabricated results)",
          body.get("configured") is False and body.get("results") == [], f"body={body}")
    # attach asset to submission
    r = client.post("/submissions", json={"title": "Asset Attached", "type": "Image", "channel": "Instagram",
                                          "brand": "GreenLeaf Organics", "text": "Gentle care for sensitive skin.",
                                          "assetId": asset.get("id")}, headers=hdr(creator))
    att = r.json() if r.status_code == 200 else {}
    check("assets", "asset attached to submission", r.status_code == 200 and (att.get("assetRef") or {}).get("id") == asset.get("id"),
          f"assetRef={att.get('assetRef')}")
    r = client.get(f"/submissions/{att.get('id')}", headers=hdr(creator))
    check("assets", "asset relationship persists after re-read",
          (r.json().get("assetRef") or {}).get("id") == asset.get("id"), r.text[:200])

    # ---- WORKSPACE ISOLATION ---------------------------------------------
    r = client.get("/guidelines", headers=hdr(creator))
    names = [d.get("name") for d in r.json()] if r.status_code == 200 else []
    check("isolation", "GreenLeaf user does NOT see PureGlow guideline",
          "PureGlow Brand Book" not in names, f"names={names}")
    r = client.get("/rules", headers=hdr(creator))
    rcodes = [x.get("code") for x in r.json()] if r.status_code == 200 else []
    check("isolation", "GreenLeaf user does NOT see PureGlow rule", "PG-01" not in rcodes, f"codes={rcodes}")
    r = client.get("/claims", headers=hdr(creator))
    ctexts = [c.get("text") for c in r.json()] if r.status_code == 200 else []
    check("isolation", "GreenLeaf user does NOT see PureGlow claim",
          "PUREGLOW SECRET CLAIM" not in ctexts, f"claims={ctexts}")
    r = client.get("/team", headers=hdr(creator))
    emails = [u.get("email") for u in r.json()] if r.status_code == 200 else []
    check("isolation", "GreenLeaf user does NOT see PureGlow team member",
          "rival@pureglow.test" not in emails, f"emails={emails}")
    # PureGlow submission invisible to GreenLeaf
    r = client.post("/submissions", json={"title": "PureGlow Only", "type": "Text", "channel": "Website",
                                          "brand": "PureGlow", "text": "PureGlow internal copy."}, headers=hdr(rival))
    pg_sub = r.json()
    r = client.get("/submissions", headers=hdr(creator))
    ids = [s.get("id") for s in r.json()] if r.status_code == 200 else []
    check("isolation", "PureGlow submission hidden from GreenLeaf list", pg_sub["id"] not in ids, f"ids={ids}")
    r = client.get(f"/submissions/{pg_sub['id']}", headers=hdr(creator))
    check("isolation", "PureGlow submission direct fetch blocked", r.status_code in (403, 404), f"got {r.status_code}")
    # PureGlow approved exception must not suppress GreenLeaf finding
    r = create_sub("Workspace Probe", "Hurry! Don't miss out! Order now!",
                   {"backgroundColour": "#7AB93B", "typeface": "Inter", "clearSpaceRatio": 2.0})
    probe = r.json()
    tv = [f for f in probe.get("findings", []) if f["ruleCode"] == "TV-02"]
    check("isolation", "PureGlow exception does NOT suppress GreenLeaf finding",
          bool(tv) and tv[0]["status"] == "open", f"tv02={tv}")

    # ---- AUDIT ------------------------------------------------------------
    r = client.get("/audit", headers=hdr(manager))
    events = r.json() if r.status_code == 200 else []
    check("audit", "audit events load", r.status_code == 200 and len(events) >= 5, f"count={len(events)}")
    actions = {e.get("action") for e in events}
    check("audit", "audit contains real operations",
          {"Login", "Exception", "Approved"} & actions, f"actions={sorted(a for a in actions if a)}")
    r = client.get("/audit/export", params={"format": "csv"}, headers=hdr(manager))
    check("audit", "CSV export works", r.status_code == 200 and "timestamp" in r.text[:200], r.text[:120])
    r = client.get("/audit/health", headers=hdr(manager))
    check("audit", "audit health metrics computed", r.status_code == 200 and "auditStats" in r.json(), r.text[:200])
    r = client.delete("/audit/anything", headers=hdr(manager))
    check("audit", "no delete route for audit (append-only)", r.status_code in (404, 405), f"got {r.status_code}")

    # ---- AI (expected BLOCKED) -------------------------------------------
    from app import ai as ai_mod
    check("ai", "AI provider unconfigured -> ai_available() False", ai_mod.ai_available() is False,
          "ai_available() returned True unexpectedly")
    check("ai", "semantic_findings degrades to None", ai_mod.semantic_findings("x", [{"code": "CL-04"}]) is None,
          "expected None")
    check("ai", "minimal_edit_suggestion degrades to None",
          ai_mod.minimal_edit_suggestion("t", "e", "x") is None, "expected None")
    RESULTS.append({"area": "ai", "name": "LIVE LLM request (requires LLM_* credentials)",
                    "status": "BLOCKED", "detail": "No LLM_BASE_URL/LLM_API_KEY configured; deterministic engine is source of truth."})
    print("[BLOCKED] ai :: LIVE LLM request (requires LLM_* credentials)")

    # ---- DETERMINISM ------------------------------------------------------
    db = SessionLocal()
    gl_rules = db.query(models.Rule).filter(models.Rule.workspace == "GreenLeaf",
                                            models.Rule.status == "active").all()
    db.close()
    from types import SimpleNamespace
    asset_obj = SimpleNamespace(background_colour="#FF0000", clear_space_ratio=0.8, typeface="Sohne", unreadable=False)
    a = run_rules(gl_rules, "100% safe. Boosts immunity. 20% off.", "Instagram", asset_obj)
    b = run_rules(gl_rules, "100% safe. Boosts immunity. 20% off.", "Instagram", asset_obj)
    check("rule_engine", "deterministic: same input -> same findings",
          sorted(f.rule_code for f in a) == sorted(f.rule_code for f in b), f"{[f.rule_code for f in a]} vs {[f.rule_code for f in b]}")


def main():
    seed()
    from app.main import app
    with TestClient(app) as client:
        try:
            run_tests(client)
        except Exception:
            RESULTS.append({"area": "harness", "name": "unexpected exception", "status": "FAIL",
                            "detail": traceback.format_exc()[-1500:]})
            print(traceback.format_exc())
    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
    blocked = sum(1 for r in RESULTS if r["status"] == "BLOCKED")
    print(f"\n==== QA SUMMARY: {passed} passed, {failed} failed, {blocked} blocked, {len(RESULTS)} total ====")
    reports_dir = os.path.join(_ROOT, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    with open(os.path.join(reports_dir, "qa_results.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": datetime.now(timezone.utc).isoformat(),
                   "summary": {"passed": passed, "failed": failed, "blocked": blocked, "total": len(RESULTS)},
                   "results": RESULTS}, f, indent=2)
    print(f"results -> {os.path.join(reports_dir, 'qa_results.json')}")


if __name__ == "__main__":
    main()
