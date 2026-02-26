from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TemplateCreate(BaseModel):
    template_type: str
    name: str
    content_text: str
    variables_json: Optional[dict] = None


class TemplateUpdate(BaseModel):
    template_type: Optional[str] = None
    name: Optional[str] = None
    content_text: Optional[str] = None
    variables_json: Optional[dict] = None
    active: Optional[bool] = None


class TemplateResponse(BaseModel):
    id: int
    organization_id: int
    template_type: str
    name: str
    content_text: str
    variables_json: Optional[dict] = None
    active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RenderRequest(BaseModel):
    variables: dict


class RenderResponse(BaseModel):
    rendered_text: str
