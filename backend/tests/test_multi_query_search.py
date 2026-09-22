import json
import uuid

from app.models.chunk import Chunk
from app.models.document import Document, DocumentStatus
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User
from app.services.retrieval import multi_query_hybrid_search

ZERO_VECTOR = [0.0] * 6


def _make_kb(db_session):
    user = User(email=f"{uuid.uuid4()}@example.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()

    kb = KnowledgeBase(name="KB", owner_id=user.id)
    db_session.add(kb)
    db_session.commit()
    return kb


def _add_chunk(db_session, kb, filename: str, content: str) -> Chunk:
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

    chunk = Chunk(
        document_id=document.id,
        chunk_index=0,
        content=content,
        embedding=json.dumps(ZERO_VECTOR),
        embedding_model="test",
    )
    db_session.add(chunk)
    db_session.commit()
    return chunk


def _make_kb_with_target_and_filler(db_session, target_content: str) -> tuple[KnowledgeBase, Chunk]:
    """Un chunk cible + 2 chunks neutres sans rapport, dans des documents
    séparés. Nécessaire pour éviter le cas dégénéré de BM25 sur un corpus de
    1-2 documents, où l'IDF d'un terme présent dans "trop" du corpus devient
    nulle ou négative (déjà rencontré dans test_bm25_search.py) — avec 3
    documents, l'IDF d'un terme spécifique au chunk cible reste positive."""
    kb = _make_kb(db_session)
    target = _add_chunk(db_session, kb, "cible.txt", target_content)
    _add_chunk(db_session, kb, "filler1.txt", "Une phrase totalement neutre sans rapport avec le reste.")
    _add_chunk(db_session, kb, "filler2.txt", "Encore un texte neutre, différent, sans lien non plus.")
    return kb, target


def test_multi_query_finds_via_bm25_even_when_embeddings_are_all_zero(db_session):
    """Simule le cas où la reformulation aide côté lexical (BM25) même si les
    embeddings factices ne discriminent rien (vecteurs nuls, hors vocabulaire).
    La requête originale ("prix") ne partage aucun terme avec le document ;
    la reformulation ("tarif") si."""
    kb, target = _make_kb_with_target_and_filler(db_session, "Le tarif mensuel est de 49 euros.")

    queries = ["prix", "tarif"]
    results = multi_query_hybrid_search(
        db_session, kb.id, queries=queries, query_embeddings=[ZERO_VECTOR, ZERO_VECTOR], top_k=5
    )
    assert len(results) == 1
    assert results[0][0].id == target.id


def test_multi_query_returns_empty_when_no_variant_matches(db_session):
    kb, _target = _make_kb_with_target_and_filler(db_session, "Le tarif mensuel est de 49 euros.")

    queries = ["capitale", "montagne", "ocean"]
    results = multi_query_hybrid_search(
        db_session, kb.id, queries=queries, query_embeddings=[ZERO_VECTOR] * 3, top_k=5
    )
    assert results == []


def test_multi_query_deduplicates_chunk_found_by_several_variants(db_session):
    kb, target = _make_kb_with_target_and_filler(db_session, "Le tarif mensuel est de 49 euros.")

    # Les deux reformulations trouvent le MÊME chunk via BM25 : il ne doit
    # apparaître qu'une fois dans le résultat fusionné, pas deux.
    queries = ["tarif", "mensuel"]
    results = multi_query_hybrid_search(
        db_session, kb.id, queries=queries, query_embeddings=[ZERO_VECTOR, ZERO_VECTOR], top_k=5
    )
    assert len(results) == 1
    assert results[0][0].id == target.id
