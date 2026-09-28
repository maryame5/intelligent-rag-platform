import uuid

import app.services.bm25_search as bm25_module
from app.models.chunk import Chunk
from app.models.document import Document, DocumentStatus
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User
from app.services.bm25_search import bm25_search, invalidate_bm25_cache


def _make_kb(db_session) -> KnowledgeBase:
    user = User(email=f"{uuid.uuid4()}@example.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    kb = KnowledgeBase(name="KB", owner_id=user.id)
    db_session.add(kb)
    db_session.commit()
    return kb


def _add_chunk(db_session, kb: KnowledgeBase, filename: str, content: str) -> tuple[Document, Chunk]:
    document = Document(
        knowledge_base_id=kb.id,
        filename=filename,
        storage_path="x",
        mime_type="text/plain",
        size_bytes=10,
        status=DocumentStatus.READY,
    )
    db_session.add(document)
    db_session.commit()

    chunk = Chunk(document_id=document.id, chunk_index=0, content=content)
    db_session.add(chunk)
    db_session.commit()
    return document, chunk


def _install_counting_bm25(monkeypatch):
    """Remplace BM25Okapi par une sous-classe qui compte ses instanciations —
    la façon la plus directe de vérifier "reconstruit ou pas" sans dépendre
    de détails d'implémentation internes au cache."""

    class _CountingBM25Okapi(bm25_module.BM25Okapi):
        instances = 0

        def __init__(self, *args, **kwargs):
            type(self).instances += 1
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(bm25_module, "BM25Okapi", _CountingBM25Okapi)
    return _CountingBM25Okapi


def test_index_is_reused_across_identical_searches(db_session, monkeypatch):
    counting = _install_counting_bm25(monkeypatch)
    kb = _make_kb(db_session)
    _add_chunk(db_session, kb, "a.txt", "un texte quelconque")
    _add_chunk(db_session, kb, "b.txt", "un autre texte")

    bm25_search(db_session, kb.id, "texte")
    bm25_search(db_session, kb.id, "texte")
    bm25_search(db_session, kb.id, "autre requête")

    assert counting.instances == 1  # un seul build pour les 3 appels


def test_cache_invalidated_when_a_chunk_is_added(db_session, monkeypatch):
    counting = _install_counting_bm25(monkeypatch)
    kb = _make_kb(db_session)
    _add_chunk(db_session, kb, "a.txt", "un texte quelconque")

    bm25_search(db_session, kb.id, "texte")
    _add_chunk(db_session, kb, "b.txt", "un nouveau chunk")
    bm25_search(db_session, kb.id, "texte")

    assert counting.instances == 2  # le compte de chunks a changé -> rebuild


def test_explicit_invalidation_is_what_ingestion_and_deletion_rely_on(db_session, monkeypatch):
    """Démontre le correctif : un simple changement de CONTENU à compte de
    chunks égal (supprimer un chunk puis en ajouter un autre différent) ne
    serait pas détecté par le seul comptage — c'est pour ça que l'ingestion
    et la suppression de document appellent invalidate_bm25_cache()
    explicitement plutôt que de compter uniquement sur le compteur."""
    counting = _install_counting_bm25(monkeypatch)
    kb = _make_kb(db_session)
    _document_a, chunk_a = _add_chunk(db_session, kb, "a.txt", "un texte quelconque")

    bm25_search(db_session, kb.id, "texte")  # 1er build, count=1

    db_session.delete(chunk_a)
    db_session.commit()
    _add_chunk(db_session, kb, "b.txt", "un texte totalement différent")  # count=1 aussi

    invalidate_bm25_cache(kb.id)  # ce que fait réellement delete_document()/run_ingestion()
    bm25_search(db_session, kb.id, "texte")

    assert counting.instances == 2  # sans l'invalidation explicite, resterait à 1


def test_document_scoped_search_is_never_cached(db_session, monkeypatch):
    counting = _install_counting_bm25(monkeypatch)
    kb = _make_kb(db_session)
    document, _chunk = _add_chunk(db_session, kb, "a.txt", "un texte quelconque")

    bm25_search(db_session, kb.id, "texte", document_id=document.id)
    bm25_search(db_session, kb.id, "texte", document_id=document.id)

    assert counting.instances == 2  # jamais mis en cache pour une recherche filtrée


def test_empty_kb_returns_empty_list_and_clears_stale_cache(db_session, monkeypatch):
    _install_counting_bm25(monkeypatch)
    kb = _make_kb(db_session)
    document, chunk = _add_chunk(db_session, kb, "a.txt", "un texte quelconque")

    assert bm25_search(db_session, kb.id, "texte") != []

    db_session.delete(chunk)
    db_session.delete(document)
    db_session.commit()

    assert bm25_search(db_session, kb.id, "texte") == []
