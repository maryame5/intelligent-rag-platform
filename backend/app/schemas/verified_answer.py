import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VerifiedAnswerCreate(BaseModel):
    knowledge_base_id: uuid.UUID
    question: str
    answer: str
    tags: list[str] = []

class VerifiedAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    knowledge_base_id: uuid.UUID
    question: str
    answer: str
    tags: list[str]
    uses_count: int
    verified_by: str | None
    created_at: datetime
    updated_at: datetime
