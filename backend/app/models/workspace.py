import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, UniqueConstraint

from app.db.base import Base
from app.db.types import GUID


class WorkspaceRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=False)


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),)

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(GUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(WorkspaceRole), nullable=False, default=WorkspaceRole.MEMBER)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class WorkspaceInvitation(Base):
    __tablename__ = "workspace_invitations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(GUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, nullable=False, index=True)
    role = Column(Enum(WorkspaceRole), nullable=False, default=WorkspaceRole.MEMBER)
    token = Column(String, unique=True, nullable=False, index=True)
    invited_by = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)

