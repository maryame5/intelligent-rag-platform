import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models.message import MessageRole
from app.schemas.chat import CitationOut


class MessageOut(BaseModel):
    id: uuid.UUID
    role: MessageRole
    content: str
    citations: list[CitationOut] | None
    created_at: datetime
    # Avis de l'utilisateur courant sur CE message (None si aucun, ou si le
    # message est une question — seules les réponses peuvent être notées).
    feedback: Literal["up", "down"] | None = None


class ConversationOut(BaseModel):
    id: uuid.UUID
    knowledge_base_id: uuid.UUID
    title: str | None
    created_at: datetime
    messages: list[MessageOut]


class ConversationSummaryOut(BaseModel):
    id: uuid.UUID
    title: str | None
    created_at: datetime

    class Config:
        from_attributes = True
