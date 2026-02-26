"""
WebSocket endpoint for real-time agent chat.

JWT auth on connection, then:
  - Receive user messages
  - Execute agent via runtime
  - Stream/push response back
  - Push escalation notifications
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import decode_token
from app.db.models.user import User
from app.db.models import AIAgent

logger = logging.getLogger(__name__)

ws_router = APIRouter()


async def _authenticate_ws(websocket: WebSocket) -> Optional[tuple]:
    """Authenticate a WebSocket connection via JWT token in query params."""
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Token requerido")
        return None

    try:
        payload = decode_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Token inválido")
        return None

    if payload.get("type") != "access":
        await websocket.close(code=4001, reason="Tipo de token inválido")
        return None

    db = SessionLocal()
    user_id = int(payload.get("sub", 0))
    org_id = int(payload.get("org", 0))
    user = db.query(User).filter(User.id == user_id, User.active.is_(True)).first()
    if not user:
        db.close()
        await websocket.close(code=4001, reason="Usuario no encontrado")
        return None

    return user, org_id, db


@ws_router.websocket("/ws/chat/{agent_id}")
async def agent_chat(websocket: WebSocket, agent_id: int):
    """WebSocket endpoint for chatting with an AI agent."""
    result = await _authenticate_ws(websocket)
    if not result:
        return

    user, org_id, db = result

    # Verify agent exists and belongs to org
    agent = db.query(AIAgent).filter(
        AIAgent.id == agent_id,
        AIAgent.organization_id == org_id,
        AIAgent.is_active.is_(True),
    ).first()

    if not agent:
        await websocket.close(code=4004, reason="Agente no encontrado")
        db.close()
        return

    await websocket.accept()

    # Send initial connection message
    await websocket.send_json({
        "type": "connected",
        "agent": {
            "id": agent.id,
            "name": agent.display_name,
            "role": agent.role if isinstance(agent.role, str) else agent.role.value,
            "model": agent.model_name,
        },
    })

    thread_id = None

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                msg = {"message": data}

            user_message = msg.get("message", "")
            thread_id = msg.get("thread_id", thread_id)

            if not user_message:
                await websocket.send_json({"type": "error", "message": "Mensaje vacío"})
                continue

            # Send "thinking" status
            await websocket.send_json({"type": "status", "status": "thinking"})

            # Execute agent in thread pool to avoid blocking the event loop
            from app.modules.agents.service import AgentService
            svc = AgentService(db, org_id)
            try:
                result = await asyncio.wait_for(
                    asyncio.to_thread(
                        svc.execute_agent,
                        agent_id=agent_id,
                        message=user_message,
                        thread_id=thread_id,
                        user_id=user.id,
                    ),
                    timeout=120.0,
                )
                await asyncio.to_thread(db.commit)
            except asyncio.TimeoutError:
                result = {
                    "response": "El agente tardó demasiado en responder. Intente de nuevo.",
                    "status": "failed",
                    "thread_id": thread_id,
                }

            thread_id = result.get("thread_id", thread_id)

            # Send response
            await websocket.send_json({
                "type": "message",
                "role": "assistant",
                "content": result.get("response", ""),
                "thread_id": thread_id,
                "task_id": result.get("task_id"),
                "status": result.get("status", "unknown"),
                "tokens": result.get("tokens"),
                "latency_ms": result.get("latency_ms"),
            })

            # If escalated, send notification
            if result.get("status") == "escalated":
                await websocket.send_json({
                    "type": "escalation",
                    "message": result.get("response", ""),
                    "notification_id": result.get("notification_id"),
                })

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: user=%s agent=%s", user.id, agent_id)
    except Exception as exc:
        logger.exception("WebSocket error: user=%s agent=%s", user.id, agent_id)
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass
    finally:
        db.close()
