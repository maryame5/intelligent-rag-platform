import logging
import time

from app.core.config import settings
from app.core.metrics import INGESTION_DURATION_SECONDS
from app.db.session import get_worker_session
from app.models.chunk import Chunk
from app.models.document import Document, DocumentStatus
from app.models.job import IngestionJob, JobStatus
from app.services.bm25_search import invalidate_bm25_cache
from app.services.chunking import fixed_size_chunks
from app.services.cleaning import clean_text
from app.services.embeddings import get_embedding_provider
from app.services.extraction import extract_pages
from app.services.storage import download_bytes, get_minio_client

logger = logging.getLogger(__name__)


def run_ingestion(document_id: str, job_id: str) -> None:
    """Traite un document de bout en bout : Storage -> Extraction -> Cleaning ->
    Chunking -> persistance des chunks -> statut READY/FAILED.

    Exécuté aujourd'hui via une tâche Celery (voir app/tasks/ingestion_task.py).
    L'interface (prend des IDs, ouvre sa propre session, ne dépend pas de la
    requête HTTP) reste indépendante de Celery : cette fonction est testée
    directement, sans jamais dépendre d'un broker ou d'un worker réel.
    """
    start = time.perf_counter()
    db = get_worker_session()
    try:
        job = db.get(IngestionJob, job_id)
        document = db.get(Document, document_id)
        if job is None or document is None:
            return

        job.status = JobStatus.RUNNING
        db.commit()

        client = get_minio_client()
        raw_bytes = download_bytes(client, settings.minio_bucket, document.storage_path)

        pages = extract_pages(raw_bytes, document.mime_type)
        cleaned_blocks = [
            (page_number, section, clean_text(text)) for page_number, section, text in pages
        ]

        chunk_results = fixed_size_chunks(cleaned_blocks)
        if not chunk_results:
            raise ValueError("Aucun texte exploitable n'a été extrait du document.")

        # Embeddings calculés en un seul appel batché (plus efficace qu'un appel par chunk).
        provider = get_embedding_provider()
        vectors = provider.embed([result.content for result in chunk_results])

        embedding_model_name = (
            settings.local_embedding_model
            if settings.embedding_provider_type.lower() == "local"
            else settings.embedding_model
        )
        for result, vector in zip(chunk_results, vectors):
            db.add(
                Chunk(
                    document_id=document.id,
                    chunk_index=result.chunk_index,
                    content=result.content,
                    page=result.page,
                    section=result.section,
                    embedding=vector,  # list[float] → pgvector sérialise nativement
                    embedding_model=embedding_model_name,
                )
            )

        document.status = DocumentStatus.READY
        job.status = JobStatus.SUCCESS
        db.commit()

        # Nouveaux chunks pour cette KB : l'index BM25 en cache (voir
        # app/services/bm25_search.py) doit être reconstruit au prochain
        # appel, pas continuer à servir l'ancien corpus.
        invalidate_bm25_cache(document.knowledge_base_id)

    except Exception as exc:  # pipeline volontairement permissif : on trace l'échec, on ne le propage pas
        logger.error(
            "Échec de l'ingestion du document %s (job %s) : %s",
            document_id,
            job_id,
            exc,
            exc_info=True,
        )
        db.rollback()
        job = db.get(IngestionJob, job_id)
        document = db.get(Document, document_id)
        if job is not None:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)[:500]
        if document is not None:
            document.status = DocumentStatus.FAILED
        db.commit()

    finally:
        INGESTION_DURATION_SECONDS.observe(time.perf_counter() - start)
        db.close()
