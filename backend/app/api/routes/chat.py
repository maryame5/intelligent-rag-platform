import json
import logging
import uuid

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_kb
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.feedback import FeedbackRating, MessageFeedback
from app.models.knowledge_base import KnowledgeBase
from app.models.message import Message, MessageRole
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, CitationOut
from app.schemas.conversation import ConversationOut, ConversationSummaryOut, MessageOut
from app.services.bm25_search import bm25_search
from app.services.embeddings import EmbeddingProviderError, get_embedding_provider
from app.services.generation import ChatProvider, ChatProviderError, get_chat_provider
from app.services.prompt_builder import build_chat_messages
from app.services.query_expansion import expand_query
from app.services.query_rewriting import rewrite_query
from app.services.reranking import get_reranker
from app.services.retrieval import hybrid_search, multi_query_hybrid_search, search_chunks

router = APIRouter(tags=["chat"])

# Seuil de similarité en dessous duquel on considère qu'aucun chunk n'est
# vraiment pertinent, même si la requête SQL en a techniquement retourné.
# Valeur volontairement basse pour le MVP (peu de faux négatifs) ; à affiner
# une fois le benchmark retrieval du Sprint 7 en place.
MIN_RELEVANCE_SCORE = 0.05

NO_CONTEXT_MESSAGE = (
    "Je n'ai pas trouvé d'information pertinente dans les documents de cette "
    "knowledge base pour répondre à cette question."
)


def _load_history(db: Session, conversation_id: uuid.UUID) -> list[Message]:
    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )


def _citations_from_results(results) -> list[dict]:
    return [
        {
            "chunk_id": str(chunk.id),
            "document_id": str(document.id),
            "document_filename": document.filename,
            "page": chunk.page,
            "score": score,
            "excerpt": chunk.content[:280],
        }
        for chunk, document, score in results
    ]


def _get_or_create_conversation(
    db: Session, payload: ChatRequest, kb: KnowledgeBase, user: User
) -> Conversation:
    if payload.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.id == payload.conversation_id, Conversation.user_id == user.id)
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation

    conversation = Conversation(knowledge_base_id=kb.id, user_id=user.id, title=payload.message[:80])
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def _prepare_turn(
    db: Session, payload: ChatRequest, kb: KnowledgeBase, user: User
) -> tuple[Conversation, list[Message], ChatProvider, str, list]:
    """Tout ce qui est commun entre /chat (réponse bloquante) et /chat/stream
    (SSE) : récupération/création de la conversation, historique, persistance
    du message utilisateur, réécriture de requête, puis retrieval (vector,
    hybrid, ou expansion multi-requêtes, avec ou sans reranking).

    Retourne (conversation, historique, chat_provider, requête_autonome, résultats).
    `résultats` est déjà tronqué à payload.top_k — vide signifie "contexte
    insuffisant", à traiter identiquement par les deux endpoints appelants."""
    conversation = _get_or_create_conversation(db, payload, kb, user)
    history = _load_history(db, conversation.id)

    db.add(Message(conversation_id=conversation.id, role=MessageRole.USER, content=payload.message))
    db.commit()

    chat_provider = get_chat_provider()
    standalone_query = rewrite_query(chat_provider, history, payload.message)

    embedding_provider = get_embedding_provider()
    candidate_k = max(payload.top_k, 20) if (payload.rerank or payload.expand_query) else payload.top_k

    try:
        if payload.expand_query:
            queries = expand_query(chat_provider, standalone_query)
            query_embeddings = embedding_provider.embed(queries)
            results = multi_query_hybrid_search(
                db, knowledge_base_id=kb.id, queries=queries, query_embeddings=query_embeddings, top_k=candidate_k
            )
        elif payload.use_hybrid:
            query_embedding = embedding_provider.embed([standalone_query])[0]
            results = hybrid_search(
                db,
                knowledge_base_id=kb.id,
                query=standalone_query,
                query_embedding=query_embedding,
                top_k=candidate_k,
            )
            # Le score RRF fusionné ne vit pas sur la même échelle que le cosinus :
            # MIN_RELEVANCE_SCORE ne s'applique qu'en mode vectoriel pur. En
            # hybride/expansion, le filtrage par pertinence minimale a déjà eu
            # lieu AVANT la fusion (voir services/retrieval.py) — "aucun résultat"
            # reste donc un signal fiable de "contexte insuffisant".
        else:
            query_embedding = embedding_provider.embed([standalone_query])[0]
            results = search_chunks(db, knowledge_base_id=kb.id, query_embedding=query_embedding, top_k=candidate_k)
            results = [r for r in results if r[2] >= MIN_RELEVANCE_SCORE]
    except EmbeddingProviderError as exc:
        logger.warning("Échec du service d'embeddings (%s), repli automatique sur BM25.", exc)
        results = bm25_search(db, knowledge_base_id=kb.id, query=standalone_query, top_k=candidate_k)

    if payload.rerank and results:
        reranker = get_reranker(chat_provider)
        results = reranker.rerank(standalone_query, results)

    return conversation, history, chat_provider, standalone_query, results[: payload.top_k]


