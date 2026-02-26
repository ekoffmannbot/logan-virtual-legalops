"""
File upload validation for Logan Virtual.

Validates file type (by extension + magic bytes), size, and sanitizes filenames.
Prevents path traversal, malicious uploads, and oversized files.
"""

from __future__ import annotations

import logging
import os
import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

logger = logging.getLogger(__name__)


# ── Allowed file types ───────────────────────────────────────────────────────

ALLOWED_EXTENSIONS: dict[str, set[str]] = {
    "documents": {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv", ".txt", ".rtf", ".odt"},
    "images": {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"},
    "legal": {".pdf", ".docx", ".doc"},  # For court filings and notary docs
}

ALL_ALLOWED = ALLOWED_EXTENSIONS["documents"] | ALLOWED_EXTENSIONS["images"]

# Max file sizes in bytes
MAX_FILE_SIZES: dict[str, int] = {
    "documents": 50 * 1024 * 1024,   # 50 MB
    "images": 10 * 1024 * 1024,      # 10 MB
    "default": 25 * 1024 * 1024,     # 25 MB
}

# Magic bytes for common file types (first N bytes)
MAGIC_BYTES: dict[str, list[bytes]] = {
    ".pdf": [b"%PDF"],
    ".docx": [b"PK\x03\x04"],  # ZIP-based format
    ".xlsx": [b"PK\x03\x04"],  # ZIP-based format
    ".doc": [b"\xd0\xcf\x11\xe0"],  # OLE2 format
    ".xls": [b"\xd0\xcf\x11\xe0"],
    ".zip": [b"PK\x03\x04"],
    ".png": [b"\x89PNG"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".gif": [b"GIF87a", b"GIF89a"],
    ".bmp": [b"BM"],
    ".webp": [b"RIFF"],
}

# Dangerous extensions that should ALWAYS be blocked
BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
    ".vbs", ".js", ".jse", ".wsf", ".wsh", ".ps1", ".psm1",
    ".sh", ".bash", ".csh", ".ksh",
    ".php", ".py", ".rb", ".pl",
    ".dll", ".sys", ".drv",
    ".lnk", ".inf",
}


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal and other attacks.
    Returns a safe filename with UUID prefix for uniqueness.
    """
    if not filename:
        return f"{uuid.uuid4().hex}_unnamed"

    # Remove any directory components
    filename = os.path.basename(filename)

    # Remove null bytes and control characters
    filename = re.sub(r"[\x00-\x1f\x7f]", "", filename)

    # Replace dangerous characters
    filename = re.sub(r'[<>:"/\\|?*]', "_", filename)

    # Remove leading/trailing dots and spaces
    filename = filename.strip(". ")

    # Truncate to reasonable length
    name, ext = os.path.splitext(filename)
    name = name[:100]  # Max 100 chars for name part

    # Add UUID prefix for uniqueness
    return f"{uuid.uuid4().hex[:12]}_{name}{ext}"


def get_file_category(extension: str) -> str:
    """Determine file category from extension."""
    ext = extension.lower()
    if ext in ALLOWED_EXTENSIONS.get("images", set()):
        return "images"
    if ext in ALLOWED_EXTENSIONS.get("documents", set()):
        return "documents"
    return "default"


async def validate_upload(
    file: UploadFile,
    allowed: set[str] | None = None,
    max_size: int | None = None,
    check_magic: bool = True,
) -> tuple[str, bytes]:
    """
    Validate an uploaded file and return (safe_filename, content).

    Args:
        file: FastAPI UploadFile
        allowed: Set of allowed extensions (default: ALL_ALLOWED)
        max_size: Max file size in bytes (default: based on file category)
        check_magic: Whether to verify magic bytes

    Returns:
        Tuple of (sanitized_filename, file_content)

    Raises:
        HTTPException 400 for invalid files
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nombre de archivo requerido",
        )

    # 1. Check extension
    _, ext = os.path.splitext(file.filename)
    ext = ext.lower()

    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo bloqueado: {ext}",
        )

    allowed_set = allowed or ALL_ALLOWED
    if ext not in allowed_set:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido: {ext}. Permitidos: {', '.join(sorted(allowed_set))}",
        )

    # 2. Read content
    content = await file.read()
    await file.seek(0)  # Reset for potential re-reads

    # 3. Check file size
    category = get_file_category(ext)
    size_limit = max_size or MAX_FILE_SIZES.get(category, MAX_FILE_SIZES["default"])

    if len(content) > size_limit:
        max_mb = size_limit / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Archivo demasiado grande. Máximo: {max_mb:.0f}MB",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archivo vacío",
        )

    # 4. Verify magic bytes (if applicable)
    if check_magic and ext in MAGIC_BYTES:
        expected_signatures = MAGIC_BYTES[ext]
        if not any(content.startswith(sig) for sig in expected_signatures):
            logger.warning(
                "Magic bytes mismatch for %s (claimed ext: %s, first bytes: %s)",
                file.filename,
                ext,
                content[:8].hex(),
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El contenido del archivo no coincide con su extensión",
            )

    # 5. Sanitize filename
    safe_name = sanitize_filename(file.filename)

    logger.info("File validated: %s → %s (%d bytes)", file.filename, safe_name, len(content))
    return safe_name, content
