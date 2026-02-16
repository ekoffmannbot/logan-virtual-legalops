from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ScraperJobCreate(BaseModel):
    keyword: str
    base_url: str
    page_limit_int: Optional[int] = 200


class ScraperJobResponse(BaseModel):
    id: int
    org_id: int
    keyword: str
    base_url: str
    page_limit_int: int
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    results_count_int: int
    created_by_user_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ScraperResultResponse(BaseModel):
    """Response schema mapped to what the frontend expects.

    DB fields -> frontend fields:
      title        -> name
      snippet      -> description
      url          -> source_url
      converted_lead_id -> lead_id
      email/phone/website/address -> optional nulls (not in DB)
    """
    id: int
    job_id: int
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    source_url: str
    converted_to_lead: bool = False
    lead_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConvertToLeadRequest(BaseModel):
    result_id: int
