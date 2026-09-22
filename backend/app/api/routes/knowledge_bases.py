import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_kb
from app.db.session import get_db
from app.models.chunk import Chunk
from app.models.conversation import Conversation
from app.models.document import Document, DocumentStatus
from app.models.feedback import MessageFeedback
from app.models.job import IngestionJob
from app.models.knowledge_base import KnowledgeBase
from app.models.message import Message
from app.models.user import User
from app.schemas.document import DocumentOut, DocumentUploadOut
from app.schemas.knowledge_base import KnowledgeBaseCreate, KnowledgeBaseOut, KnowledgeBaseUpdate
from app.services.bm25_search import invalidate_bm25_cache
from app.services.validation import FileValidationError, detect_mismatched_signature, validate_upload
from app.services.storage import delete_object, get_minio_client, upload_bytes
from app.tasks.ingestion_task import run_ingestion_task
from app.core.config import settings

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])


@router.post("", response_model=KnowledgeBaseOut, status_code=201)
def create_kb(payload: KnowledgeBaseCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    kb = KnowledgeBase(name=payload.name, owner_id=user.id)
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return kb


@router.get("", response_model=list[KnowledgeBaseOut])
def list_kbs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(KnowledgeBase).filter(KnowledgeBase.owner_id == user.id).all()


@router.get("/{kb_id}", response_model=KnowledgeBaseOut)
def get_kb(kb_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_owned_kb(db, kb_id, user)


@router.patch("/{kb_id}", response_model=KnowledgeBaseOut)
def rename_kb(
    kb_id: uuid.UUID,
    payload: KnowledgeBaseUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Renomme une knowledge base existante. Seul le propriétaire peut la modifier."""
    kb = get_owned_kb(db, kb_id, user)
    kb.name = payload.name
    db.commit()
    db.refresh(kb)
    return kb


@router.delete("/{kb_id}", status_code=204)
def delete_kb(kb_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    kb = get_owned_kb(db, kb_id, user)

    # 1. Supprimer les conversations et messages associés
    conversations = db.query(Conversation).filter(Conversation.knowledge_base_id == kb.id).all()
    conv_ids = [c.id for c in conversations]
    if conv_ids:
        messages = db.query(Message).filter(Message.conversation_id.in_(conv_ids)).all()
        msg_ids = [m.id for m in messages]
        if msg_ids:
            db.query(MessageFeedback).filter(MessageFeedback.message_id.in_(msg_ids)).delete(synchronize_session=False)
            db.query(Message).filter(Message.id.in_(msg_ids)).delete(synchronize_session=False)
        db.query(Conversation).filter(Conversation.id.in_(conv_ids)).delete(synchronize_session=False)

    # 2. Supprimer les documents, jobs, chunks et fichiers MinIO
    documents = db.query(Document).filter(Document.knowledge_base_id == kb.id).all()
    doc_ids = [d.id for d in documents]
    if doc_ids:
        db.query(IngestionJob).filter(IngestionJob.document_id.in_(doc_ids)).delete(synchronize_session=False)
        db.query(Chunk).filter(Chunk.document_id.in_(doc_ids)).delete(synchronize_session=False)
        try:
            client = get_minio_client()
            for doc in documents:
                delete_object(client, settings.minio_bucket, doc.storage_path)
        except Exception:
            pass
        db.query(Document).filter(Document.id.in_(doc_ids)).delete(synchronize_session=False)

    # 3. Vider le cache BM25
    invalidate_bm25_cache(kb.id)

    # 4. Supprimer la base
    db.delete(kb)
    db.commit()
    return None


@router.post("/{kb_id}/documents", response_model=DocumentUploadOut, status_code=202)
def upload_document(
    kb_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload asynchrone : le fichier est validé et stocké immédiatement, puis
    l'extraction/chunking est déléguée à Celery (worker séparé, file Redis).
    Le client reçoit un job_id à suivre via GET /jobs/{id} plutôt que d'attendre
    le traitement complet."""
    kb = get_owned_kb(db, kb_id, user)

    content = file.file.read()
    try:
        validate_upload(file.filename, file.content_type, len(content))
    except FileValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if detect_mismatched_signature(file.content_type, content):
        raise HTTPException(
            status_code=422,
            detail="Le contenu du fichier ne correspond pas au type déclaré.",
        )

    storage_path = f"{kb.id}/{uuid.uuid4()}_{file.filename}"

    document = Document(
        knowledge_base_id=kb.id,
        filename=file.filename,
        storage_path=storage_path,
        mime_type=file.content_type,
        size_bytes=len(content),
        status=DocumentStatus.PROCESSING,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    try:
        client = get_minio_client()
        upload_bytes(client, settings.minio_bucket, storage_path, content, file.content_type)
    except Exception as exc:
        document.status = DocumentStatus.FAILED
        db.commit()
        raise HTTPException(status_code=502, detail=f"Échec du stockage du fichier : {exc}")

    job = IngestionJob(document_id=document.id)
    db.add(job)
    db.commit()
    db.refresh(job)

    run_ingestion_task.delay(str(document.id), str(job.id))

    return DocumentUploadOut(document=DocumentOut.model_validate(document), job_id=job.id)


@router.get("/{kb_id}/documents", response_model=list[DocumentOut])
def list_documents(
    kb_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    kb = get_owned_kb(db, kb_id, user)
    return (
        db.query(Document)
        .filter(Document.knowledge_base_id == kb.id)
        .order_by(Document.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
