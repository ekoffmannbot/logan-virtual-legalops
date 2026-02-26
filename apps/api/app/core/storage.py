"""
File storage backends for Logan Virtual.

Supports local filesystem and AWS S3 (or S3-compatible like MinIO).
Selected via STORAGE_BACKEND setting ("local" or "s3").
"""

import logging
import os
import uuid
from pathlib import Path
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageBackend(Protocol):
    def upload(self, file_name: str, content: bytes, subfolder: str = "") -> str: ...
    def download(self, path: str) -> bytes: ...
    def delete(self, path: str) -> None: ...
    def exists(self, path: str) -> bool: ...
    def get_presigned_url(self, path: str, expires_in: int = 3600) -> str | None: ...


class LocalStorage:
    """Store files on the local filesystem."""

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

    def get_presigned_url(self, path: str, expires_in: int = 3600) -> str | None:
        """Local storage doesn't support presigned URLs."""
        return None


class S3Storage:
    """Store files on AWS S3 or S3-compatible storage (MinIO, DigitalOcean Spaces, etc.)."""

    def __init__(
        self,
        bucket_name: str = settings.S3_BUCKET_NAME,
        region: str = settings.S3_REGION,
        access_key: str = settings.S3_ACCESS_KEY,
        secret_key: str = settings.S3_SECRET_KEY,
        endpoint_url: str = settings.S3_ENDPOINT_URL,
    ):
        import boto3

        self.bucket_name = bucket_name
        kwargs = {
            "region_name": region,
            "aws_access_key_id": access_key,
            "aws_secret_access_key": secret_key,
        }
        if endpoint_url:
            kwargs["endpoint_url"] = endpoint_url

        self.client = boto3.client("s3", **kwargs)
        logger.info("S3Storage initialized: bucket=%s, region=%s", bucket_name, region)

    def upload(self, file_name: str, content: bytes, subfolder: str = "") -> str:
        unique_name = f"{uuid.uuid4().hex}_{file_name}"
        key = f"{subfolder}/{unique_name}" if subfolder else unique_name
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=content,
        )
        logger.info("S3 upload: %s (%d bytes)", key, len(content))
        return key

    def download(self, path: str) -> bytes:
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=path)
            return response["Body"].read()
        except self.client.exceptions.NoSuchKey:
            raise FileNotFoundError(f"Archivo no encontrado en S3: {path}")

    def delete(self, path: str) -> None:
        self.client.delete_object(Bucket=self.bucket_name, Key=path)
        logger.info("S3 delete: %s", path)

    def exists(self, path: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=path)
            return True
        except Exception:
            return False

    def get_presigned_url(self, path: str, expires_in: int = 3600) -> str | None:
        """Generate a presigned URL for secure temporary download access."""
        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": path},
                ExpiresIn=expires_in,
            )
            return url
        except Exception as exc:
            logger.error("Failed to generate presigned URL: %s", exc)
            return None


def get_storage() -> StorageBackend:
    """Factory function to get the configured storage backend."""
    if settings.STORAGE_BACKEND == "s3" and settings.S3_BUCKET_NAME:
        try:
            return S3Storage()
        except Exception as exc:
            logger.error("Failed to initialize S3 storage, falling back to local: %s", exc)

    return LocalStorage()
