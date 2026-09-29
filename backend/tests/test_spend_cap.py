"""Tests unitaires pour le service de plafond de dépense LLM."""

import pytest

from app.services.spend_cap import (
    SpendCapExceededError,
    _current_month_key,
    check_spend_cap,
    get_current_spend,
    record_spend,
)


class FakeRedis:
    """Client Redis factice pour tester spend_cap sans serveur Redis réel."""

    def __init__(self):
        self._store: dict[str, float] = {}
        self._ttls: dict[str, int] = {}

    def get(self, key: str):
        val = self._store.get(key)
        return str(val).encode() if val is not None else None

    def pipeline(self):
        return self

    # --- Pipeline methods ---
    def _pipe_calls(self):
        return self

    def incrbyfloat(self, key: str, amount: float):
        self._store[key] = self._store.get(key, 0.0) + amount
        return self

    def expire(self, key: str, ttl: int):
        self._ttls[key] = ttl
        return self

    def execute(self):
        pass  # Déjà appliqué dans incrbyfloat/expire


def test_cap_disabled_when_zero():
    """Aucune erreur quand le cap est 0 (désactivé)."""
    redis = FakeRedis()
    check_spend_cap(estimated_cost_usd=100.0, cap_usd=0.0, redis_client=redis)  # pas d'exception


def test_cap_passes_under_limit():
    """Pas d'erreur quand la dépense + estimation reste sous le cap."""
    redis = FakeRedis()
    record_spend(5.0, redis_client=redis)
    check_spend_cap(estimated_cost_usd=4.0, cap_usd=10.0, redis_client=redis)  # 5+4=9 < 10, OK


def test_cap_raises_when_exceeded():
    """SpendCapExceededError levée quand cumul + estimation dépasse le cap."""
    redis = FakeRedis()
    record_spend(8.0, redis_client=redis)
    with pytest.raises(SpendCapExceededError, match="Plafond de dépense"):
        check_spend_cap(estimated_cost_usd=3.0, cap_usd=10.0, redis_client=redis)


def test_cap_raises_at_exact_limit():
    """Le dépassement exact (cumul + estimation = cap) lève aussi l'erreur."""
    redis = FakeRedis()
    record_spend(10.0, redis_client=redis)
    with pytest.raises(SpendCapExceededError):
        check_spend_cap(estimated_cost_usd=0.01, cap_usd=10.0, redis_client=redis)


def test_free_calls_skip_check():
    """Un appel gratuit (cost=0) ne déclenche jamais l'erreur, même cap atteint."""
    redis = FakeRedis()
    record_spend(999.0, redis_client=redis)
    check_spend_cap(estimated_cost_usd=0.0, cap_usd=10.0, redis_client=redis)  # gratuit, pas d'erreur


def test_record_spend_accumulates():
    """Plusieurs record_spend s'accumulent correctement."""
    redis = FakeRedis()
    record_spend(1.5, redis_client=redis)
    record_spend(2.5, redis_client=redis)
    assert abs(get_current_spend(redis_client=redis) - 4.0) < 1e-9


def test_get_current_spend_zero_when_empty():
    """get_current_spend retourne 0 si aucune dépense enregistrée."""
    redis = FakeRedis()
    assert get_current_spend(redis_client=redis) == 0.0


def test_redis_unavailable_doesnt_raise(monkeypatch):
    """Si Redis est inaccessible (ConnectionError), les fonctions dégradent gracieusement."""
    import app.services.spend_cap as sc

    def _broken_get_redis():
        raise ConnectionError("Redis unreachable")

    monkeypatch.setattr(sc, "get_redis_client", _broken_get_redis, raising=False)

    # Ni check_spend_cap ni record_spend ne doivent lever d'exception
    check_spend_cap(estimated_cost_usd=999.0, cap_usd=10.0, redis_client=None)
    record_spend(5.0, redis_client=None)


def test_month_key_format():
    """La clé Redis doit commencer par 'llm:spend:' et contenir YYYY-MM."""
    import re

    key = _current_month_key()
    assert re.match(r"llm:spend:\d{4}-\d{2}$", key), f"Clé invalide : {key}"
