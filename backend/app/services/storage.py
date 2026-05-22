from pathlib import Path
from typing import Protocol
from app.config import settings


class StorageBackend(Protocol):
    def save(self, user_id: str, receipt_id: str, data: bytes) -> str: ...
    def load(self, path: str) -> bytes: ...
    def delete(self, path: str) -> None: ...
    def url(self, path: str) -> str: ...


class LocalStorageBackend:
    def __init__(self, root: str):
        self.root = Path(root)

    def save(self, user_id: str, receipt_id: str, data: bytes) -> str:
        dir_path = self.root / user_id
        dir_path.mkdir(parents=True, exist_ok=True)
        rel_path = f"{user_id}/{receipt_id}.webp"
        (self.root / rel_path).write_bytes(data)
        return rel_path

    def load(self, path: str) -> bytes:
        full = self.root / path
        if not full.exists():
            raise FileNotFoundError(path)
        return full.read_bytes()

    def delete(self, path: str) -> None:
        (self.root / path).unlink(missing_ok=True)

    def url(self, path: str) -> str:
        return f"/api/receipts/image/{path}"


# Module-level singleton — patch this in tests that touch the filesystem
storage = LocalStorageBackend(root=settings.storage_root)
