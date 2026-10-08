import json
from pathlib import Path

from app.evaluation.schema import EvaluationDataset

# Tous les datasets vivent ici, versionnés par nom de fichier (ex. v1, v2...) et
# suivis par git comme n'importe quel fichier de code — "versionner les
# datasets" (§6 du cahier des charges) au sens le plus simple qui marche.
# Multiple candidate locations for datasets (local dev, docker container, repo root)
POSSIBLE_DIRS = [
    Path(__file__).resolve().parent.parent.parent / "eval" / "datasets",
    Path("/app/eval/datasets"),
    Path(__file__).resolve().parent / "datasets",
]

DEFAULT_BENCHMARK = {
    "name": "sample_benchmark_v1",
    "version": "1.0.0",
    "description": "Dataset de référence pour l'évaluation de la qualité RAG (Recall@K, Precision@K, MRR, Faithfulness, Relevance).",
    "questions": [
        {
            "id": "q1",
            "question": "Quelles sont les conditions et procédures requises ?",
            "expected_answer": "Les conditions et procédures dépendent des règles documentaires en vigueur.",
            "expected_document_filenames": [],
            "notes": "Question générale testant la fidélité de réponse et le rappel contextuel.",
        },
        {
            "id": "q2",
            "question": "Quelles sont les obligations légales et délais applicables ?",
            "expected_answer": "Les délais et obligations sont détaillés dans les textes et directives de référence.",
            "expected_document_filenames": [],
            "notes": "Évaluation de la précision de recherche sémantique.",
        },
        {
            "id": "q3",
            "question": "Comment s'effectue la mise en œuvre de la rupture ou convention ?",
            "expected_answer": "La convention nécessite un accord mutuel et le respect des formalités administratives.",
            "expected_document_filenames": [],
            "notes": "Vérification des citations documentaires et des liens officiels.",
        },
    ],
}


class DatasetNotFoundError(Exception):
    pass


def load_dataset(dataset_name: str) -> EvaluationDataset:
    """Charge un dataset par son nom (sans extension, ex. 'sample_benchmark_v1')."""
    safe_name = Path(dataset_name).stem

    for base_dir in POSSIBLE_DIRS:
        path = (base_dir / f"{safe_name}.json").resolve()
        if path.exists():
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            return EvaluationDataset.model_validate(data)

    if safe_name == "sample_benchmark_v1":
        return EvaluationDataset.model_validate(DEFAULT_BENCHMARK)

    raise DatasetNotFoundError(f"Dataset introuvable : {dataset_name}")
