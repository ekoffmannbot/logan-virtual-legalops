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

    model_config = {"from_attributes": True}
