import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Text, UniqueConstraint

from app.db.base import Base
from app.db.types import GUID


class FeedbackRating(str, enum.Enum):
    UP = "UP"
    DOWN = "DOWN"


class MessageFeedback(Base):
    __tablename__ = "message_feedback"
    __table_args__ = (
        # Un seul avis par utilisateur et par message — un nouvel envoi met à
        # jour l'avis existant plutôt que d'en empiler un second (voir la
        # logique d'upsert dans app/api/routes/feedback.py).
        UniqueConstraint("message_id", "user_id", name="uq_feedback_message_user"),
    )

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    message_id = Column(GUID(), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Enum(FeedbackRating), nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
