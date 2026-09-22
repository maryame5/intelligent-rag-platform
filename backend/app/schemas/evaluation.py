import uuid
from typing import Literal

from pydantic import BaseModel


class RunEvaluationRequest(BaseModel):
    knowledge_base_id: uuid.UUID
    dataset_name: str = "sample_benchmark_v1"
    top_k: int = 5
    mode: Literal["vector", "hybrid"] = "vector"
    rerank: bool = False
    run_generation: bool = True


class QuestionResultOut(BaseModel):
    question_id: str
    retrieved_filenames: list[str]
    recall_at_k: float | None
    precision_at_k: float | None
    reciprocal_rank: float
    latency_ms: float
    answer: str
    faithfulness: float | None
    answer_relevance: float | None
    grounded: bool
    error: str | None

    class Config:
        from_attributes = True  # les résultats viennent d'un dataclass, pas d'un dict


class RunEvaluationResponse(BaseModel):
    dataset_name: str
    dataset_version: str
    knowledge_base_id: str
    mode: str
    rerank: bool
    top_k: int
    run_generation: bool
    total_questions: int
    errors: int
    mean_recall_at_k: float | None
    mean_precision_at_k: float | None
    mrr: float
    mean_faithfulness: float | None
    mean_answer_relevance: float | None
    mean_latency_ms: float
    p95_latency_ms: float
    error_rate: float
    results: list[QuestionResultOut]
