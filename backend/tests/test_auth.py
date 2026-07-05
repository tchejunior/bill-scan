import pytest


def test_register_success(client):
    resp = client.post("/api/auth/register", json={
        "email": "new@recibo42.com",
        "password": "password123",
    })
    assert resp.status_code == 200
    assert "detail" in resp.json()
    # Confirm the account was actually created by logging in
    login = client.post("/api/auth/login", json={
        "email": "new@recibo42.com", "password": "password123"
    })
    assert login.status_code == 200


def test_register_duplicate_email(client):
    # Both new and duplicate registrations return 200 — no enumeration oracle
    payload = {"email": "dup@recibo42.com", "password": "password123"}
    resp1 = client.post("/api/auth/register", json=payload)
    resp2 = client.post("/api/auth/register", json=payload)
    assert resp1.status_code == 200
    assert resp2.status_code == 200


def test_login_success(client):
    client.post("/api/auth/register", json={
        "email": "login@recibo42.com", "password": "password123"
    })
    resp = client.post("/api/auth/login", json={
        "email": "login@recibo42.com", "password": "password123"
    })
    assert resp.status_code == 200
    assert "access_token" in resp.cookies


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "email": "wp@recibo42.com", "password": "password123"
    })
    resp = client.post("/api/auth/login", json={
        "email": "wp@recibo42.com", "password": "wrongpassword"
    })
    assert resp.status_code == 401


def test_logout(auth_client):
    resp = auth_client.post("/api/auth/logout")
    assert resp.status_code == 200
    # Cookie should be cleared
    assert auth_client.cookies.get("access_token") is None


def test_protected_route_requires_auth(client):
    resp = client.get("/api/expenses")
    assert resp.status_code == 401


def test_refresh_success(client):
    client.post("/api/auth/register", json={
        "email": "refresh@recibo42.com", "password": "password123"
    })
    login_resp = client.post("/api/auth/login", json={
        "email": "refresh@recibo42.com", "password": "password123"
    })
    refresh_token = login_resp.cookies.get("refresh_token")
    client.cookies.set("refresh_token", refresh_token)
    resp = client.post("/api/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.cookies


def test_refresh_rotates_refresh_token(client):
    client.post("/api/auth/register", json={
        "email": "sliding@recibo42.com", "password": "password123"
    })
    login_resp = client.post("/api/auth/login", json={
        "email": "sliding@recibo42.com", "password": "password123"
    })
    client.cookies.set("refresh_token", login_resp.cookies.get("refresh_token"))
    resp = client.post("/api/auth/refresh")
    assert resp.status_code == 200
    # Sliding window: a fresh refresh token must be issued on every refresh
    assert "refresh_token" in resp.cookies


def test_protected_route_with_valid_auth(auth_client):
    resp = auth_client.get("/api/expenses")
    assert resp.status_code == 200


def test_register_short_password_rejected(client):
    resp = client.post("/api/auth/register", json={
        "email": "short@recibo42.com", "password": "abc"
    })
    assert resp.status_code == 422
