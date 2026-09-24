import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.verified_answer import VerifiedAnswer
from app.schemas.verified_answer import VerifiedAnswerCreate, VerifiedAnswerOut

router = APIRouter(prefix="/verified-answers", tags=["verified-answers"])

@router.get("", response_model=list[VerifiedAnswerOut])
def list_verified_answers(
    kb_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all verified / pinned Q&A answers, optionally filtered by knowledge base."""
    query = db.query(VerifiedAnswer)
    if kb_id:
        query = query.filter(VerifiedAnswer.knowledge_base_id == kb_id)
    answers = query.order_by(VerifiedAnswer.created_at.desc()).all()
    return answers

@router.post("", response_model=VerifiedAnswerOut, status_code=status.HTTP_201_CREATED)
def create_verified_answer(
    payload: VerifiedAnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create and verify a reference Q&A answer."""
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == payload.knowledge_base_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    user_name = current_user.display_name or current_user.email.split("@")[0]

    va = VerifiedAnswer(
        knowledge_base_id=payload.knowledge_base_id,
        question=payload.question.strip(),
        answer=payload.answer.strip(),
        tags=payload.tags or [],
        uses_count=0,
        verified_by=user_name,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(va)
    db.commit()
    db.refresh(va)
    return va

@router.delete("/{answer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_verified_answer(
    answer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a verified answer."""
    va = db.query(VerifiedAnswer).filter(VerifiedAnswer.id == answer_id).first()
    if not va:
        raise HTTPException(status_code=404, detail="Verified answer not found")
    db.delete(va)
    db.commit()
    return None
