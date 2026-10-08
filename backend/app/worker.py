from celery import Celery
from celery.signals import worker_shutdown

from app.core.config import settings
from app.core.observability import flush_observability, shutdown_observability

celery_app = Celery(
    "rag_platform",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.ingestion_task",
        "app.tasks.email_task",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.on_after_configure.connect
def setup_observability_signals(sender, **kwargs):
    pass


@worker_shutdown.connect
def on_worker_shutdown(**kwargs):
    flush_observability()
    shutdown_observability()
