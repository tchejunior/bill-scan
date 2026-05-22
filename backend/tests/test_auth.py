import pytest


def test_register_success(client):
    resp = client.post("/api/auth/register", json={
        "email": "new@recibo42.com",
        "password": "password123",
    })
    assert resp.status_code == 201
    assert resp.json()["email"] == "new@recibo42.com"


def test_register_duplicate_email(client):
    payload = {"email": "dup@recibo42.com", "password": "password123"}
    client.post("/api/auth/register", json=payload)
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


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
