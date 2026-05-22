import pytest
import tempfile
from pathlib import Path
from app.services.storage import LocalStorageBackend
from app.services.image import process_image
from PIL import Image
import io


def make_jpeg_bytes(width=300, height=400) -> bytes:
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_local_storage_save_and_load():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = LocalStorageBackend(root=tmpdir)
        data = b"fake-image-bytes"
        path = storage.save("user-123", "receipt-456", data)
        assert path == "user-123/receipt-456.webp"
        assert storage.load(path) == data


def test_local_storage_delete():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = LocalStorageBackend(root=tmpdir)
        path = storage.save("u", "r", b"data")
        storage.delete(path)
        with pytest.raises(FileNotFoundError):
            storage.load(path)


def test_process_image_produces_webp():
    jpeg = make_jpeg_bytes(3000, 4000)
    result = process_image(jpeg)
    img = Image.open(io.BytesIO(result))
    assert img.format == "WEBP"


def test_process_image_resizes_large_image():
    jpeg = make_jpeg_bytes(3000, 4000)
    result = process_image(jpeg)
    img = Image.open(io.BytesIO(result))
    assert max(img.size) <= 1920


def test_process_image_preserves_small_image():
    jpeg = make_jpeg_bytes(800, 600)
    result = process_image(jpeg)
    img = Image.open(io.BytesIO(result))
    assert img.size == (800, 600)
