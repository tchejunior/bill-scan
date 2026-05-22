import uuid
from datetime import date


def test_create_manual_expense(auth_client):
    resp = auth_client.post("/api/expenses", json={
        "vendor": "Taxi",
        "date": str(date.today()),
        "total_amount": "45.00",
        "currency": "BRL",
        "category": "Transporte",
        "payment_method": "cash",
        "notes": "Airport trip",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["vendor"] == "Taxi"
    assert body["is_manual"] is True


def test_list_expenses(auth_client):
    auth_client.post("/api/expenses", json={
        "vendor": "Test", "date": str(date.today()), "total_amount": "10.00"
    })
    resp = auth_client.get("/api/expenses")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_get_expense(auth_client):
    create = auth_client.post("/api/expenses", json={
        "vendor": "Shop", "date": str(date.today()), "total_amount": "20.00"
    })
    expense_id = create.json()["id"]
    resp = auth_client.get(f"/api/expenses/{expense_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == expense_id


def test_update_expense(auth_client):
    create = auth_client.post("/api/expenses", json={
        "vendor": "Old Name", "date": str(date.today()), "total_amount": "30.00"
    })
    expense_id = create.json()["id"]
    resp = auth_client.patch(f"/api/expenses/{expense_id}", json={"vendor": "New Name"})
    assert resp.status_code == 200
    assert resp.json()["vendor"] == "New Name"


def test_delete_expense(auth_client):
    create = auth_client.post("/api/expenses", json={
        "vendor": "Delete Me", "date": str(date.today()), "total_amount": "5.00"
    })
    expense_id = create.json()["id"]
    resp = auth_client.delete(f"/api/expenses/{expense_id}")
    assert resp.status_code == 204
    assert auth_client.get(f"/api/expenses/{expense_id}").status_code == 404


def test_cannot_access_other_users_expense(client):
    # Register second user and create an expense
    client.post("/api/auth/register", json={
        "email": "other@recibo42.com", "password": "password123"
    })
    client.post("/api/auth/login", json={
        "email": "other@recibo42.com", "password": "password123"
    })
    create = client.post("/api/expenses", json={
        "vendor": "Private", "date": str(date.today()), "total_amount": "99.00"
    })
    expense_id = create.json()["id"]

    # Switch to another user
    client.post("/api/auth/register", json={
        "email": "first@recibo42.com", "password": "password123"
    })
    client.post("/api/auth/login", json={
        "email": "first@recibo42.com", "password": "password123"
    })
    resp = client.get(f"/api/expenses/{expense_id}")
    assert resp.status_code == 404
