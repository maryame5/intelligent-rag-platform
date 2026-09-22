from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_worker_session():
    """Session DB pour du code exécuté hors du cycle requête HTTP (BackgroundTasks
    aujourd'hui, tâche Celery au Sprint 6). Fonction séparée de get_db pour rester
    facilement substituable dans les tests (monkeypatch) sans toucher au DI FastAPI."""
    return SessionLocal()
