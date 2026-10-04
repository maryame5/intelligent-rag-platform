"""
Celery background tasks for sending emails asynchronously.
"""

import logging
import uuid

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceInvitation
from app.services.email import send_workspace_invitation_email
from app.worker import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="send_invitation_email_task", bind=True, max_retries=3)
def send_invitation_email_task(self, invitation_id: str):
    """Send workspace invitation email in the background with retry policy."""
    db = SessionLocal()
    try:
        inv_uuid = uuid.UUID(invitation_id)
        invitation = db.query(WorkspaceInvitation).filter(WorkspaceInvitation.id == inv_uuid).first()
        if not invitation:
            logger.warning("Invitation %s not found, skipping email", invitation_id)
            return

        workspace = db.query(Workspace).filter(Workspace.id == invitation.workspace_id).first()
        inviter = db.query(User).filter(User.id == invitation.invited_by).first()

        workspace_name = workspace.name if workspace else "SmartRAG Workspace"
        inviter_name = (
            inviter.display_name or inviter.email.split("@")[0] if inviter else "Un administrateur"
        )
        invite_url = f"{settings.frontend_url.rstrip('/')}/accept-invite?token={invitation.token}"

        success = send_workspace_invitation_email(
            to_email=invitation.email,
            inviter_name=inviter_name,
            workspace_name=workspace_name,
            role=invitation.role.value if hasattr(invitation.role, "value") else str(invitation.role),
            invite_url=invite_url,
            expires_in_hours=settings.invitation_expire_hours,
        )

        if not success and settings.smtp_host:
            raise Exception("SMTP delivery failed")

    except Exception as exc:
        logger.error("Error in send_invitation_email_task for %s: %s", invitation_id, exc)
        if settings.smtp_host:
            # Only retry if a real SMTP server was configured and failed
            raise self.retry(exc=exc, countdown=30 * (2**self.request.retries))
    finally:
        db.close()
