from datetime import date


def test_report_summary_returns_totals(auth_client):
    today = str(date.today())
    auth_client.post("/api/expenses", json={
        "vendor": "A", "date": today, "total_amount": "100.00",
        "category": "Alimentação", "payment_method": "pix",
    })
    auth_client.post("/api/expenses", json={
        "vendor": "B", "date": today, "total_amount": "50.00",
        "category": "Transporte", "payment_method": "cash",
    })

    resp = auth_client.get(f"/api/reports/summary?from_date={today}&to_date={today}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_amount"] == "150.00"
    assert body["expense_count"] == 2
    categories = {c["category"]: float(c["amount"]) for c in body["by_category"]}
    assert categories["Alimentação"] == 100.0
    assert categories["Transporte"] == 50.0


def test_report_summary_requires_auth(client):
    resp = client.get("/api/reports/summary?from_date=2026-01-01&to_date=2026-12-31")
    assert resp.status_code == 401


def test_pdf_report_returns_bytes(auth_client):
    today = str(date.today())
    auth_client.post("/api/expenses", json={
        "vendor": "Shop", "date": today, "total_amount": "75.00",
        "category": "Compras",
    })
    resp = auth_client.get(f"/api/reports/pdf?from_date={today}&to_date={today}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"


def test_pdf_report_requires_auth(client):
    resp = client.get("/api/reports/pdf?from_date=2026-01-01&to_date=2026-12-31")
    assert resp.status_code == 401
