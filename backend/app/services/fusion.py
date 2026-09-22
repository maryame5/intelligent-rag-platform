from app.models.chunk import Chunk
from app.models.document import Document


def reciprocal_rank_fusion(
    result_lists: list[list[tuple[Chunk, Document, float]]],
    k: int = 60,
) -> list[tuple[Chunk, Document, float]]:
    """Fusionne plusieurs classements de nature différente (similarité cosinus,
    score BM25...) sans avoir à normaliser des échelles de score incompatibles
    entre elles. Chaque chunk reçoit 1/(k+rang) par liste où il apparaît ; les
    scores se cumulent. k=60 est la valeur usuelle de la littérature RRF (TREC).
    """
    fused_scores: dict[str, float] = {}
    payload: dict[str, tuple[Chunk, Document]] = {}

    for results in result_lists:
        for rank, (chunk, document, _score) in enumerate(results, start=1):
            key = str(chunk.id)
            fused_scores[key] = fused_scores.get(key, 0.0) + 1.0 / (k + rank)
            payload[key] = (chunk, document)

    ranked_keys = sorted(fused_scores.keys(), key=lambda key: fused_scores[key], reverse=True)
    return [(payload[key][0], payload[key][1], fused_scores[key]) for key in ranked_keys]
