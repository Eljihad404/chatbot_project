# app/schemas/docs.py
from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # pydantic v2: ORM -> model

    id: str
    filename: str
    ext: str
    size_bytes: int
    storage_path: str
    content_hash: str
    source: Optional[str] = None
    # If your DB stores JSON array -> keep List[str]; if TEXT, change to Optional[str]
    tags: Optional[List[str]] = None
    uploaded_by: Optional[str] = None
    status: Optional[str] = None
    # If your SQLAlchemy model uses timezone-aware ts, pydantic handles datetime fine
    uploaded_at: Optional[datetime] = None

class DocumentList(BaseModel):
    items: List[DocumentOut]
    total: int

class UploadResponse(BaseModel):
    created: List[DocumentOut]
