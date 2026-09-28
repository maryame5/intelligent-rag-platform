import json
import math
import uuid

from sqlalchemy.orm import Session

from app.models.chunk import Chunk
from app.models.document import Document, DocumentStatus
from app.services.bm25_search import _tokenize as _bm25_tokenize
from app.services.bm25_search import bm25_search
from app.services.fusion import reciprocal_rank_fusion

# Sous ce seuil de similarité cosinus, un chunk n'est pas considéré comme
# pertinent — même s'il fait partie du "top-k" technique. Sans ce filtre,
# search_chunks() renvoie toujours quelque chose dès qu'un chunk existe dans
# la KB, y compris pour une question totalement hors sujet (ex. "quelle est
# la capitale de la Mongolie ?" contre une base sur la politique de congés) :
# le top-1 aurait un score proche de 0 mais serait quand même retourné.
MIN_VECTOR_SCORE = 0.05


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def search_chunks(
    db: Session,
    knowledge_base_id: uuid.UUID,
    query_embedding: list[float],
    top_k: int = 5,
    document_id: uuid.UUID | None = None,
) -> list[tuple[Chunk, Document, float]]:
    """Recherche par similarité cosinus, calculée en mémoire côté Python.

    Choix volontaire pour le MVP : charger les chunks candidats (filtrés par KB,
    document, statut READY) puis scorer en Python plutôt que déléguer à un moteur
    vectoriel dédié (pgvector/Qdrant). Suffisant tant que le volume par KB reste
    modeste ; à remplacer si les benchmarks du Sprint 7 montrent une latence
    problématique à l'échelle (voir docs/architecture.md).
    """
    query = (
        db.query(Chunk, Document)
        .join(Document, Chunk.document_id == Document.id)
        .filter(Document.knowledge_base_id == knowledge_base_id)
        .filter(Document.status == DocumentStatus.READY)
        .filter(Chunk.embedding.isnot(None))
    )
    if document_id is not None:
        query = query.filter(Chunk.document_id == document_id)

    scored: list[tuple[Chunk, Document, float]] = []
    for chunk, document in query.all():
        embedding = json.loads(chunk.embedding)
        score = cosine_similarity(query_embedding, embedding)
        scored.append((chunk, document, score))

    scored.sort(key=lambda item: item[2], reverse=True)
    return scored[:top_k]


def _relevant_vector_candidates(
    db: Session,
    knowledge_base_id: uuid.UUID,
    query_embedding: list[float],
    candidate_k: int,
    document_id: uuid.UUID | None,
) -> list[tuple[Chunk, Document, float]]:
    """search_chunks() + filtre de pertinence minimale — voir MIN_VECTOR_SCORE.
    Factorisé pour être identique entre hybrid_search() (une requête) et
    multi_query_hybrid_search() (plusieurs reformulations, voir plus bas)."""
    results = search_chunks(db, knowledge_base_id, query_embedding, top_k=candidate_k, document_id=document_id)
    return [r for r in results if r[2] >= MIN_VECTOR_SCORE]


def _relevant_keyword_candidates(
    db: Session,
    knowledge_base_id: uuid.UUID,
    query: str,
    candidate_k: int,
    document_id: uuid.UUID | None,
) -> list[tuple[Chunk, Document, float]]:
    """bm25_search() + filtre : conserve uniquement les chunks dont le contenu
    partage au moins un token avec la requête.

    On ne filtre PAS par score BM25 > 0 car c'est incorrect : dans un petit
    corpus BM25Okapi peut attribuer un score nul ou même négatif à un chunk
    *pertinent* (IDF = log((N-df+0.5)/(df+0.5)) → 0 quand df = N, et négatif
    si la formule IDF vaut < 1). La présence d'au moins un token commun est le
    seul critère fiable de pertinence lexicale, indépendant de la taille du
    corpus."""
    results = bm25_search(db, knowledge_base_id, query, top_k=candidate_k, document_id=document_id)
    query_tokens = set(_bm25_tokenize(query))
    return [
        r for r in results
        if query_tokens & set(_bm25_tokenize(r[0].content))
    ]


def hybrid_search(
    db: Session,
    knowledge_base_id: uuid.UUID,
    query: str,
    query_embedding: list[float],
    top_k: int = 5,
    document_id: uuid.UUID | None = None,
    candidate_k: int = 20,
) -> list[tuple[Chunk, Document, float]]:
    """Combine recherche vectorielle et BM25 via Reciprocal Rank Fusion.

    On récupère `candidate_k` candidats de chaque méthode (plus large que
    `top_k` final) avant de fusionner, pour que la fusion ait vraiment de quoi
    arbitrer plutôt que de recevoir deux listes déjà tronquées à 5 éléments.

    IMPORTANT : chaque liste de candidats est filtrée par pertinence minimale
    AVANT la fusion. Sans ce filtre, la fusion RRF donnerait toujours un score
    non nul au meilleur candidat technique même quand rien n'est réellement
    pertinent — cassant le refus déterministe de /chat (voir
    app/api/routes/chat.py et docs/sprints/sprint-05-hybrid-rerank.md)."""
    vector_results = _relevant_vector_candidates(db, knowledge_base_id, query_embedding, candidate_k, document_id)
    keyword_results = _relevant_keyword_candidates(db, knowledge_base_id, query, candidate_k, document_id)

    fused = reciprocal_rank_fusion([vector_results, keyword_results])
    return fused[:top_k]


def multi_query_hybrid_search(
    db: Session,
    knowledge_base_id: uuid.UUID,
    queries: list[str],
    query_embeddings: list[list[float]],
    top_k: int = 5,
    document_id: uuid.UUID | None = None,
    candidate_k: int = 20,
) -> list[tuple[Chunk, Document, float]]:
    """Recherche hybride sur PLUSIEURS reformulations de la même question
    (query expansion, voir app/services/query_expansion.py), fusionnées
    ensemble par Reciprocal Rank Fusion — même mécanisme que hybrid_search(),
    étendu à N listes de candidats au lieu de 2.

    Pourquoi : une question posée avec des mots différents de ceux du document
    ("tarif" vs "prix", "résilier" vs "annuler l'abonnement") peut rater le
    seuil BM25 (aucun terme commun) et arriver en limite du seuil vectoriel.
    Générer quelques reformulations et fusionner leurs résultats augmente le
    rappel sans changer l'algorithme de scoring lui-même.

    `queries` et `query_embeddings` doivent être alignés (même ordre, même
    longueur) — typiquement `queries[0]` est la question originale et le
    reste vient de `expand_query()`.
    """
    all_candidate_lists: list[list[tuple[Chunk, Document, float]]] = []
    for query_text, embedding in zip(queries, query_embeddings):
        all_candidate_lists.append(
            _relevant_vector_candidates(db, knowledge_base_id, embedding, candidate_k, document_id)
        )
        all_candidate_lists.append(
            _relevant_keyword_candidates(db, knowledge_base_id, query_text, candidate_k, document_id)
        )

    fused = reciprocal_rank_fusion(all_candidate_lists)
    return fused[:top_k]
