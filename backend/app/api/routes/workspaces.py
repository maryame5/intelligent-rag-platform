"""
Workspace management API.

- POST   /workspaces            → create workspace (auto-join as ADMIN)
- GET    /workspaces            → list workspaces the current user belongs to
- GET    /workspaces/{id}       → workspace details
- GET    /workspaces/{id}/members → list members
- POST   /workspaces/{id}/members → add existing user OR create new user + add
- DELETE /workspaces/{id}/members/{user_id} → remove member
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from app.schemas.workspace import (
    AddMemberRequest,
    CreateMemberWithPassword,
    WorkspaceCreate,
    WorkspaceMemberOut,
    WorkspaceOut,
)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


# ─── helpers ────────────────────────────────────────────────────────────────
def _require_ws_admin(db: Session, workspace_id: uuid.UUID, user: User) -> WorkspaceMember:
    """Return the membership row if the user is ADMIN of the workspace, else 403."""
    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.role == WorkspaceRole.ADMIN,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace admin access required")
    return membership


# ─── routes ─────────────────────────────────────────────────────────────────

@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a workspace and make the creator an ADMIN member."""
    ws = Workspace(name=payload.name.strip(), created_by=current_user.id)
    db.add(ws)
    db.flush()  # get ws.id

    membership = WorkspaceMember(
        workspace_id=ws.id,
        user_id=current_user.id,
        role=WorkspaceRole.ADMIN,
    )
    db.add(membership)
    db.commit()
    db.refresh(ws)
    return ws


@router.get("", response_model=list[WorkspaceOut])
def list_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List workspaces the current user is a member of."""
    rows = (
        db.query(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .filter(WorkspaceMember.user_id == current_user.id)
        .all()
    )
    return rows


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get_workspace(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Workspace not found")
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    return ws


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberOut])
def list_members(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all members of a workspace (any member can see)."""
    # verify caller belongs to workspace
    own = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
        .first()
    )
    if not own:
        raise HTTPException(status_code=404, detail="Workspace not found")

    rows = (
        db.query(
            WorkspaceMember.id,
            WorkspaceMember.user_id,
            User.email,
            User.display_name,
            WorkspaceMember.role,
            WorkspaceMember.joined_at,
        )
        .join(User, User.id == WorkspaceMember.user_id)
        .filter(WorkspaceMember.workspace_id == workspace_id)
        .all()
    )
    return [
        WorkspaceMemberOut(
            id=r.id,
            user_id=r.user_id,
            email=r.email,
            display_name=r.display_name,
            role=r.role,
            joined_at=r.joined_at,
        )
        for r in rows
    ]


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberOut, status_code=status.HTTP_201_CREATED)
def add_member(
    workspace_id: uuid.UUID,
    payload: CreateMemberWithPassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin adds a member. Creates the user account if it doesn't exist."""
    _require_ws_admin(db, workspace_id, current_user)

    # Find or create user
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        user = User(
            email=payload.email,
            hashed_password=hash_password(payload.password),
        )
        db.add(user)
        db.flush()

    # Check if already member
    existing = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this workspace")

    membership = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user.id,
        role=payload.role,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)

    return WorkspaceMemberOut(
        id=membership.id,
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=membership.role,
        joined_at=membership.joined_at,
    )


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin removes a member from the workspace."""
    _require_ws_admin(db, workspace_id, current_user)

    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")

    # Prevent removing yourself if you're the only admin
    if user_id == current_user.id:
        admin_count = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.role == WorkspaceRole.ADMIN,
            )
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last admin")

    db.delete(membership)
    db.commit()
