"""
Notifications endpoints — in-app + WebSocket real-time support.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.notifications import service

router = APIRouter()


@router.get("/")
def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List notifications for the current user."""
    return service.list_notifications(db, user.id, user.organization_id, unread_only, limit)


@router.post("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    return service.mark_read(db, user.id, notification_id)


@router.post("/read-all")
def mark_all_as_read(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    return service.mark_all_read(db, user.id, user.organization_id)


@router.get("/unread-count")
def unread_count(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get count of unread notifications."""
    return service.get_unread_count(db, user.id, user.organization_id)


@router.websocket("/ws")
async def websocket_notifications(websocket: WebSocket):
    """
    WebSocket endpoint for real-time notifications.
    Client must send JWT token as first message after connect.
    """
    await service.handle_websocket(websocket)
