import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.feedback import FeedbackRating, MessageFeedback
from app.models.message import Message, MessageRole
from app.models.user import User
from app.schemas.feedback import FeedbackOut, FeedbackRequest

router = APIRouter(tags=["feedback"])


def _get_owned_assistant_message(db: Session, message_id: uuid.UUID, user: User) -> Message:
    message = (
        db.query(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(Message.id == message_id, Conversation.user_id == user.id)
        .first()
    )
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.role != MessageRole.ASSISTANT:
        # Noter un avis sur sa propre question n'a pas de sens : le feedback
        # porte sur la qualité d'une réponse, jamais sur une question.
        raise HTTPException(
            status_code=422, detail="Le feedback ne s'applique qu'aux réponses de l'assistant."
        )
    return message


@router.post("/messages/{message_id}/feedback", response_model=FeedbackOut)
def submit_feedback(
    message_id: uuid.UUID,
    payload: FeedbackRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upsert : un nouvel envoi sur le même message met à jour l'avis existant
    (changer d'avis, ajouter/modifier un commentaire) plutôt que d'empiler un
    second enregistrement — cohérent avec la contrainte d'unicité en base."""
    _get_owned_assistant_message(db, message_id, user)

    rating = FeedbackRating.UP if payload.rating == "up" else FeedbackRating.DOWN

    existing = (
        db.query(MessageFeedback)
        .filter(MessageFeedback.message_id == message_id, MessageFeedback.user_id == user.id)
        .first()
    )
    if existing:
        existing.rating = rating
        existing.comment = payload.comment
        feedback = existing
    else:
        feedback = MessageFeedback(
            message_id=message_id, user_id=user.id, rating=rating, comment=payload.comment
        )
        db.add(feedback)

    db.commit()
    db.refresh(feedback)

    return FeedbackOut(
        id=feedback.id,
        message_id=feedback.message_id,
        rating="up" if feedback.rating == FeedbackRating.UP else "down",
        comment=feedback.comment,
        created_at=feedback.created_at,
    )


@router.delete("/messages/{message_id}/feedback", status_code=204)
def delete_feedback(
    message_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    """Retirer son avis — par exemple si l'utilisateur a cliqué par erreur."""
    _get_owned_assistant_message(db, message_id, user)
    db.query(MessageFeedback).filter(
        MessageFeedback.message_id == message_id, MessageFeedback.user_id == user.id
    ).delete()
    db.commit()
    return None
