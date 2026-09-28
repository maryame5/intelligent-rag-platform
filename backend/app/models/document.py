import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String

from app.db.base import Base
from app.db.types import GUID


class DocumentStatus(str, enum.Enum):
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"


class Document(Base):
    __tablename__ = "documents"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    knowledge_base_id = Column(GUID(), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    status = Column(Enum(DocumentStatus), nullable=False, default=DocumentStatus.PROCESSING)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
