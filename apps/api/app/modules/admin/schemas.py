from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


# ── User schemas (re-export from users module for consistency) ───────────────

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None


class AdminUserResponse(BaseModel):
    id: int
    organization_id: int
    email: str
    full_name: str
    role: str
    active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminUserListResponse(BaseModel):
    items: List[AdminUserResponse]
    total: int


# ── Template schemas ─────────────────────────────────────────────────────────

class AdminTemplateCreate(BaseModel):
    template_type: str
    name: str
    content_text: str
    variables_json: Optional[dict] = None


class AdminTemplateResponse(BaseModel):
    id: int
    org_id: int
    template_type: str
    name: str
    content_text: str
    variables_json: Optional[dict] = None
    active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AdminTemplateListResponse(BaseModel):
    items: List[AdminTemplateResponse]
    total: int
