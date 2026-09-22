import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    rating: Literal["up", "down"]
    comment: str | None = Field(default=None, max_length=2000)


class FeedbackOut(BaseModel):
    id: uuid.UUID
    message_id: uuid.UUID
    rating: Literal["up", "down"]
    comment: str | None
    created_at: datetime


class AdminFeedbackItemOut(BaseModel):
    """Vue enrichie pour la boucle d'amélioration côté admin : le feedback SEUL
    ne dit pas grand-chose sans le contenu de la réponse concernée et son
    contexte (knowledge base, question posée)."""

    feedback_id: uuid.UUID
    rating: Literal["up", "down"]
    comment: str | None
    created_at: datetime
    message_id: uuid.UUID
    message_content: str
    knowledge_base_id: uuid.UUID
    knowledge_base_name: str
    user_email: str
