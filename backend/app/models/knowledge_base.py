import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String

from app.db.base import Base
from app.db.types import GUID


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    owner_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(GUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
