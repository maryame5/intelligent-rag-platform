import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.workspace import WorkspaceRole


class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceOut(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime | None = None
    created_by: uuid.UUID

    class Config:
        from_attributes = True


class WorkspaceMemberOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    display_name: str | None = None
    role: WorkspaceRole
    joined_at: datetime | None = None

    class Config:
        from_attributes = True


class AddMemberRequest(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.MEMBER


class CreateMemberWithPassword(BaseModel):
    """Admin creates a user account + adds them to the workspace."""

    email: EmailStr
    password: str
    role: WorkspaceRole = WorkspaceRole.MEMBER
