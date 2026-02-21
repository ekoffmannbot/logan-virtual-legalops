from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    doc_type: str
    file_name: str
    storage_path: str
    version_int: int
    status: str
    uploaded_by_user_id: Optional[int] = None
    created_at: datetime
    metadata_json: Optional[dict] = None

    # Frontend-friendly aliases
    name: Optional[str] = None              # alias for file_name
    uploaded_by_name: Optional[str] = None   # resolved user name
    file_url: Optional[str] = None           # download URL

    model_config = {"from_attributes": True}
