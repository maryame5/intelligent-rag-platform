import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text

from app.db.base import Base
from app.db.types import GUID


class VerifiedAnswer(Base):
    __tablename__ = "verified_answers"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    knowledge_base_id = Column(GUID(), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False)
    question = Column(String(500), nullable=False)
    answer = Column(Text, nullable=False)
    tags = Column(JSON, default=list, nullable=False)
    uses_count = Column(Integer, default=0, nullable=False)
    verified_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

