import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_kb
from app.db.session import get_db
from app.models.user import User
from app.schemas.retrieval import SearchRequest, SearchResultItem
from app.services.embeddings import get_embedding_provider
from app.services.generation import get_chat_provider
from app.services.query_expansion import expand_query
from app.services.reranking import get_reranker
from app.services.retrieval import hybrid_search, multi_query_hybrid_search, search_chunks

router = APIRouter(prefix="/knowledge-bases", tags=["retrieval"])


@router.post("/{kb_id}/search", response_model=list[SearchResultItem])
def search_kb(
    kb_id: uuid.UUID,
    payload: SearchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    kb = get_owned_kb(db, kb_id, user)
    embedding_provider = get_embedding_provider()

    # Si on reranke ou qu'on étend la requête, on récupère plus de candidats
    # que le top_k final : le reranker doit avoir de vrais choix à arbitrer,
    # et la fusion multi-requêtes a besoin d'un pool plus large par variante.
    candidate_k = max(payload.top_k, 20) if (payload.rerank or payload.expand_query) else payload.top_k

    if payload.expand_query:
        # Query expansion : quelques reformulations de la question (LLM),
        # chacune cherchée en hybride, puis tout fusionné ensemble (RRF).
        # Améliore le rappel quand la question et le document n'utilisent pas
        # les mêmes mots — voir app/services/query_expansion.py.
        chat_provider = get_chat_provider()
        queries = expand_query(chat_provider, payload.query)
        query_embeddings = embedding_provider.embed(queries)
        results = multi_query_hybrid_search(
            db,
            knowledge_base_id=kb.id,
            queries=queries,
            query_embeddings=query_embeddings,
            top_k=candidate_k,
            document_id=payload.document_id,
        )
    elif payload.mode == "hybrid":
        query_embedding = embedding_provider.embed([payload.query])[0]
        results = hybrid_search(
            db,
            knowledge_base_id=kb.id,
            query=payload.query,
            query_embedding=query_embedding,
            top_k=candidate_k,
            document_id=payload.document_id,
        )
    else:
        query_embedding = embedding_provider.embed([payload.query])[0]
        results = search_chunks(
            db,
            knowledge_base_id=kb.id,
            query_embedding=query_embedding,
            top_k=candidate_k,
            document_id=payload.document_id,
        )

    if payload.rerank:
        reranker = get_reranker(get_chat_provider())
        results = reranker.rerank(payload.query, results)

    results = results[: payload.top_k]

    return [
        SearchResultItem(
            chunk_id=chunk.id,
            document_id=document.id,
            document_filename=document.filename,
            page=chunk.page,
            chunk_index=chunk.chunk_index,
            content=chunk.content,
            score=score,
            rank=i,
        )
        for i, (chunk, document, score) in enumerate(results, start=1)
    ]
