"""
Notifications service with WebSocket support.

Uses Redis PubSub for broadcasting notifications from Celery workers
to connected WebSocket clients.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ── In-memory WebSocket connections (per-worker) ─────────────────────────────
# In production, use Redis PubSub for cross-worker broadcasting.
_connections: dict[int, list[WebSocket]] = {}  # user_id → [ws, ws, ...]


def list_notifications(
    db: Session, user_id: int, org_id: int,
    unread_only: bool, limit: int,
) -> list[dict]:
    """List notifications from the notification table."""
    from app.db.models.notification import Notification

    q = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.organization_id == org_id,
    )
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))

    notifications = q.order_by(Notification.created_at.desc()).limit(limit).all()

    return [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "entity_type": n.entity_type,
            "entity_id": n.entity_id,
            "read": n.read_at is not None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]


def mark_read(db: Session, user_id: int, notification_id: int) -> dict:
    from app.db.models.notification import Notification

    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    ).first()
    if not n:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    n.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": n.id, "status": "read"}


def mark_all_read(db: Session, user_id: int, org_id: int) -> dict:
    from app.db.models.notification import Notification

    now = datetime.now(timezone.utc)
    updated = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.organization_id == org_id,
        Notification.read_at.is_(None),
    ).update({"read_at": now})
    db.commit()
    return {"marked_read": updated}


def get_unread_count(db: Session, user_id: int, org_id: int) -> dict:
    from app.db.models.notification import Notification
    from sqlalchemy import func

    count = db.query(func.count(Notification.id)).filter(
        Notification.user_id == user_id,
        Notification.organization_id == org_id,
        Notification.read_at.is_(None),
    ).scalar() or 0
    return {"unread_count": count}


def create_notification(
    db: Session,
    org_id: int,
    user_id: int,
    type_: str,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> dict:
    """Create a notification and attempt WebSocket broadcast."""
    from app.db.models.notification import Notification

    n = Notification(
        organization_id=org_id,
        user_id=user_id,
        type=type_,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(n)
    db.commit()
    db.refresh(n)

    # Try Redis PubSub broadcast
    try:
        _broadcast_via_redis(user_id, {
            "id": n.id, "type": type_, "title": title, "message": message,
            "entity_type": entity_type, "entity_id": entity_id,
        })
    except Exception as exc:
        logger.debug("Redis broadcast failed (expected in non-async context): %s", exc)

    return {"id": n.id, "status": "created"}


def _broadcast_via_redis(user_id: int, payload: dict):
    """Publish notification to Redis for WebSocket delivery."""
    try:
        import redis
        from app.core.config import settings
        r = redis.Redis.from_url(settings.REDIS_URL)
        r.publish(f"notifications:{user_id}", json.dumps(payload))
    except Exception:
        pass  # Best effort


async def handle_websocket(websocket: WebSocket):
    """Handle a WebSocket connection for real-time notifications."""
    await websocket.accept()

    # Wait for auth token
    try:
        token_msg = await asyncio.wait_for(websocket.receive_text(), timeout=10)
        from app.core.security import decode_token
        payload = decode_token(token_msg)
        user_id = int(payload.get("sub", 0))
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Authentication timeout")
        return

    # Register connection
    if user_id not in _connections:
        _connections[user_id] = []
    _connections[user_id].append(websocket)

    logger.info("WebSocket connected for user %d", user_id)

    try:
        # Try Redis PubSub for cross-worker delivery
        try:
            import redis.asyncio as aioredis
            from app.core.config import settings
            r = aioredis.from_url(settings.REDIS_URL)
            pubsub = r.pubsub()
            await pubsub.subscribe(f"notifications:{user_id}")

            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message["type"] == "message":
                    await websocket.send_text(message["data"].decode())
                # Also check if client sent anything (ping/pong)
                try:
                    data = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                    if data == "ping":
                        await websocket.send_text("pong")
                except asyncio.TimeoutError:
                    pass
        except ImportError:
            # No async redis, use simple keepalive loop
            while True:
                try:
                    data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                    if data == "ping":
                        await websocket.send_text("pong")
                except asyncio.TimeoutError:
                    await websocket.send_text(json.dumps({"type": "heartbeat"}))

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for user %d", user_id)
    finally:
        if user_id in _connections:
            _connections[user_id] = [ws for ws in _connections[user_id] if ws != websocket]
            if not _connections[user_id]:
                del _connections[user_id]
