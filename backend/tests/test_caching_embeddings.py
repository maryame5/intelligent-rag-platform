from app.services.embeddings import CachingEmbeddingProvider


class _FakeRedisClient:
    """Faux client Redis en mémoire (dict), suffisant pour tester get/setex
    sans dépendre d'un vrai serveur Redis."""

    def __init__(self):
        self.store: dict[str, str] = {}

    def get(self, key):
        return self.store.get(key)

    def setex(self, key, ttl, value):
        self.store[key] = value


class _CountingEmbeddingProvider:
    def __init__(self, vector=(0.1, 0.2, 0.3)):
        self.vector = list(vector)
        self.call_count = 0
        self.last_texts: list[str] | None = None

    def embed(self, texts):
        self.call_count += 1
        self.last_texts = list(texts)
        return [self.vector for _ in texts]


def test_cache_miss_calls_inner_provider_and_stores_result():
    inner = _CountingEmbeddingProvider()
    redis_client = _FakeRedisClient()
    provider = CachingEmbeddingProvider(inner, model="test-model", redis_client=redis_client)

    result = provider.embed(["bonjour le monde"])

    assert result == [[0.1, 0.2, 0.3]]
    assert inner.call_count == 1
    assert len(redis_client.store) == 1


def test_cache_hit_skips_inner_provider_entirely():
    inner = _CountingEmbeddingProvider()
    redis_client = _FakeRedisClient()
    provider = CachingEmbeddingProvider(inner, model="test-model", redis_client=redis_client)

    provider.embed(["bonjour le monde"])  # 1er appel : cache miss
    result = provider.embed(["bonjour le monde"])  # 2e appel : doit être un cache hit

    assert result == [[0.1, 0.2, 0.3]]
    assert inner.call_count == 1  # toujours 1, pas 2 : le 2e appel n'a pas touché l'inner


def test_different_models_do_not_share_cache_entries():
    inner = _CountingEmbeddingProvider()
    redis_client = _FakeRedisClient()

    provider_a = CachingEmbeddingProvider(inner, model="model-a", redis_client=redis_client)
    provider_b = CachingEmbeddingProvider(inner, model="model-b", redis_client=redis_client)

    provider_a.embed(["même texte"])
    provider_b.embed(["même texte"])

    assert inner.call_count == 2  # deux modèles différents = deux calculs, pas un cache partagé


def test_partial_cache_hit_only_fetches_missing_texts():
    inner = _CountingEmbeddingProvider()
    redis_client = _FakeRedisClient()
    provider = CachingEmbeddingProvider(inner, model="test-model", redis_client=redis_client)

    provider.embed(["texte A"])  # mise en cache de "texte A" uniquement
    provider.embed(["texte A", "texte B"])  # "texte A" en cache, "texte B" pas encore

    assert inner.call_count == 2
    assert inner.last_texts == ["texte B"]  # seul le texte manquant est renvoyé à l'inner


def test_redis_unavailable_degrades_to_no_cache_instead_of_crashing():
    class _BrokenRedisClient:
        def get(self, key):
            raise ConnectionError("redis indisponible (simulé)")

        def setex(self, key, ttl, value):
            raise ConnectionError("redis indisponible (simulé)")

    inner = _CountingEmbeddingProvider()
    provider = CachingEmbeddingProvider(inner, model="test-model", redis_client=_BrokenRedisClient())

    result = provider.embed(["bonjour"])

    assert result == [[0.1, 0.2, 0.3]]  # ça fonctionne toujours, juste sans cache
    assert inner.call_count == 1
