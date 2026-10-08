import logging
from contextlib import contextmanager
from typing import Any, Callable

from app.core.config import settings

logger = logging.getLogger(__name__)

_langfuse_instance = None
_langfuse_initialized = False


def get_langfuse_client():
    """Retourne l'instance singleton de Langfuse si activée et configurée, sinon None."""
    global _langfuse_instance, _langfuse_initialized

    if _langfuse_initialized:
        return _langfuse_instance

    if not settings.langfuse_enabled or not settings.langfuse_public_key or not settings.langfuse_secret_key:
        _langfuse_instance = None
        _langfuse_initialized = True
        return None

    try:
        from langfuse import Langfuse

        _langfuse_instance = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            base_url=settings.langfuse_host,
            host=settings.langfuse_host,
        )
        logger.info("Langfuse client initialisé avec succès sur %s", settings.langfuse_host)
    except Exception as exc:
        logger.warning("Échec d'initialisation du client Langfuse (%s). Tracing désactivé.", exc)
        _langfuse_instance = None

    _langfuse_initialized = True
    return _langfuse_instance


def reset_langfuse_client() -> None:
    """Réinitialise l'état interne pour les tests."""
    global _langfuse_instance, _langfuse_initialized
    _langfuse_instance = None
    _langfuse_initialized = False


def flush_observability() -> None:
    """Vide le buffer d'événements Langfuse (crucial avant shutdown ou fin de tâche Celery)."""
    client = get_langfuse_client()
    if client is not None:
        try:
            client.flush()
        except Exception as exc:
            logger.debug("Erreur lors du flush Langfuse : %s", exc)


def shutdown_observability() -> None:
    """Ferme proprement le client Langfuse au shutdown de l'API / des workers."""
    client = get_langfuse_client()
    if client is not None:
        try:
            client.shutdown()
        except Exception as exc:
            logger.debug("Erreur lors du shutdown Langfuse : %s", exc)


def get_prompt_with_fallback(
    name: str, fallback: str, prompt_type: str = "text", cache_ttl_seconds: int = 300, **kwargs: Any
) -> str:
    """Récupère un prompt depuis Langfuse Prompt Management avec repli local instantané.

    Si Langfuse est désactivé, injoignable ou si le prompt n'existe pas encore,
    la chaîne `fallback` locale est retournée sans bloquer l'application.
    """
    client = get_langfuse_client()
    if client is None:
        return fallback

    try:
        prompt_obj = client.get_prompt(name=name, type=prompt_type, cache_ttl_seconds=cache_ttl_seconds, fallback=fallback)
        if hasattr(prompt_obj, "compile") and callable(prompt_obj.compile):
            return str(prompt_obj.compile(**kwargs))
        if hasattr(prompt_obj, "prompt"):
            return str(prompt_obj.prompt)
        return str(prompt_obj)
    except Exception as exc:
        logger.debug("Langfuse Prompt Management indisponible pour '%s' (%s), utilisation du fallback.", name, exc)
        return fallback


@contextmanager
def trace_rag_turn(
    trace_name: str = "rag_chat",
    user_id: str | None = None,
    session_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    tags: list[str] | None = None,
):
    """Context manager pour envelopper une requête RAG entière dans une trace OpenTelemetry Langfuse.

    Transmet user_id, session_id (conversation_id) et les métadonnées globales à tous les spans enfants.
    """
    client = get_langfuse_client()
    if client is None:
        yield None
        return

    try:
        from langfuse import propagate_attributes

        with propagate_attributes(
            trace_name=trace_name,
            user_id=user_id,
            session_id=session_id,
            metadata=metadata or {},
            tags=tags or ["rag"],
        ):
            yield client
    except Exception as exc:
        logger.debug("Erreur lors du traçage du tour RAG : %s", exc)
        yield None


def observe_step(
    name: str | None = None,
    as_type: str = "span",
    capture_input: bool = True,
    capture_output: bool = True,
) -> Callable:
    """Décorateur pour instrumenter une étape (retrieval, rerank, extraction, chunking, etc.).

    S'intègre nativement avec Langfuse v3/v4 ou s'exécute en no-op si Langfuse est inactif.
    """
    def decorator(func: Callable) -> Callable:
        if not settings.langfuse_enabled or not settings.langfuse_public_key:
            return func

        try:
            from langfuse import observe

            return observe(
                name=name or func.__name__,
                as_type=as_type,
                capture_input=capture_input,
                capture_output=capture_output,
            )(func)
        except Exception:
            return func

    return decorator


@contextmanager
def observe_span(
    name: str,
    as_type: str = "span",
    input_data: Any = None,
    metadata: dict[str, Any] | None = None,
    model: str | None = None,
    usage: dict[str, int] | None = None,
    cost: float | None = None,
):
    """Context manager pour créer un span ou une observation synchrone manuellement."""
    client = get_langfuse_client()
    if client is None:
        yield None
        return

    try:
        cost_details = {"total": cost} if cost is not None else None
        with client.start_as_current_observation(
            name=name,
            as_type=as_type,
            input=input_data,
            metadata=metadata or {},
            model=model,
            usage_details=usage,
            cost_details=cost_details,
        ) as observation:
            yield observation
    except Exception as exc:
        logger.debug("Erreur dans observe_span '%s' : %s", name, exc)
        yield None


def record_evaluation_score(
    name: str,
    value: float,
    trace_id: str | None = None,
    comment: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Envoie un score d'évaluation (ex: faithfulness, answer_relevance, recall_at_k) à Langfuse."""
    client = get_langfuse_client()
    if client is None:
        return

    try:
        if trace_id:
            client.create_score(
                trace_id=trace_id,
                name=name,
                value=float(value),
                comment=comment,
                metadata=metadata or {},
            )
        else:
            client.score_current_trace(
                name=name,
                value=float(value),
                comment=comment,
            )
    except Exception as exc:
        logger.debug("Échec de l'envoi du score Langfuse '%s' : %s", name, exc)
