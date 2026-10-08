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
    """Admin adds a member to the workspace. If the user doesn't exist yet,
    a password is required to create their account. If they already exist,
    password can be omitted."""

    email: EmailStr
    password: str | None = None
    role: WorkspaceRole = WorkspaceRole.MEMBER


class WorkspaceInviteRequest(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.MEMBER


class WorkspaceInvitationOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    email: str
    role: WorkspaceRole
    token: str | None = None
    invite_url: str | None = None
    invited_by: uuid.UUID
    created_at: datetime | None = None
    expires_at: datetime
    accepted_at: datetime | None = None

    class Config:
        from_attributes = True


class InvitationDetailsOut(BaseModel):
    token: str
    workspace_id: uuid.UUID
    workspace_name: str
    email: str
    role: WorkspaceRole
    inviter_email: str
    inviter_name: str | None = None
    expires_at: datetime
    is_expired: bool
    is_accepted: bool


class AcceptInvitationRequest(BaseModel):
    """Payload to accept an invitation. Password and display_name are required if the user has no account yet."""

    password: str | None = None
    display_name: str | None = None

