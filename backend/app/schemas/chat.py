import uuid

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    knowledge_base_id: uuid.UUID
    conversation_id: uuid.UUID | None = None
    message: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    use_hybrid: bool = True  # BM25 + vectoriel fusionnés (RRF) : gratuit, pas d'appel LLM
    rerank: bool = False  # reranking LLM : coûte un appel supplémentaire, désactivé par défaut
    expand_query: bool = False  # reformulations LLM avant recherche : coûte un appel supplémentaire


class CitationOut(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_filename: str
    page: int | None
    score: float
    excerpt: str


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    answer: str
    citations: list[CitationOut]
    grounded: bool  # False si aucune source pertinente trouvée -> réponse de refus déterministe
