"""RBAC tests: manager-only routes reject creators and accept managers."""
from conftest import auth_headers

RULE_BODY = {
    "code": "RBAC-TEST-01",
    "title": "RBAC test rule",
    "summary": "ensures creators cannot create rules",
    "subject": "Claims",
    "condition": "no absolute claims",
    "action": "flag",
    "scope": "All brands",
    "priority": "Medium",
    "sourceDocId": "",
    "sourceVersion": "1.0",
    "sourcePassage": "Test passage.",
    "sourcePage": 1,
}


def test_creator_cannot_create_rule(client, creator_token):
    resp = client.post("/rules", json=RULE_BODY, headers=auth_headers(creator_token))
    assert resp.status_code == 403


def test_manager_can_create_rule(client, manager_token):
    resp = client.post("/rules", json=RULE_BODY, headers=auth_headers(manager_token))
    assert resp.status_code == 201
    assert resp.json()["code"] == RULE_BODY["code"]
