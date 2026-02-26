"""
Security and utility middleware for Logan Virtual.

Implements HTTP security headers, request logging, and audit trail support.
"""

from __future__ import annotations

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds standard security headers to all HTTP responses.
    Prevents common attacks: clickjacking, MIME sniffing, XSS, etc.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # XSS protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # HSTS — enforce HTTPS (only in production)
        try:
            from app.core.config import settings
            if settings.APP_ENV == "production":
                response.headers["Strict-Transport-Security"] = (
                    "max-age=31536000; includeSubDomains; preload"
                )
        except Exception:
            pass

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api.anthropic.com https://api.openai.com; "
            "frame-ancestors 'none'"
        )

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy (restrict browser features)
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs all incoming requests with timing information.
    Useful for monitoring and debugging.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000

        # Log at WARNING level for slow requests (>2s)
        level = logging.WARNING if duration_ms > 2000 else logging.INFO

        # Skip health checks from verbose logging
        if request.url.path == "/health":
            return response

        logger.log(
            level,
            "%s %s → %d (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )

        # Add Server-Timing header for debugging
        response.headers["Server-Timing"] = f"total;dur={duration_ms:.1f}"

        return response
