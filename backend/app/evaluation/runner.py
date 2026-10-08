import time
import uuid
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.core.metrics import RAG_FAITHFULNESS_SCORE
from app.core.observability import flush_observability, record_evaluation_score
from app.evaluation import metrics
from app.evaluation.llm_judge import score_answer_relevance, score_faithfulness
from app.evaluation.schema import EvaluationDataset
from app.services.embeddings import get_embedding_provider
from app.services.generation import get_chat_provider
from app.services.prompt_builder import build_chat_messages, build_context_block
from app.services.reranking import get_reranker
from app.services.retrieval import hybrid_search, search_chunks


@dataclass
class QuestionResult:
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
    error: str | None = None


@dataclass
class EvaluationSummary:
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
    results: list[QuestionResult] = field(default_factory=list)


def _evaluate_single_question(
    db: Session,
    knowledge_base_id: uuid.UUID,
    question,
    top_k: int,
    mode: str,
    rerank: bool,
    run_generation: bool,
    embedding_provider,
    chat_provider,
    reranker,
) -> QuestionResult:
    start = time.perf_counter()

    query_embedding = embedding_provider.embed([question.question])[0]

    if mode == "hybrid":
        retrieved = hybrid_search(
            db,
            knowledge_base_id=knowledge_base_id,
            query=question.question,
            query_embedding=query_embedding,
            top_k=top_k,
        )
    else:
        retrieved = search_chunks(
            db, knowledge_base_id=knowledge_base_id, query_embedding=query_embedding, top_k=top_k
        )

    if rerank and reranker is not None and retrieved:
        retrieved = reranker.rerank(question.question, retrieved)[:top_k]

    retrieved_filenames = [document.filename for _chunk, document, _score in retrieved]
    relevant = set(question.expected_document_filenames)

    recall = metrics.recall_at_k(retrieved_filenames, relevant, top_k)
    precision = metrics.precision_at_k(retrieved_filenames, relevant, top_k)
    rr = metrics.reciprocal_rank(retrieved_filenames, relevant)

    answer = ""
    faithfulness = None
    answer_relevance = None

    if run_generation and chat_provider is not None and retrieved:
        chat_messages = build_chat_messages(question.question, retrieved, history=[])
        answer = chat_provider.generate(chat_messages)
        context_text = build_context_block(retrieved)
        faithfulness = score_faithfulness(chat_provider, context_text, answer)
        answer_relevance = score_answer_relevance(chat_provider, question.question, answer)
        if faithfulness is not None:
            RAG_FAITHFULNESS_SCORE.observe(faithfulness)

    latency_ms = (time.perf_counter() - start) * 1000

    # Envoi des scores vers Langfuse pour observabilité et suivi des benchmarks
    if faithfulness is not None:
        record_evaluation_score(name="faithfulness", value=faithfulness)
    if answer_relevance is not None:
        record_evaluation_score(name="answer_relevance", value=answer_relevance)
    if recall is not None:
        record_evaluation_score(name="recall_at_k", value=recall)
    if precision is not None:
        record_evaluation_score(name="precision_at_k", value=precision)
    record_evaluation_score(name="reciprocal_rank", value=rr)

    return QuestionResult(
        question_id=question.id,
        retrieved_filenames=retrieved_filenames,
        recall_at_k=recall,
        precision_at_k=precision,
        reciprocal_rank=rr,
        latency_ms=latency_ms,
        answer=answer,
        faithfulness=faithfulness,
        answer_relevance=answer_relevance,
        grounded=bool(retrieved),
    )


def run_evaluation(
    db: Session,
    knowledge_base_id: uuid.UUID,
    dataset: EvaluationDataset,
    top_k: int = 5,
    mode: str = "vector",
    rerank: bool = False,
    run_generation: bool = True,
) -> EvaluationSummary:
    """Exécute un dataset de benchmark contre une knowledge base réelle et calcule
    les métriques retrieval (Recall@K, Precision@K, MRR) et generation
    (faithfulness, answer relevance) définies au §9 du cahier des charges.

    Conçu pour comparer des configurations entre elles (mode vector vs hybrid,
    reranker on/off, top_k différents) sur le MÊME dataset — c'est la
    comparaison qui a de la valeur, pas un score isolé sans référence."""
    embedding_provider = get_embedding_provider()
    chat_provider = get_chat_provider() if run_generation else None
    reranker = get_reranker(chat_provider) if (rerank and chat_provider is not None) else None

    question_results: list[QuestionResult] = []
    error_count = 0

    for question in dataset.questions:
        try:
            result = _evaluate_single_question(
                db,
                knowledge_base_id,
                question,
                top_k,
                mode,
                rerank,
                run_generation,
                embedding_provider,
                chat_provider,
                reranker,
            )
            question_results.append(result)
        except Exception as exc:
            error_count += 1
            question_results.append(
                QuestionResult(
                    question_id=question.id,
                    retrieved_filenames=[],
                    recall_at_k=None,
                    precision_at_k=None,
                    reciprocal_rank=0.0,
                    latency_ms=0.0,
                    answer="",
                    faithfulness=None,
                    answer_relevance=None,
                    grounded=False,
                    error=str(exc)[:500],
                )
            )

    total = len(dataset.questions)
    latencies = [r.latency_ms for r in question_results if r.error is None]

    flush_observability()

    return EvaluationSummary(
        dataset_name=dataset.name,
        dataset_version=dataset.version,
        knowledge_base_id=str(knowledge_base_id),
        mode=mode,
        rerank=rerank,
        top_k=top_k,
        run_generation=run_generation,
        total_questions=total,
        errors=error_count,
        mean_recall_at_k=metrics.mean_ignoring_none([r.recall_at_k for r in question_results]),
        mean_precision_at_k=metrics.mean_ignoring_none([r.precision_at_k for r in question_results]),
        mrr=metrics.mean_ignoring_none([r.reciprocal_rank for r in question_results]) or 0.0,
        mean_faithfulness=metrics.mean_ignoring_none([r.faithfulness for r in question_results]),
        mean_answer_relevance=metrics.mean_ignoring_none([r.answer_relevance for r in question_results]),
        mean_latency_ms=(sum(latencies) / len(latencies)) if latencies else 0.0,
        p95_latency_ms=metrics.percentile(latencies, 95),
        error_rate=(error_count / total) if total else 0.0,
        results=question_results,
    )
