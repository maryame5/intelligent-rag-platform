import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class KnowledgeBaseCreate(BaseModel):
    name: str
    workspace_id: uuid.UUID | None = None


class KnowledgeBaseUpdate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le nom ne peut pas être vide.")
        return v


class KnowledgeBaseOut(BaseModel):
    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    workspace_id: uuid.UUID | None = None
    created_at: datetime

    class Config:
        from_attributes = True
