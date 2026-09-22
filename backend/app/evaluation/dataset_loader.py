import json
from pathlib import Path

from app.evaluation.schema import EvaluationDataset

# Tous les datasets vivent ici, versionnés par nom de fichier (ex. v1, v2...) et
# suivis par git comme n'importe quel fichier de code — "versionner les
# datasets" (§6 du cahier des charges) au sens le plus simple qui marche.
DATASETS_DIR = Path(__file__).resolve().parent.parent.parent / "eval" / "datasets"


class DatasetNotFoundError(Exception):
    pass


def load_dataset(dataset_name: str) -> EvaluationDataset:
    """Charge un dataset par son nom (sans extension, ex. 'sample_benchmark_v1').
    Prend volontairement un NOM et pas un chemin arbitraire : même appelé
    uniquement depuis un endpoint admin, accepter un chemin de fichier libre
    ouvrirait une traversée de répertoire inutile pour un gain nul."""
    safe_name = Path(dataset_name).name  # neutralise tout "../" éventuel
    path = (DATASETS_DIR / f"{safe_name}.json").resolve()

    if DATASETS_DIR.resolve() not in path.parents:
        raise DatasetNotFoundError(f"Dataset invalide : {dataset_name}")

    if not path.exists():
        raise DatasetNotFoundError(f"Dataset introuvable : {dataset_name}")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    return EvaluationDataset.model_validate(data)
