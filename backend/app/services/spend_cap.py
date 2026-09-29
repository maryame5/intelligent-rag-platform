"""Plafond de dépense LLM configurable.

Logique :
- Le cumul des coûts USD est stocké dans Redis sous la clé `llm:spend:YYYY-MM`
  (réinitialisation automatique chaque mois, sans cron ni tâche planifiée).
- Avant chaque appel LLM (génération ou embedding payant), on vérifie que le
  cumul mensuel reste sous `LLM_MONTHLY_SPEND_CAP_USD`.
- Si la clé Redis est absente ou inaccessible, on laisse passer (dégradation
  gracieuse : mieux vaut un appel LLM de trop que bloquer le service).
- Si `LLM_MONTHLY_SPEND_CAP_USD=0` (valeur par défaut), le cap est désactivé.

Usage :
    from app.services.spend_cap import check_spend_cap, record_spend

    check_spend_cap(estimated_cost_usd)  # lève SpendCapExceededError si dépassé
    record_spend(actual_cost_usd)        # incrémente le cumul après l'appel
"""

import datetime
import logging

logger = logging.getLogger(__name__)

try:
    from app.services.cache import get_redis_client
except Exception:
    get_redis_client = None  # type: ignore[assignment]

# Clé Redis pour le cumul mensuel
_REDIS_KEY_PREFIX = "llm:spend"
# TTL : 35 jours — la clé survivra toujours un mois complet
_REDIS_TTL_SECONDS = 35 * 24 * 3600


class SpendCapExceededError(Exception):
    """Levée quand le plafond de dépense mensuel LLM est atteint.

    Hérite d'Exception (pas RuntimeError) pour permettre un catch sélectif
    aux points d'appel sans attraper d'autres erreurs système.
    """


def _current_month_key() -> str:
    """Clé Redis du mois courant, ex. 'llm:spend:2026-09'."""
    now = datetime.datetime.now(datetime.timezone.utc)
    return f"{_REDIS_KEY_PREFIX}:{now.strftime('%Y-%m')}"


def get_current_spend(redis_client=None) -> float:
    """Retourne le cumul de dépense LLM du mois courant en USD.
    Retourne 0.0 si Redis est inaccessible ou la clé absente.
    """
    if redis_client is None:
        if get_redis_client is None:
            return 0.0
        try:
            redis_client = get_redis_client()
        except Exception:
            return 0.0
    try:
        raw = redis_client.get(_current_month_key())
        return float(raw) if raw else 0.0
    except Exception:
        return 0.0


def check_spend_cap(estimated_cost_usd: float, cap_usd: float, redis_client=None) -> None:
    """Vérifie que le cumul mensuel + coût estimé ne dépasse pas le plafond.

    Args:
        estimated_cost_usd: Coût estimé de l'appel à venir (peut être 0 pour
            les modèles gratuits — la vérification est alors immédiatement no-op).
        cap_usd: Plafond mensuel en USD (0 = désactivé).
        redis_client: Client Redis injecté (None = résolution automatique).

    Raises:
        SpendCapExceededError: Si le cumul mensuel + coût estimé dépasse le cap.
    """
    if cap_usd <= 0:
        return  # Cap désactivé
    if estimated_cost_usd <= 0:
        return  # Appel gratuit, pas de vérification nécessaire

    if redis_client is None:
        if get_redis_client is None:
            return  # Redis non configuré, dégradation gracieuse
        try:
            redis_client = get_redis_client()
        except Exception:
            return  # Redis inaccessible, dégradation gracieuse

    try:
        raw = redis_client.get(_current_month_key())
        current = float(raw) if raw else 0.0
    except Exception:
        # Redis inaccessible en lecture, dégradation gracieuse
        return

    if current + estimated_cost_usd > cap_usd:
        raise SpendCapExceededError(
            f"Plafond de dépense LLM mensuel atteint : {current:.4f} USD dépensés "
            f"sur {cap_usd:.2f} USD autorisés ce mois-ci. "
            f"Augmentez LLM_MONTHLY_SPEND_CAP_USD ou attendez le mois prochain."
        )


def record_spend(cost_usd: float, redis_client=None) -> None:
    """Incrémente le cumul de dépense mensuel de `cost_usd` dans Redis.

    Si Redis est inaccessible, on logue un WARNING et on continue —
    mieux vaut perdre un comptage que bloquer le service.
    """
    if cost_usd <= 0:
        return

    if redis_client is None:
        if get_redis_client is None:
            return
        try:
            redis_client = get_redis_client()
        except Exception as exc:
            logger.warning(
                "spend_cap: impossible d'accéder à Redis pour enregistrer %.6f USD : %s", cost_usd, exc
            )
            return

    key = _current_month_key()
    try:
        pipe = redis_client.pipeline()
        pipe.incrbyfloat(key, cost_usd)
        pipe.expire(key, _REDIS_TTL_SECONDS)
        pipe.execute()
    except Exception as exc:
        logger.warning("spend_cap: échec de l'enregistrement de %.6f USD : %s", cost_usd, exc)
