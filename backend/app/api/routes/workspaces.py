"""
Workspace management API.

- POST   /workspaces            → create workspace (auto-join as ADMIN)
- GET    /workspaces            → list workspaces the current user belongs to
- GET    /workspaces/{id}       → workspace details
- GET    /workspaces/{id}/members → list members
- POST   /workspaces/{id}/members → add existing user OR create new user + add
- DELETE /workspaces/{id}/members/{user_id} → remove member
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_current_user
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_password
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import (
    Workspace,
    WorkspaceInvitation,
    WorkspaceMember,
    WorkspaceRole,
)
from app.schemas.user import TokenPair
from app.schemas.workspace import (
    AcceptInvitationRequest,
    CreateMemberWithPassword,
    InvitationDetailsOut,
    WorkspaceCreate,
    WorkspaceInvitationOut,
    WorkspaceInviteRequest,
    WorkspaceMemberOut,
    WorkspaceOut,
)
from app.tasks.email_task import send_invitation_email_task

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
    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Le nom du workspace ne peut pas être vide.")

    # Check if a workspace with the same name already exists (case-insensitive)
    existing_ws = (
        db.query(Workspace)
        .filter(func.lower(Workspace.name) == clean_name.lower())
        .first()
    )
    if existing_ws:
        raise HTTPException(
            status_code=400,
            detail=f"Un espace de travail nommé '{clean_name}' existe déjà. Veuillez choisir un autre nom.",
        )

    ws = Workspace(name=clean_name, created_by=current_user.id)
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


@router.post(
    "/{workspace_id}/members", response_model=WorkspaceMemberOut, status_code=status.HTTP_201_CREATED
)
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


# ─── invitations ────────────────────────────────────────────────────────────


@router.post(
    "/{workspace_id}/invitations",
    response_model=WorkspaceInvitationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_invitation(
    workspace_id: uuid.UUID,
    payload: WorkspaceInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin invites a user to the workspace by email. Sends an email invitation asynchronously."""
    _require_ws_admin(db, workspace_id, current_user)

    target_email = payload.email.strip().lower()

    # Check if already an active member
    existing_user = db.query(User).filter(User.email == target_email).first()
    if existing_user:
        existing_member = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == existing_user.id,
            )
            .first()
        )
        if existing_member:
            raise HTTPException(status_code=400, detail="User is already a member of this workspace")

    # Check if there is already a pending invitation for this email
    now = datetime.now(timezone.utc)
    pending_invite = (
        db.query(WorkspaceInvitation)
        .filter(
            WorkspaceInvitation.workspace_id == workspace_id,
            WorkspaceInvitation.email == target_email,
            WorkspaceInvitation.accepted_at.is_(None),
            WorkspaceInvitation.expires_at > now,
        )
        .first()
    )

    if pending_invite:
        # Renew token and expiration
        pending_invite.token = secrets.token_urlsafe(32)
        pending_invite.expires_at = now + timedelta(hours=settings.invitation_expire_hours)
        pending_invite.role = payload.role
        pending_invite.invited_by = current_user.id
        invitation = pending_invite
    else:
        invitation = WorkspaceInvitation(
            workspace_id=workspace_id,
            email=target_email,
            role=payload.role,
            token=secrets.token_urlsafe(32),
            invited_by=current_user.id,
            expires_at=now + timedelta(hours=settings.invitation_expire_hours),
        )
        db.add(invitation)

    db.commit()
    db.refresh(invitation)

    # Queue async email sending via Celery
    try:
        send_invitation_email_task.delay(str(invitation.id))
    except Exception:
        # Fallback if Celery broker is momentarily unreachable (e.g. testing standalone)
        import logging
        logging.getLogger(__name__).warning("Celery task queueing failed, trying direct task execution")
        try:
            send_invitation_email_task(str(invitation.id))
        except Exception:
            pass

    invite_url = f"{settings.frontend_url.rstrip('/')}/accept-invite?token={invitation.token}"
    return WorkspaceInvitationOut(
        id=invitation.id,
        workspace_id=invitation.workspace_id,
        email=invitation.email,
        role=invitation.role,
        token=invitation.token,
        invite_url=invite_url,
        invited_by=invitation.invited_by,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
    )


