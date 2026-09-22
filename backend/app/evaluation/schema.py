from pydantic import BaseModel, Field


class EvaluationQuestion(BaseModel):
    id: str
    question: str
    expected_answer: str | None = None
    # Noms de fichiers attendus dans les sources retrouvées — sert de "vérité
    # terrain" pour Recall@K/Precision@K/MRR. Vide = pas de vérité terrain de
    # retrieval pour cette question (les métriques associées seront None, pas 0).
    expected_document_filenames: list[str] = Field(default_factory=list)
    notes: str | None = None


class EvaluationDataset(BaseModel):
    name: str
    version: str
    description: str | None = None
    questions: list[EvaluationQuestion]
