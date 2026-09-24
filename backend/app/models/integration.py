import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from app.db.types import GUID
from app.db.base import Base

class Integration(Base):
    __tablename__ = "integrations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(GUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    provider = Column(String(50), nullable=False)  # notion, gdrive, slack, github, confluence, s3
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="available", nullable=False)  # connected, available, coming_soon
    config = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