@router.get("/{workspace_id}/invitations", response_model=list[WorkspaceInvitationOut])
def list_invitations(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin lists pending invitations for the workspace."""
    _require_ws_admin(db, workspace_id, current_user)
    now = datetime.now(timezone.utc)
    invites = (
        db.query(WorkspaceInvitation)
        .filter(
            WorkspaceInvitation.workspace_id == workspace_id,
            WorkspaceInvitation.accepted_at.is_(None),
            WorkspaceInvitation.expires_at > now,
        )
        .order_by(WorkspaceInvitation.created_at.desc())
        .all()
    )
    return [
        WorkspaceInvitationOut(
            id=inv.id,
            workspace_id=inv.workspace_id,
            email=inv.email,
            role=inv.role,
            token=inv.token,
            invite_url=f"{settings.frontend_url.rstrip('/')}/accept-invite?token={inv.token}",
            invited_by=inv.invited_by,
            created_at=inv.created_at,
            expires_at=inv.expires_at,
            accepted_at=inv.accepted_at,
        )
        for inv in invites
    ]


@router.delete(
    "/{workspace_id}/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT
)
def revoke_invitation(
    workspace_id: uuid.UUID,
    invitation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin revokes a pending invitation."""
    _require_ws_admin(db, workspace_id, current_user)
    inv = (
        db.query(WorkspaceInvitation)
        .filter(
            WorkspaceInvitation.id == invitation_id,
            WorkspaceInvitation.workspace_id == workspace_id,
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    db.delete(inv)
    db.commit()


@router.get("/invitations/{token}", response_model=InvitationDetailsOut)
def get_invitation_by_token(token: str, db: Session = Depends(get_db)):
    """Inspect invitation details from magic link token (no authentication required)."""
    inv = db.query(WorkspaceInvitation).filter(WorkspaceInvitation.token == token).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found or invalid")

    now = datetime.now(timezone.utc)
    # Ensure tz-aware comparison
    exp = inv.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    is_expired = exp < now
    is_accepted = inv.accepted_at is not None

    workspace = db.query(Workspace).filter(Workspace.id == inv.workspace_id).first()
    inviter = db.query(User).filter(User.id == inv.invited_by).first()

    return InvitationDetailsOut(
        token=token,
        workspace_id=inv.workspace_id,
        workspace_name=workspace.name if workspace else "Workspace",
        email=inv.email,
        role=inv.role,
        inviter_email=inviter.email if inviter else "admin@smartrag.local",
        inviter_name=inviter.display_name if inviter else None,
        expires_at=exp,
        is_expired=is_expired,
        is_accepted=is_accepted,
    )


@router.post("/invitations/{token}/accept", response_model=TokenPair)
def accept_invitation(
    token: str,
    payload: AcceptInvitationRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Accept an invitation to join a workspace."""
    inv = db.query(WorkspaceInvitation).filter(WorkspaceInvitation.token == token).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if inv.accepted_at is not None:
        raise HTTPException(status_code=400, detail="Invitation already accepted")

    now = datetime.now(timezone.utc)
    exp = inv.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if exp < now:
        raise HTTPException(status_code=400, detail="Invitation has expired")

    user_to_join: User | None = None

    if current_user:
        # If user is logged in
        user_to_join = current_user
    else:
        # Check if user already exists with this email
        existing_user = db.query(User).filter(User.email == inv.email).first()
        if existing_user:
            user_to_join = existing_user
        else:
            # Create user account
            if not payload.password:
                raise HTTPException(
                    status_code=400,
                    detail="Password is required to create your account",
                )
            user_to_join = User(
                email=inv.email,
                hashed_password=hash_password(payload.password),
                display_name=payload.display_name.strip() if payload.display_name else None,
            )
            db.add(user_to_join)
            db.flush()

    # Check if membership already exists
    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == inv.workspace_id,
            WorkspaceMember.user_id == user_to_join.id,
        )
        .first()
    )
    if not membership:
        membership = WorkspaceMember(
            workspace_id=inv.workspace_id,
            user_id=user_to_join.id,
            role=inv.role,
        )
        db.add(membership)

    inv.accepted_at = now
    db.commit()

    return TokenPair(
        access_token=create_access_token(str(user_to_join.id)),
        refresh_token=create_refresh_token(str(user_to_join.id)),
    )

