"""Tests for ProofPass approval passport (F1 stretch feature)."""
import io
import pytest
from PIL import Image, ImageDraw
from conftest import auth_headers

from app.db import SessionLocal
from app import models
from app.services import proofpass as svc


def _create_approved_submission(db, sub_id="sub-test-pass", cv_id="cv-test-pass"):
    sub = models.Submission(
        id=sub_id,
        code="SUB-9999",
        title="ProofPass Approved Poster",
        excerpt="Test excerpt",
        type="Image",
        channel="Social Media",
        brand="PureGlow",
        status="Approved",
        creator_id="creator-1",
        workspace="PureGlow",
        version=1,
    )
    v = models.ContentVersion(
        id=cv_id,
        submission_id=sub_id,
        version=1,
        text="PureGlow Certified Organic Glow Serum",
        author_id="creator-1",
    )
    db.add(sub)
    db.add(v)
    db.commit()
    return sub, v


def test_proofpass_generate_and_exact_match(client, manager_token):
    headers = auth_headers(manager_token)

    db = SessionLocal()
    _create_approved_submission(db, "sub-test-p1", "cv-test-p1")
    db.close()

    # 1. Issue ProofPass
    gen_res = client.post("/passport/generate", json={"submissionId": "sub-test-p1"}, headers=headers)
    assert gen_res.status_code == 200, gen_res.text
    passport_data = gen_res.json()
    assert passport_data["id"].startswith("pass_")
    assert passport_data["status"] == "active"
    assert len(passport_data["sha256"]) == 64

    # 2. Public Verification without probe
    verify_res = client.post("/passport/verify", data={"passportIdOrToken": passport_data["id"]})
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["valid"] is True
    assert v_data["verification"] == "CERTIFICATE_AUTHENTIC"
    assert v_data["passportId"] == passport_data["id"]


def test_proofpass_perceptual_hash_near_match():
    # Test compute_file_hashes and perceptual near match
    img = Image.new("RGB", (400, 300), color="#7AB93B")
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 200, 150], fill="white")
    draw.text((60, 60), "PureGlow Master Copy", fill="black")

    master_buf = io.BytesIO()
    img.save(master_buf, format="PNG")
    master_bytes = master_buf.getvalue()

    master_hashes = svc.compute_file_hashes(master_bytes)
    assert len(master_hashes["sha256"]) == 64
    assert len(master_hashes["phash"]) > 0

    # Slight re-compression / quality shift
    shift_buf = io.BytesIO()
    img.save(shift_buf, format="JPEG", quality=85)
    shift_bytes = shift_buf.getvalue()

    shift_hashes = svc.compute_file_hashes(shift_bytes)
    # Bitwise different because of JPEG compression
    assert shift_hashes["sha256"] != master_hashes["sha256"]

    # But visually similar via pHash
    import imagehash
    h1 = imagehash.hex_to_hash(master_hashes["phash"])
    h2 = imagehash.hex_to_hash(shift_hashes["phash"])
    assert (h1 - h2) <= 6, f"pHash distance {h1 - h2} must be within near-match threshold"


def test_proofpass_revocation(client, manager_token):
    headers = auth_headers(manager_token)

    db = SessionLocal()
    _create_approved_submission(db, "sub-test-p2", "cv-test-p2")
    db.close()

    gen_res = client.post("/passport/generate", json={"submissionId": "sub-test-p2"}, headers=headers)
    pass_id = gen_res.json()["id"]

    # Revoke
    rev_res = client.post(
        f"/passport/{pass_id}/revoke",
        json={"reason": "Campaign withdrawn after reformulation"},
        headers=headers,
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "revoked"

    # Verify again
    check = client.post("/passport/verify", data={"passportIdOrToken": pass_id})
    assert check.status_code == 200
    assert check.json()["valid"] is False
    assert check.json()["verification"] == "REVOKED"


def test_creator_cannot_issue_passport(client, creator_token):
    headers = auth_headers(creator_token)

    db = SessionLocal()
    _create_approved_submission(db, "sub-test-p3", "cv-test-p3")
    db.close()

    res = client.post("/passport/generate", json={"submissionId": "sub-test-p3"}, headers=headers)
    assert res.status_code == 403, "Creators are forbidden from issuing passports"
