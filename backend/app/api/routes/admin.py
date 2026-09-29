from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.evaluation.dataset_loader import DatasetNotFoundError, load_dataset
from app.evaluation.runner import run_evaluation
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.feedback import FeedbackRating, MessageFeedback
from app.models.knowledge_base import KnowledgeBase
from app.models.message import Message
from app.models.user import User
from app.schemas.evaluation import RunEvaluationRequest, RunEvaluationResponse
from app.schemas.feedback import AdminFeedbackItemOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Compteurs système de base. Les métriques temps réel (latence, tokens,
    coût, qualité RAG) sont exposées séparément sur /metrics au format
    Prometheus — voir docs/sprints/sprint-07-evaluation-observability-cicd.md."""
    return {
        "total_users": db.query(func.count(User.id)).scalar(),
        "total_knowledge_bases": db.query(func.count(KnowledgeBase.id)).scalar(),
        "total_documents": db.query(func.count(Document.id)).scalar(),
        "total_feedback_up": db.query(func.count(MessageFeedback.id))
        .filter(MessageFeedback.rating == FeedbackRating.UP)
        .scalar(),
        "total_feedback_down": db.query(func.count(MessageFeedback.id))
        .filter(MessageFeedback.rating == FeedbackRating.DOWN)
        .scalar(),
    }


@router.get("/feedback", response_model=list[AdminFeedbackItemOut])
def list_feedback(
    rating: Literal["up", "down"] | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Boucle d'amélioration : liste le feedback avec le contexte nécessaire
    pour être exploitable (contenu de la réponse concernée, knowledge base,
    utilisateur) — un avis seul, sans ce contexte, ne dit pas grand-chose.
    Filtrer sur `rating=down` en pratique pour repérer ce qui ne fonctionne
    pas plutôt que de parcourir tout le feedback positif."""
    query = (
        db.query(MessageFeedback, Message, Conversation, KnowledgeBase, User)
        .join(Message, MessageFeedback.message_id == Message.id)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .join(KnowledgeBase, Conversation.knowledge_base_id == KnowledgeBase.id)
        .join(User, MessageFeedback.user_id == User.id)
        .order_by(MessageFeedback.created_at.desc())
    )
    if rating is not None:
        query = query.filter(
            MessageFeedback.rating == (FeedbackRating.UP if rating == "up" else FeedbackRating.DOWN)
        )

    rows = query.offset(offset).limit(limit).all()

    return [
        AdminFeedbackItemOut(
            feedback_id=feedback.id,
            rating="up" if feedback.rating == FeedbackRating.UP else "down",
            comment=feedback.comment,
            created_at=feedback.created_at,
            message_id=message.id,
            message_content=message.content,
            knowledge_base_id=kb.id,
            knowledge_base_name=kb.name,
            user_email=author.email,
        )
        for feedback, message, _conversation, kb, author in rows
    ]


@router.post("/evaluations/run", response_model=RunEvaluationResponse)
def run_evaluation_endpoint(
    payload: RunEvaluationRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    """Lance un dataset de benchmark contre une knowledge base réelle. Réservé
    admin : ça déclenche potentiellement de nombreux appels LLM (coûteux même
    sur un plan gratuit rate-limité), pas une opération à exposer aux USER."""
    try:
        dataset = load_dataset(payload.dataset_name)
    except DatasetNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    summary = run_evaluation(
        db,
        knowledge_base_id=payload.knowledge_base_id,
        dataset=dataset,
        top_k=payload.top_k,
        mode=payload.mode,
        rerank=payload.rerank,
        run_generation=payload.run_generation,
    )

    return RunEvaluationResponse(
        dataset_name=summary.dataset_name,
        dataset_version=summary.dataset_version,
        knowledge_base_id=summary.knowledge_base_id,
        mode=summary.mode,
        rerank=summary.rerank,
        top_k=summary.top_k,
        run_generation=summary.run_generation,
        total_questions=summary.total_questions,
        errors=summary.errors,
        mean_recall_at_k=summary.mean_recall_at_k,
        mean_precision_at_k=summary.mean_precision_at_k,
        mrr=summary.mrr,
        mean_faithfulness=summary.mean_faithfulness,
        mean_answer_relevance=summary.mean_answer_relevance,
        mean_latency_ms=summary.mean_latency_ms,
        p95_latency_ms=summary.p95_latency_ms,
        error_rate=summary.error_rate,
        results=summary.results,
    )
