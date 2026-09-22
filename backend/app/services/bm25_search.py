import re
import uuid

from rank_bm25 import BM25Okapi
from sqlalchemy.orm import Session

from app.models.chunk import Chunk
from app.models.document import Document, DocumentStatus

# Cache en mémoire, process-local.
#
# Format : dict[kb_id_str] -> (nombre_de_chunks, BM25Okapi, list[chunk_id_str])
#
# On ne stocke que les IDs des chunks (pas les objets ORM) pour éviter que des
# instances SQLAlchemy liées à une session fermée soient réutilisées dans une
# nouvelle requête (DetachedInstanceError). À chaque cache hit, les rows
# complètes sont rechargées depuis la session courante grâce à ces IDs.
#
# Reconstruire l'index (tokeniser tout le corpus, recalculer les IDF) à
# chaque recherche coûtait le même travail qu'une recherche sur dix, pour un
# résultat identique tant que rien n'a changé dans la KB. Le nombre de chunks
# sert de premier signal d'invalidation automatique — mais NE SUFFIT PAS
# seul : un chunk supprimé puis un autre ajouté laisse le total inchangé
# alors que le contenu a changé. C'est pourquoi l'ingestion
# (app/services/ingestion.py) et la suppression de document
# (app/api/routes/documents.py) appellent `invalidate_bm25_cache()`
# explicitement après toute modification du contenu — le comptage reste un
# filet de sécurité, pas le seul mécanisme.
#
# LIMITE CONNUE : cache process-local. Avec un seul worker uvicorn (config
# actuelle), c'est correct. En multi-process, chaque worker aurait son propre
# cache — à déplacer vers Redis si le déploiement devient multi-process.
_cache: dict[str, tuple[int, BM25Okapi, list[str]]] = {}


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def invalidate_bm25_cache(knowledge_base_id: uuid.UUID) -> None:
    """À appeler après toute modification du contenu des chunks d'une KB
    (ingestion réussie, suppression de document) — voir le commentaire du
    module pour pourquoi le comptage seul ne suffit pas."""
    _cache.pop(str(knowledge_base_id), None)


def clear_bm25_cache() -> None:
    """Vide intégralement le cache process-local. Utile en tests pour éviter
    toute contamination entre suites (le cache est un état global du process)."""
    _cache.clear()


def _get_or_build_index(
    db: Session, knowledge_base_id: uuid.UUID
) -> tuple[BM25Okapi | None, list[tuple[Chunk, Document]]]:
    key = str(knowledge_base_id)

    rows = (
        db.query(Chunk, Document)
        .join(Document, Chunk.document_id == Document.id)
        .filter(Document.knowledge_base_id == knowledge_base_id)
        .filter(Document.status == DocumentStatus.READY)
        .all()
    )
    current_count = len(rows)

    if current_count == 0:
        _cache.pop(key, None)
        return None, []

    cached = _cache.get(key)
    if cached is not None and cached[0] == current_count:
        # Re-fetch rows from the *current* session using the cached chunk IDs so
        # we never hand out ORM objects that are detached from a closed session.
        chunk_ids = cached[2]
        fresh_rows = (
            db.query(Chunk, Document)
            .join(Document, Chunk.document_id == Document.id)
            .filter(Chunk.id.in_(chunk_ids))
            .all()
        )
        return cached[1], fresh_rows

    corpus_tokens = [_tokenize(chunk.content) for chunk, _document in rows]
    index = BM25Okapi(corpus_tokens)
    chunk_ids = [str(chunk.id) for chunk, _document in rows]
    _cache[key] = (current_count, index, chunk_ids)
    return index, rows


def bm25_search(
    db: Session,
    knowledge_base_id: uuid.UUID,
    query: str,
    top_k: int = 5,
    document_id: uuid.UUID | None = None,
) -> list[tuple[Chunk, Document, float]]:
    """Recherche lexicale BM25 (Okapi), calculée en mémoire comme la recherche
    vectorielle (voir `retrieval.py`) : même compromis volontaire pour le MVP,
    même limite de scalabilité documentée dans docs/architecture.md.

    Complète la recherche sémantique : BM25 excelle sur les termes exacts
    (références, codes, acronymes) que les embeddings peuvent lisser.

    L'index de toute la knowledge base est mis en cache (voir le commentaire
    au sommet du module) ; une recherche filtrée par `document_id` reste
    calculée à la volée à chaque appel — cas plus rare, sur un corpus bien
    plus petit, où la mise en cache n'apporterait pas grand-chose."""
    if document_id is not None:
        return _bm25_search_uncached(db, knowledge_base_id, query, top_k, document_id)

    index, rows = _get_or_build_index(db, knowledge_base_id)
    if index is None:
        return []

    scores = index.get_scores(_tokenize(query))
    scored = list(zip(rows, scores))
    scored.sort(key=lambda item: item[1], reverse=True)

    return [(chunk, document, float(score)) for (chunk, document), score in scored[:top_k]]


def _bm25_search_uncached(
    db: Session,
    knowledge_base_id: uuid.UUID,
    query: str,
    top_k: int,
    document_id: uuid.UUID,
) -> list[tuple[Chunk, Document, float]]:
    rows = (
        db.query(Chunk, Document)
        .join(Document, Chunk.document_id == Document.id)
        .filter(Document.knowledge_base_id == knowledge_base_id)
        .filter(Document.status == DocumentStatus.READY)
        .filter(Chunk.document_id == document_id)
        .all()
    )
    if not rows:
        return []

    corpus_tokens = [_tokenize(chunk.content) for chunk, _document in rows]
    bm25 = BM25Okapi(corpus_tokens)
    scores = bm25.get_scores(_tokenize(query))

    scored = list(zip(rows, scores))
    scored.sort(key=lambda item: item[1], reverse=True)

    return [(chunk, document, float(score)) for (chunk, document), score in scored[:top_k]]
