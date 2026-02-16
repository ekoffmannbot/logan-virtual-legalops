import os
import uuid
from pathlib import Path
from typing import Protocol

from app.core.config import settings


class StorageBackend(Protocol):
    def upload(self, file_name: str, content: bytes, subfolder: str = "") -> str: ...
    def download(self, path: str) -> bytes: ...
    def delete(self, path: str) -> None: ...
    def exists(self, path: str) -> bool: ...


class LocalStorage:
    def __init__(self, base_path: str = settings.STORAGE_LOCAL_PATH):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def upload(self, file_name: str, content: bytes, subfolder: str = "") -> str:
        unique_name = f"{uuid.uuid4().hex}_{file_name}"
        folder = self.base_path / subfolder if subfolder else self.base_path
        folder.mkdir(parents=True, exist_ok=True)
        file_path = folder / unique_name
        file_path.write_bytes(content)
        return str(file_path.relative_to(self.base_path))

    def download(self, path: str) -> bytes:
        file_path = self.base_path / path
        if not file_path.exists():
            raise FileNotFoundError(f"Archivo no encontrado: {path}")
        return file_path.read_bytes()

    def delete(self, path: str) -> None:
        file_path = self.base_path / path
        if file_path.exists():
            os.remove(file_path)

    def exists(self, path: str) -> bool:
        return (self.base_path / path).exists()


def get_storage() -> StorageBackend:
    return LocalStorage()
