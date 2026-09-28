from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.chunk import Chunk
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.feedback import FeedbackRating, MessageFeedback
from app.models.job import IngestionJob
from app.models.knowledge_base import KnowledgeBase
from app.models.message import Message, MessageRole
from app.models.user import User
from app.schemas.analytics import ActivityItemOut, PlatformMetricsOut, RAGQuality, UsagePoint

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _owned_kb_ids_subquery(db: Session, user: User):
    return db.query(KnowledgeBase.id).filter(KnowledgeBase.owner_id == user.id)

@router.get("/metrics", response_model=PlatformMetricsOut)
def get_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate metrics from the current user's data only."""
    owned_kb_ids = _owned_kb_ids_subquery(db, current_user)
    doc_count = (
        db.query(func.count(Document.id))
        .filter(Document.knowledge_base_id.in_(owned_kb_ids))
        .scalar()
        or 0
    )
    chunk_count = (
        db.query(func.count(Chunk.id))
        .join(Document, Chunk.document_id == Document.id)
        .filter(Document.knowledge_base_id.in_(owned_kb_ids))
        .scalar()
        or 0
    )

    # Feedbacks
    total_feedbacks = (
        db.query(func.count(MessageFeedback.id))
        .filter(MessageFeedback.user_id == current_user.id)
        .scalar()
        or 0
    )
    up_feedbacks = (
        db.query(func.count(MessageFeedback.id))
        .filter(
            MessageFeedback.user_id == current_user.id,
            MessageFeedback.rating == FeedbackRating.UP,
        )
        .scalar()
        or 0
    )
    satisfaction_rate = (up_feedbacks / total_feedbacks) if total_feedbacks > 0 else None

    # Usage series over last 7 days
    today = datetime.now(timezone.utc).date()
    series = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        day_str = d.strftime("%d/%m")
        day_queries = (
            db.query(func.count(Message.id))
            .join(Conversation, Message.conversation_id == Conversation.id)
            .filter(
                Conversation.user_id == current_user.id,
                Message.role == MessageRole.USER,
                func.date(Message.created_at) == d,
            )
            .scalar()
            or 0
        )
        series.append(UsagePoint(date=day_str, queries=day_queries, users=1 if day_queries > 0 else 0))

    queries_this_week = sum(point.queries for point in series)

    return PlatformMetricsOut(
        series=series,
        quality=RAGQuality(
            # Quality is only available after a persisted evaluation run.
            faithfulness=None,
            answerRelevance=None,
            contextRecall=None,
            contextPrecision=None,
        ),
        queriesThisWeek=queries_this_week,
        answeredRate=round(satisfaction_rate, 2) if satisfaction_rate is not None else None,
        indexedDocuments=doc_count,
        indexedChunks=chunk_count,
        monthlyCost=None,
        latencyP95=None,
        errorRate=None,
        throughput=None,
        costPerQuery=None,
    )

@router.get("/activity", response_model=list[ActivityItemOut])
def get_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return recent activity for the current user's resources only."""
    owned_kb_ids = _owned_kb_ids_subquery(db, current_user)
    items: list[ActivityItemOut] = []

    # Recent documents
    recent_docs = (
        db.query(Document)
        .filter(Document.knowledge_base_id.in_(owned_kb_ids))
        .order_by(Document.created_at.desc())
        .limit(10)
        .all()
    )
    for doc in recent_docs:
        items.append(ActivityItemOut(
            id=str(doc.id),
            action="a téléversé et indexé",
            user="Vous",
            target=doc.filename,
            time=doc.created_at.strftime("%d %b %H:%M") if doc.created_at else "Récemment",
            kind="doc",
        ))

    # Recent knowledge bases
    recent_kbs = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.owner_id == current_user.id)
        .order_by(KnowledgeBase.created_at.desc())
        .limit(5)
        .all()
    )
    for kb in recent_kbs:
        items.append(ActivityItemOut(
            id=str(kb.id),
            action="a créé la base de connaissances",
            user="Vous",
            target=kb.name,
            time=kb.created_at.strftime("%d %b %H:%M") if kb.created_at else "Récemment",
            kind="kb",
        ))

    # Recent jobs
    recent_jobs = (
        db.query(IngestionJob)
        .join(Document, IngestionJob.document_id == Document.id)
        .filter(Document.knowledge_base_id.in_(owned_kb_ids))
        .order_by(IngestionJob.created_at.desc())
        .limit(5)
        .all()
    )
    for job in recent_jobs:
        items.append(ActivityItemOut(
            id=str(job.id),
            action=f"a exécuté un job ({job.status.value})",
            user="Worker IA",
            target=f"Job #{str(job.id)[:8]}",
            time=job.created_at.strftime("%d %b %H:%M") if job.created_at else "Récemment",
            kind="job",
        ))

    if not items:
        items.append(ActivityItemOut(
            id="act_init",
            action="a initialisé l'espace",
            user="SmartRAG",
            target="Plateforme prête pour l'ingestion",
            time="Maintenant",
            kind="kb",
        ))

    return items[:15]
