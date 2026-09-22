from app.tasks.ingestion_task import run_ingestion_task
from app.worker import celery_app


def test_celery_is_configured_in_eager_mode_for_tests():
    """Si ce test échoue, tous les tests d'ingestion qui dépendent de
    l'exécution synchrone de la tâche (via .delay()) deviendront non fiables —
    autant le vérifier explicitement plutôt que de le supposer silencieusement."""
    assert celery_app.conf.task_always_eager is True
    assert celery_app.conf.task_eager_propagates is True


def test_ingestion_task_is_registered_with_expected_name():
    assert run_ingestion_task.name == "ingestion.run_ingestion"
    assert "ingestion.run_ingestion" in celery_app.tasks
