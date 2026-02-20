from typing import Optional, List
from pydantic import BaseModel


class CalendarEvent(BaseModel):
    id: str
    title: str
    date: str  # YYYY-MM-DD
    time: Optional[str] = None
    type: str  # audiencia, reunion, plazo, seguimiento, tarea
    location: Optional[str] = None
    matterId: Optional[str] = None
    color: str


class CalendarEventsResponse(BaseModel):
    items: List[CalendarEvent]
