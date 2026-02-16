from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OrgCreate(BaseModel):
    name: str
    timezone: str = "America/Santiago"


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None


class OrgResponse(BaseModel):
    id: int
    name: str
    timezone: str
    created_at: datetime

    model_config = {"from_attributes": True}
