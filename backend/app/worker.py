from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "rag_platform",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.ingestion_task"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
