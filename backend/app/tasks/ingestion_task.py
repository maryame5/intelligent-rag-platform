from app.services.ingestion import run_ingestion
from app.worker import celery_app


@celery_app.task(name="ingestion.run_ingestion")
def run_ingestion_task(document_id: str, job_id: str) -> None:
    """Wrapper Celery autour de `run_ingestion()`. Volontairement mince : toute
    la logique métier (extraction, nettoyage, chunking, embeddings, retries sur
    les appels externes) vit dans `app/services/ingestion.py` et ses propres
    tests — sans dépendre de Celery. Ce fichier ne fait que la brancher sur la
    file d'attente asynchrone.

    Retries : gérés à l'intérieur de `run_ingestion()`, au niveau de chaque
    appel externe transitoire (embedding, MinIO) — pas ici, au niveau de la
    tâche entière. `run_ingestion()` avale déjà ses exceptions pour marquer le
    document/job en FAILED plutôt que de planter ; laisser Celery retenter la
    tâche complète referait tout le pipeline depuis le début à chaque échec,
    ce qui n'est pas ce qu'on veut pour une erreur définitive (ex. PDF corrompu).
    """
    run_ingestion(document_id, job_id)
