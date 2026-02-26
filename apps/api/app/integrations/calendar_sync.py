"""
Calendar synchronization for Logan Virtual.

Generates .ics files for events and provides hooks for
Google Calendar and Microsoft Outlook integration via OAuth2.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)


def generate_ics_event(
    title: str,
    start: datetime,
    end: datetime | None = None,
    description: str = "",
    location: str = "",
    organizer_email: str = "no-reply@logan.cl",
    uid: str | None = None,
) -> str:
    """
    Generate an .ics calendar event string.

    Returns:
        iCalendar formatted string
    """
    import uuid as uuid_mod

    if end is None:
        end = start + timedelta(hours=1)

    event_uid = uid or f"{uuid_mod.uuid4()}@logan.cl"
    now = datetime.now(timezone.utc)

    def fmt(dt: datetime) -> str:
        return dt.strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Logan Virtual//LegalOps OS//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{event_uid}",
        f"DTSTART:{fmt(start)}",
        f"DTEND:{fmt(end)}",
        f"DTSTAMP:{fmt(now)}",
        f"SUMMARY:{_escape_ics(title)}",
        f"DESCRIPTION:{_escape_ics(description)}",
        f"LOCATION:{_escape_ics(location)}",
        f"ORGANIZER:mailto:{organizer_email}",
        "STATUS:CONFIRMED",
        "BEGIN:VALARM",
        "TRIGGER:-PT30M",
        "ACTION:DISPLAY",
        f"DESCRIPTION:Recordatorio: {_escape_ics(title)}",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ]

    return "\r\n".join(lines)


def _escape_ics(text: str) -> str:
    """Escape special characters for iCalendar format."""
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def generate_events_from_db(db, org_id: int, start_date=None, end_date=None) -> list[dict]:
    """
    Generate calendar events from deadlines, tasks, court actions, and proposals.
    Used by the calendar endpoint.
    """
    from app.db.models.deadline import Deadline
    from app.db.models.task import Task
    from app.db.models.court_action import CourtAction
    from app.db.enums import DeadlineStatusEnum, TaskStatusEnum

    events = []

    # Deadlines
    deadlines = db.query(Deadline).filter(
        Deadline.organization_id == org_id,
        Deadline.status == DeadlineStatusEnum.OPEN.value,
    ).all()

    for d in deadlines:
        events.append({
            "id": f"deadline-{d.id}",
            "title": d.description or f"Deadline #{d.id}",
            "start": d.due_date.isoformat() if d.due_date else None,
            "type": "deadline",
            "severity": d.severity if hasattr(d, "severity") else "med",
            "entity_type": "deadline",
            "entity_id": d.id,
        })

    # Tasks
    tasks = db.query(Task).filter(
        Task.organization_id == org_id,
        Task.status.in_([TaskStatusEnum.OPEN.value, TaskStatusEnum.IN_PROGRESS.value]),
    ).all()

    for t in tasks:
        if hasattr(t, "due_date") and t.due_date:
            events.append({
                "id": f"task-{t.id}",
                "title": t.title or f"Tarea #{t.id}",
                "start": t.due_date.isoformat(),
                "type": "task",
                "entity_type": "task",
                "entity_id": t.id,
            })

    return events
