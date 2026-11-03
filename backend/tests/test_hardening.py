"""Hardening tests — the failure paths a reviewer will actually try.

Each test here exists because a real defect was found and fixed:

1. A text-only submission used to collect nine "needs review" visual findings,
   because visual rules were evaluated against an absent asset.
2. A corrupt upload used to create a submission before failing in the
   background, leaving an orphan record in the review queue.
3. Row lookups by id checked existence but not workspace, so a manager in one
   workspace could read another workspace's file by guessing an id.
4. Resolving a Sentinel task was open to any authenticated user, including a
   creator.
5. Tokens were never proven to expire.
"""
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app import models
from app.config import settings
from app.db import SessionLocal
from tests.conftest import auth_headers


# ---------------------------------------------------------------------------
# 1. Not-applicable is not the same as unknown
# ---------------------------------------------------------------------------


def test_text_only_submission_has_no_visual_findings(client, creator_token, manager_token):
    """A submission with no asset must not collect visual "needs review" items.

    Visual rules are not applicable when nothing was uploaded; they are only
    "unknown" when an asset exists but a fact could not be measured. Conflating
    the two turns every text submission into a page of meaningless work.
    """
    headers = auth_headers(creator_token)
    # An active visual rule must exist, or the test proves nothing.
    rule = client.post(
        "/rules",
        json={"code": "BR-01", "title": "Approved backgrounds", "summary": "Green only."},
        headers=auth_headers(manager_token),
    )
    assert rule.status_code == 201, rule.text
    client.post(f"/rules/{rule.json()['id']}/confirm", headers=auth_headers(manager_token))

    resp = client.post(
        "/submissions",
        json={"title": "Text only", "type": "Text", "channel": "Email", "text": "   \n\t  "},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()

    codes = {f["ruleCode"] for f in body["findings"]}
    assert "BR-01" not in codes, f"visual rule evaluated without an asset: {codes}"
    assert body["issueCount"] == 0


def test_asset_rule_still_reports_needs_review_when_an_asset_is_unreadable(client, manager_token, creator_token):
    """The fix must not silence genuine unknowns.

    An unreadable asset is a fact we could not measure, so the finding stays —
    as Needs review, never as a violation.
    """
    rule = client.post(
        "/rules",
        json={"code": "BR-01", "title": "Approved backgrounds", "summary": "Green only."},
        headers=auth_headers(manager_token),
    )
    assert rule.status_code == 201, rule.text
    client.post(f"/rules/{rule.json()['id']}/confirm", headers=auth_headers(manager_token))

    resp = client.post(
        "/submissions",
        json={
            "title": "Poster with unreadable asset",
            "type": "Image",
            "channel": "Social Media",
            "text": "",
            "asset": {"unreadable": True},
        },
        headers=auth_headers(creator_token),
    )
    assert resp.status_code == 200, resp.text
    br = [f for f in resp.json()["findings"] if f["ruleCode"] == "BR-01"]
    assert br, "an unreadable asset must still produce a finding"
    assert br[0]["outcome"] == "needs_review"
    assert br[0]["outcome"] != "violation"


# ---------------------------------------------------------------------------
# 2. A corrupt upload fails before it can leave a record behind
# ---------------------------------------------------------------------------


def _submission_count() -> int:
    db = SessionLocal()
    try:
        return db.query(models.Submission).count()
    finally:
        db.close()


def test_corrupt_image_is_rejected_without_creating_a_submission(client, creator_token):
    """Magic bytes pass but the image cannot be parsed -> 400, and no orphan row."""
    before = _submission_count()

    resp = client.post(
        "/analysis/upload",
        files={"file": ("poster.png", b"\x89PNG\r\n\x1a\n" + b"not really a png", "image/png")},
        data={"title": "Corrupt poster"},
        headers=auth_headers(creator_token),
    )

    assert resp.status_code == 400, resp.text
    assert _submission_count() == before, "a rejected upload must not create a submission"


def test_unsupported_extension_is_rejected_before_any_write(client, creator_token):
    before = _submission_count()
    resp = client.post(
        "/analysis/upload",
        files={"file": ("poster.svg", b"<svg/>", "image/svg+xml")},
        data={"title": "SVG poster"},
        headers=auth_headers(creator_token),
    )
    assert resp.status_code == 415, resp.text
    assert _submission_count() == before


def test_oversized_upload_is_rejected(client, creator_token):
    payload = b"\x89PNG\r\n\x1a\n" + b"\x00" * (11 * 1024 * 1024)
    resp = client.post(
        "/analysis/upload",
        files={"file": ("big.png", payload, "image/png")},
        data={"title": "Too big"},
        headers=auth_headers(creator_token),
    )
    assert resp.status_code == 413, resp.text


# ---------------------------------------------------------------------------
# 3. Workspace scoping on id lookups
# ---------------------------------------------------------------------------


@pytest.fixture
def foreign_submission():
    """A submission that lives in WellnessLife, not the caller's workspace."""
    db = SessionLocal()
    try:
        db.add(
            models.Submission(
                id="sub_foreign",
                workspace="WellnessLife",
                code="SUB-9001",
                title="Someone else's poster",
                brand="WellnessLife",
                channel="Email",
                status="Approved",
                creator_id="user-other-ws",
                version=1,
            )
        )
        db.add(
            models.ContentVersion(
                id="cv_foreign",
                submission_id="sub_foreign",
                version=1,
                text="Foreign content",
                author_id="user-other-ws",
            )
        )
        db.commit()
    finally:
        db.close()
    return "sub_foreign"


def test_cross_workspace_submission_is_404_not_403(client, manager_token, foreign_submission):
    """404, not 403: the response must not confirm that the id exists."""
    resp = client.get(f"/submissions/{foreign_submission}", headers=auth_headers(manager_token))
    assert resp.status_code == 404


def test_cross_workspace_mutation_is_blocked(client, manager_token, foreign_submission):
    resp = client.post(
        f"/submissions/{foreign_submission}/decide",
        json={"action": "Approved", "note": "", "version": 1},
        headers=auth_headers(manager_token),
    )
    assert resp.status_code == 404


def test_cross_workspace_comment_is_blocked(client, creator_token, foreign_submission):
    resp = client.post(
        f"/submissions/{foreign_submission}/comments",
        json={"body": "hello"},
        headers=auth_headers(creator_token),
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 4. Sentinel task resolution is a manager decision
# ---------------------------------------------------------------------------


def test_creator_cannot_resolve_a_sentinel_task(client, creator_token):
    resp = client.post(
        "/sentinel/tasks/task_does_not_exist/resolve",
        json={"resolution": "re_approve", "note": ""},
        headers=auth_headers(creator_token),
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# 5. Tokens actually expire
# ---------------------------------------------------------------------------


def test_expired_token_is_rejected(client, users):
    """A token whose `exp` is in the past must not authenticate.

    Hand-crafted rather than slept-for, so the test proves the check rather
    than the clock.
    """
    payload = {
        "sub": users["manager"]["id"],
        "role": "manager",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
    }
    expired = jwt.encode(payload, settings.secret_key, algorithm="HS256")

    resp = client.get("/auth/me", headers=auth_headers(expired))
    assert resp.status_code == 401


def test_token_signed_with_the_wrong_key_is_rejected(client, users):
    payload = {
        "sub": users["manager"]["id"],
        "role": "manager",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    forged = jwt.encode(payload, "not-the-real-secret", algorithm="HS256")

    resp = client.get("/auth/me", headers=auth_headers(forged))
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# 6. Long and non-Latin bodies survive the round trip
# ---------------------------------------------------------------------------


def test_twenty_thousand_character_body_is_accepted(client, creator_token):
    resp = client.post(
        "/submissions",
        json={
            "title": "Long copy",
            "type": "Text",
            "channel": "Email",
            "text": "Our cream is gentle. " * 1000,
        },
        headers=auth_headers(creator_token),
    )
    assert resp.status_code == 200, resp.text


def test_devanagari_body_preserves_its_text(client, creator_token):
    text = "यह क्रीम पूरी तरह सुरक्षित है। इसे रोज़ लगाएँ।"
    resp = client.post(
        "/submissions",
        json={"title": "Devanagari", "type": "Text", "channel": "Email", "text": text},
        headers=auth_headers(creator_token),
    )
    assert resp.status_code == 200, resp.text
    stored = resp.json()["excerpt"] or ""
    assert "।" in stored or text in stored, "the danda must survive storage"
