"""Conflict detection endpoint test."""
from conftest import auth_headers


def test_rules_conflicts_returns_list(client, manager_token):
    resp = client.get("/rules/conflicts", headers=auth_headers(manager_token))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
