"""
Rate limiter for Logan Virtual using slowapi.

Protects authentication endpoints from brute-force attacks.
Uses Redis as backend when available, falls back to in-memory.
"""

from __future__ import annotations

import logging

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


def _key_func(request: Request) -> str:
    """Extract client IP for rate limiting. Respects X-Forwarded-For behind proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request) or "unknown"


def _get_redis_uri() -> str | None:
    """Try to get Redis URL for persistent rate limiting."""
    try:
        from app.core.config import settings
        return settings.REDIS_URL
    except Exception:
        return None


# Prefer Redis backend; fall back to in-memory if unavailable
_redis_uri = _get_redis_uri()
_storage_uri = _redis_uri if _redis_uri else "memory://"

limiter = Limiter(
    key_func=_key_func,
    storage_uri=_storage_uri,
    default_limits=[],  # No global default — apply per-route
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler for rate limit exceeded errors."""
    logger.warning(
        "Rate limit exceeded for %s on %s %s",
        _key_func(request),
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Demasiadas solicitudes. Intente nuevamente en unos minutos.",
            "retry_after": exc.detail,
        },
    )


# ── Pre-defined rate limit strings ──────────────────────────────────────────

AUTH_LOGIN_LIMIT = "5/minute"
AUTH_REFRESH_LIMIT = "10/minute"
AI_ENDPOINT_LIMIT = "20/minute"
GENERAL_WRITE_LIMIT = "60/minute"
GENERAL_READ_LIMIT = "120/minute"
