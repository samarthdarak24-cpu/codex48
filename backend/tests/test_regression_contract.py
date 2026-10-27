"""Regression tests for contract bugs found and fixed during hackathon hardening.

These guard the two frontend<->backend contract mismatches that previously caused
every request to 422:

1. POST /exceptions previously required contentTitle + ruleTitle. The frontend only
   sends contentId + ruleCode, so the backend now derives those titles from the
   linked submission/rule.
2. POST /rules previously required a `code`. The manager UI creates rule drafts
   without one, so the backend now auto-generates a unique slugified code.
"""
from conftest import auth_headers, get_token


def test_create_exception_without_titles_derives_from_db(
    client, users, creator_token, manager_token
):
    # A linked submission so contentTitle can be derived.
    sub = client.post(
        "/submissions",
        json={
            "title": "Derived Title Campaign",
            "type": "Text",
            "channel": "email",
            "brand": "PureGlow",
            "text": "Hello world",
        },
        headers=auth_headers(creator_token),
    ).json()
    assert sub.get("id")

    # A linked rule so ruleTitle can be derived.
    rule = client.post(
        "/rules",
        json={"title": "Derived Rule Title", "code": "CL-DERIVE"},
        headers=auth_headers(manager_token),
    ).json()
    assert rule["code"] == "CL-DERIVE"

    # Frontend contract: only contentId + ruleCode (+ reason/scope).
    resp = client.post(
        "/exceptions",
        json={
            "contentId": sub["id"],
            "ruleCode": "CL-DERIVE",
            "reason": "demo exception",
            "scope": "All brands",
        },
        headers=auth_headers(creator_token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["contentTitle"] == "Derived Title Campaign"
    assert body["ruleTitle"] == "Derived Rule Title"
    assert body["brand"] == "PureGlow"


def test_create_rule_without_code_auto_generates(client, users, manager_token):
    resp = client.post(
        "/rules",
        json={"title": "Auto Generated Rule Alpha"},
        headers=auth_headers(manager_token),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["code"], "auto-generated code must not be empty"
    assert body["code"] == body["code"].upper(), "code should be a slugified uppercase code"

    # A second rule with the same title must receive a distinct, still-valid code.
    resp2 = client.post(
        "/rules",
        json={"title": "Auto Generated Rule Alpha"},
        headers=auth_headers(manager_token),
    )
    assert resp2.status_code == 201, resp2.text
    assert resp2.json()["code"] != body["code"]
