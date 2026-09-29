import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for current user. If user has no notifications yet, initialize starter notifications."""
    notes = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )
    if not notes:
        # Seed standard welcome notification
        welcome_note = Notification(
            user_id=current_user.id,
            title="Bienvenue sur SmartRAG",
            description="Votre espace de travail est prêt. Téléversez vos premiers documents pour tester le RAG.",
            kind="info",
            read=False,
            created_at=datetime.now(timezone.utc),
        )
        db.add(welcome_note)
        db.commit()
        db.refresh(welcome_note)
        notes = [welcome_note]
    return notes


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Notification not found")
    note.read = True
    db.commit()
    db.refresh(note)
    return note