def _persist_assistant_message(db: Session, conversation: Conversation, answer: str, citations_payload: list[dict]) -> Message:
    assistant_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=answer,
        citations=json.dumps(citations_payload) if citations_payload else None,
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)
    return assistant_message


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
def chat(request: Request, payload: ChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    kb = get_owned_kb(db, payload.knowledge_base_id, user)
    conversation, history, chat_provider, standalone_query, results = _prepare_turn(db, payload, kb, user)

    if not results:
        # Refus déterministe : ne dépend pas du LLM pour respecter la consigne
        # de grounding — garanti même si le modèle est indisponible ou capricieux.
        answer_text = NO_CONTEXT_MESSAGE
        grounded = False
        citations_payload: list[dict] = []
    else:
        messages = build_chat_messages(payload.message, results, history)
        try:
            answer_text = chat_provider.generate(messages)
        except ChatProviderError as exc:
            raise HTTPException(status_code=502, detail=f"Échec de la génération : {exc}")
        grounded = True
        citations_payload = _citations_from_results(results)

    assistant_message = _persist_assistant_message(db, conversation, answer_text, citations_payload)

    return ChatResponse(
        conversation_id=conversation.id,
        message_id=assistant_message.id,
        answer=answer_text,
        citations=[CitationOut(**c) for c in citations_payload],
        grounded=grounded,
    )


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@router.post("/chat/stream")
@limiter.limit("20/minute")
def chat_stream(
    request: Request, payload: ChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    """Variante streaming de /chat, même logique de retrieval/grounding,
    réponse envoyée au format SSE (Server-Sent Events) plutôt qu'en un bloc.

    Événements émis (une ligne JSON par `data: ` SSE) :
    - {"type": "answer_chunk", "content": "..."} — un fragment de texte, au fil
      de la génération (ou un seul, pour le refus déterministe non groundé).
    - {"type": "done", "conversation_id", "message_id", "grounded", "citations"}
      — dernier événement, une fois le message assistant persisté en base.
    - {"type": "error", "message": "..."} — échec du service de génération ;
      aucun message assistant n'est persisté dans ce cas.

    Le calcul du retrieval et la décision "grounded" ont lieu AVANT de renvoyer
    le premier octet au client, exactement comme /chat — seule la génération
    elle-même est streamée."""
    kb = get_owned_kb(db, payload.knowledge_base_id, user)
    conversation, history, chat_provider, standalone_query, results = _prepare_turn(db, payload, kb, user)

    # Capture scalar values NOW, while the SQLAlchemy session is still open.
    # The event_stream generator runs *after* FastAPI closes the request-scoped
    # session; accessing ORM attributes on a detached Conversation object would
    # raise DetachedInstanceError.
    conversation_id_str = str(conversation.id)

    def event_stream():
        if not results:
            _persist_assistant_message(db, conversation, NO_CONTEXT_MESSAGE, [])
            yield _sse({"type": "answer_chunk", "content": NO_CONTEXT_MESSAGE})
            yield _sse(
                {
                    "type": "done",
                    "conversation_id": conversation_id_str,
                    "grounded": False,
                    "citations": [],
                }
            )
            return

        messages = build_chat_messages(payload.message, results, history)
        full_answer = ""
        try:
            for delta in chat_provider.generate_stream(messages):
                full_answer += delta
                yield _sse({"type": "answer_chunk", "content": delta})
        except ChatProviderError as exc:
            yield _sse({"type": "error", "message": f"Échec de la génération : {exc}"})
            return

        citations_payload = _citations_from_results(results)
        assistant_message = _persist_assistant_message(db, conversation, full_answer, citations_payload)
        yield _sse(
            {
                "type": "done",
                "conversation_id": conversation_id_str,
                "message_id": str(assistant_message.id),
                "grounded": True,
                "citations": citations_payload,
            }
        )

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
def get_conversation(
    conversation_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = _load_history(db, conversation.id)

    feedback_by_message = {
        f.message_id: f
        for f in db.query(MessageFeedback).filter(
            MessageFeedback.user_id == user.id,
            MessageFeedback.message_id.in_([m.id for m in messages]),
        )
    }

    return ConversationOut(
        id=conversation.id,
        knowledge_base_id=conversation.knowledge_base_id,
        title=conversation.title,
        created_at=conversation.created_at,
        messages=[
            MessageOut(
                id=m.id,
                role=m.role,
                content=m.content,
                citations=[CitationOut(**c) for c in json.loads(m.citations)] if m.citations else None,
                created_at=m.created_at,
                feedback=(
                    "up"
                    if (fb := feedback_by_message.get(m.id)) and fb.rating == FeedbackRating.UP
                    else "down"
                    if fb and fb.rating == FeedbackRating.DOWN
                    else None
                ),
            )
            for m in messages
        ],
    )


@router.get("/knowledge-bases/{kb_id}/conversations", response_model=list[ConversationSummaryOut])
def list_conversations(
    kb_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Endpoint ajouté au-delà de l'API indicative du cahier des charges : nécessaire
    pour qu'un frontend affiche une liste de conversations, pas seulement une seule."""
    kb = get_owned_kb(db, kb_id, user)
    return (
        db.query(Conversation)
        .filter(Conversation.knowledge_base_id == kb.id, Conversation.user_id == user.id)
        .order_by(Conversation.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée.")

    messages = db.query(Message).filter(Message.conversation_id == conversation.id).all()
    msg_ids = [m.id for m in messages]
    if msg_ids:
        db.query(MessageFeedback).filter(MessageFeedback.message_id.in_(msg_ids)).delete(synchronize_session=False)
        db.query(Message).filter(Message.id.in_(msg_ids)).delete(synchronize_session=False)

    db.delete(conversation)
    db.commit()
    return None
