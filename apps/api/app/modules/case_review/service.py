from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.enums import (
    MatterStatusEnum,
    CourtActionStatusEnum,
    DeadlineStatusEnum,
    DeadlineSeverityEnum,
)
from app.db.models.matter import Matter
from app.db.models.client import Client
from app.db.models.court_action import CourtAction
from app.db.models.deadline import Deadline
from app.db.models.user import User
from app.modules.case_review.schemas import MovementCreate


def load_open_matters(db: Session, org_id: int) -> dict:
    """
    Return all open matters with client_name, last_movement_at (from latest
    CourtAction), and assigned_to (lawyer full_name).
    """
    matters = (
        db.query(Matter)
        .filter(
            Matter.organization_id == org_id,
            Matter.status == MatterStatusEnum.OPEN,
        )
        .order_by(Matter.id)
        .all()
    )

    items = []
    for m in matters:
        # Client name via join
        client = db.query(Client).filter(Client.id == m.client_id).first()
        client_name = client.full_name_or_company if client else None

        # Latest court action date
        latest_action = (
            db.query(CourtAction)
            .filter(
                CourtAction.matter_id == m.id,
                CourtAction.organization_id == org_id,
            )
            .order_by(CourtAction.created_at.desc())
            .first()
        )
        last_movement_at = latest_action.created_at if latest_action else None

        # Assigned lawyer name
        assigned_to = None
        if m.assigned_lawyer_id:
            lawyer = db.query(User).filter(User.id == m.assigned_lawyer_id).first()
            if lawyer:
                assigned_to = lawyer.full_name

        items.append({
            "id": m.id,
            "title": m.title,
            "court": m.court_name,
            "rol_number": m.rol_number,
            "client_name": client_name,
            "status": m.status if isinstance(m.status, str) else m.status.value,
            "last_movement_at": last_movement_at,
            "assigned_to": assigned_to,
        })

    return {"items": items, "total": len(items)}


def register_movement(
    db: Session,
    matter_id: int,
    data: MovementCreate,
    org_id: int,
    current_user: User,
) -> dict:
    """
    Register a court movement for a matter.
    Optionally creates a deadline if has_deadline is True.
    """
    matter = (
        db.query(Matter)
        .filter(Matter.id == matter_id, Matter.organization_id == org_id)
        .first()
    )
    if not matter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Causa no encontrada",
        )

    court_action = CourtAction(
        organization_id=org_id,
        matter_id=matter_id,
        action_type="movement",
        method="electronic",
        must_appear_in_court=False,
        status=CourtActionStatusEnum.DRAFT,
        description=data.description,
    )
    db.add(court_action)
    db.flush()

    deadline_id = None
    if data.has_deadline and data.deadline_date:
        severity_map = {
            "low": DeadlineSeverityEnum.LOW,
            "med": DeadlineSeverityEnum.MED,
            "high": DeadlineSeverityEnum.HIGH,
        }
        severity = severity_map.get(data.complexity, DeadlineSeverityEnum.MED)

        deadline = Deadline(
            organization_id=org_id,
            matter_id=matter_id,
            title=f"Plazo - {data.description[:100]}",
            due_at=data.deadline_date,
            severity=severity,
            status=DeadlineStatusEnum.OPEN,
            created_by_user_id=current_user.id,
        )
        db.add(deadline)
        db.flush()
        deadline_id = deadline.id

    db.commit()

    return {
        "court_action_id": court_action.id,
        "matter_id": matter_id,
        "description": data.description,
        "deadline_id": deadline_id,
        "message": "Movimiento registrado exitosamente",
    }


def register_no_movement(
    db: Session,
    matter_id: int,
    org_id: int,
) -> dict:
    """Mark that a matter had no movement during review."""
    matter = (
        db.query(Matter)
        .filter(Matter.id == matter_id, Matter.organization_id == org_id)
        .first()
    )
    if not matter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Causa no encontrada",
        )

    # Create a court action record marking "no movement"
    court_action = CourtAction(
        organization_id=org_id,
        matter_id=matter_id,
        action_type="no_movement",
        method="electronic",
        must_appear_in_court=False,
        status=CourtActionStatusEnum.FILED,
        description="Sin movimiento en revisión diaria",
    )
    db.add(court_action)
    db.commit()

    return {
        "matter_id": matter_id,
        "message": "Sin movimiento registrado",
    }
