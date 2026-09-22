import uuid
from typing import Literal

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=50)
    document_id: uuid.UUID | None = None
    mode: Literal["vector", "hybrid"] = "vector"
    rerank: bool = False
    expand_query: bool = False


class SearchResultItem(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_filename: str
    page: int | None
    chunk_index: int
    content: str
    score: float
    rank: int
