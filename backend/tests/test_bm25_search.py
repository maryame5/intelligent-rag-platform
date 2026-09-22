import uuid

from app.models.chunk import Chunk
from app.models.document import Document, DocumentStatus
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User
from app.services.bm25_search import bm25_search


def _make_kb_with_chunks(db_session, chunk_texts):
    user = User(email=f"{uuid.uuid4()}@example.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()

    kb = KnowledgeBase(name="KB", owner_id=user.id)
    db_session.add(kb)
    db_session.commit()

    document = Document(
        knowledge_base_id=kb.id,
        filename="doc.txt",
        storage_path="x",
        mime_type="text/plain",
        size_bytes=10,
        status=DocumentStatus.READY,
    )
    db_session.add(document)
    db_session.commit()

    for i, text in enumerate(chunk_texts):
        db_session.add(Chunk(document_id=document.id, chunk_index=i, content=text))
    db_session.commit()

    return kb, document


def test_bm25_ranks_exact_keyword_match_first(db_session):
    # Avec seulement 2 documents, un terme présent dans exactement 1 des 2 a une
    # IDF nulle (log(1.5)-log(1.5)=0) : cas dégénéré classique de BM25 sur un
    # corpus minuscule. Un 3e document neutre suffit à sortir de ce cas limite
    # et à rendre l'IDF de "budget"/"2026" strictement positive.
    kb, _document = _make_kb_with_chunks(
        db_session,
        [
            "Le chat dort sur le canape toute la journee.",
            "Le budget prevu pour 2026 est de dix millions.",
            "La recette de la tarte aux pommes necessite du beurre et du sucre.",
        ],
    )

    results = bm25_search(db_session, kb.id, "budget 2026", top_k=5)
    assert results[0][0].content.startswith("Le budget")


def test_bm25_filters_by_document_id(db_session):
    kb, document = _make_kb_with_chunks(db_session, ["chat chat chat"])

    other_document = Document(
        knowledge_base_id=kb.id,
        filename="other.txt",
        storage_path="y",
        mime_type="text/plain",
        size_bytes=10,
        status=DocumentStatus.READY,
    )
    db_session.add(other_document)
    db_session.commit()
    db_session.add(Chunk(document_id=other_document.id, chunk_index=0, content="chat chat chat"))
    db_session.commit()

    results = bm25_search(db_session, kb.id, "chat", top_k=10, document_id=document.id)
    assert len(results) >= 1
    assert all(chunk.document_id == document.id for chunk, _doc, _score in results)


def test_bm25_on_empty_kb_returns_empty_list(db_session):
    user = User(email="empty_bm25@example.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    kb = KnowledgeBase(name="Vide", owner_id=user.id)
    db_session.add(kb)
    db_session.commit()

    assert bm25_search(db_session, kb.id, "peu importe") == []
