import io
from PIL import Image
from unittest.mock import patch


def make_jpeg_upload():
    img = Image.new("RGB", (800, 600), color=(200, 200, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return ("receipt.jpg", buf, "image/jpeg")


def test_upload_receipt_returns_202(auth_client, tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_ROOT", str(tmp_path))
    with patch("app.api.receipts.process_receipt.delay") as mock_task, \
         patch("app.api.receipts.storage.save", return_value="u/r.webp"), \
         patch("app.api.receipts.process_image", return_value=b"fake-webp"):
        mock_task.return_value.id = "task-id"
        resp = auth_client.post(
            "/api/receipts",
            files={"file": make_jpeg_upload()},
        )
    assert resp.status_code == 202
    body = resp.json()
    assert body["status"] == "pending"
    assert "id" in body


def test_upload_receipt_requires_auth(client):
    resp = client.post("/api/receipts", files={"file": ("f.jpg", b"data", "image/jpeg")})
    assert resp.status_code == 401


def test_get_receipts_returns_list(auth_client):
    with patch("app.api.receipts.process_receipt.delay"), \
         patch("app.api.receipts.storage.save", return_value="u/r.webp"), \
         patch("app.api.receipts.process_image", return_value=b"fake-webp"):
        auth_client.post("/api/receipts", files={"file": make_jpeg_upload()})

    resp = auth_client.get("/api/receipts")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1
