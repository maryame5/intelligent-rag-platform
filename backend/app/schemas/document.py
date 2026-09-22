import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.document import DocumentStatus


class DocumentOut(BaseModel):
    id: uuid.UUID
    knowledge_base_id: uuid.UUID
    filename: str
    mime_type: str
    size_bytes: int
    status: DocumentStatus
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentUploadOut(BaseModel):
    document: DocumentOut
    job_id: uuid.UUID
