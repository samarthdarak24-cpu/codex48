"""Auth endpoint tests: login, /auth/me."""
from conftest import auth_headers


def test_login_success_returns_token_and_user(client, users):
    resp = client.post(
        "/auth/login",
        json={"email": users["manager"]["email"], "password": users["manager"]["password"]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "token" in body and body["token"]
    assert "user" in body
    assert body["user"]["email"] == users["manager"]["email"]


def test_login_wrong_password_401(client, users):
    resp = client.post(
        "/auth/login",
        json={"email": users["manager"]["email"], "password": "wrong-password"},
    )
    assert resp.status_code == 401


def test_me_with_token(client, manager_token, users):
    resp = client.get("/auth/me", headers=auth_headers(manager_token))
    assert resp.status_code == 200
    assert resp.json()["email"] == users["manager"]["email"]


def test_me_without_token_401(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401
