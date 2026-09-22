import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User
from app.schemas.document import DocumentOut
from app.services.bm25_search import invalidate_bm25_cache
from app.services.storage import delete_object, get_minio_client

router = APIRouter(tags=["documents"])


def _get_owned_document(db: Session, document_id: uuid.UUID, user: User) -> Document:
    doc = (
        db.query(Document)
        .join(KnowledgeBase, Document.knowledge_base_id == KnowledgeBase.id)
        .filter(Document.id == document_id, KnowledgeBase.owner_id == user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(document_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_owned_document(db, document_id, user)


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(document_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = _get_owned_document(db, document_id, user)

    db.query(Chunk).filter(Chunk.document_id == doc.id).delete()

    try:
        client = get_minio_client()
        delete_object(client, settings.minio_bucket, doc.storage_path)
    except Exception:
        # On ne bloque pas la suppression logique si le fichier physique est déjà
        # absent ou si MinIO est temporairement indisponible ; à surveiller via logs.
        pass

    db.delete(doc)
    db.commit()
    invalidate_bm25_cache(doc.knowledge_base_id)
    return None
