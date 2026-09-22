import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.job import JobStatus


class JobOut(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    status: JobStatus
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
