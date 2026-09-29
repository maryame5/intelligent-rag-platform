import httpx
import pytest

from app.services.embeddings import EmbeddingProviderError, OpenAIEmbeddingProvider
from app.services.generation import ChatProviderError, OpenAIChatProvider


class _FlakyThenSuccessTransport:
    """Simule un service qui échoue N fois puis répond correctement — pour
    vérifier que le retry avec backoff finit par réussir sans intervention."""

    def __init__(self, fail_times: int):
        self.fail_times = fail_times
        self.call_count = 0

    def __call__(self, *args, **kwargs):
        self.call_count += 1
        if self.call_count <= self.fail_times:
            raise httpx.ConnectError("connexion refusée (simulée)")
        return self._success_response()

    def _success_response(self):
        raise NotImplementedError


class _FlakyEmbeddingTransport(_FlakyThenSuccessTransport):
    def _success_response(self):
        request = httpx.Request("POST", "https://example.test/embeddings")
        return httpx.Response(200, json={"data": [{"embedding": [0.1, 0.2]}]}, request=request)


class _FlakyChatTransport(_FlakyThenSuccessTransport):
    def _success_response(self):
        request = httpx.Request("POST", "https://example.test/chat/completions")
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]}, request=request)


class _AlwaysFailingTransport:
    def __call__(self, *args, **kwargs):
        raise httpx.ConnectError("connexion refusée (simulée, permanente)")


def test_embedding_retry_succeeds_after_transient_failures(monkeypatch):
    transport = _FlakyEmbeddingTransport(fail_times=2)
    monkeypatch.setattr(httpx, "post", transport)

    provider = OpenAIEmbeddingProvider(
        api_key="test-key", model="test-model", base_url="https://example.test"
    )
    result = provider.embed(["bonjour"])

    assert result == [[0.1, 0.2]]
    assert transport.call_count == 3  # 2 échecs + 1 succès


def test_embedding_retry_gives_up_after_max_attempts(monkeypatch):
    transport = _AlwaysFailingTransport()
    monkeypatch.setattr(httpx, "post", transport)

    provider = OpenAIEmbeddingProvider(
        api_key="test-key", model="test-model", base_url="https://example.test"
    )
    with pytest.raises(EmbeddingProviderError):
        provider.embed(["bonjour"])


def test_chat_retry_succeeds_after_transient_failures(monkeypatch):
    transport = _FlakyChatTransport(fail_times=1)
    monkeypatch.setattr(httpx, "post", transport)

    provider = OpenAIChatProvider(api_key="test-key", model="test-model", base_url="https://example.test")
    result = provider.generate([{"role": "user", "content": "salut"}])

    assert result == "ok"
    assert transport.call_count == 2


def test_chat_retry_gives_up_after_max_attempts(monkeypatch):
    transport = _AlwaysFailingTransport()
    monkeypatch.setattr(httpx, "post", transport)

    provider = OpenAIChatProvider(api_key="test-key", model="test-model", base_url="https://example.test")
    with pytest.raises(ChatProviderError):
        provider.generate([{"role": "user", "content": "salut"}])


def test_missing_api_key_fails_immediately_without_retry(monkeypatch):
    """Une clé manquante est une erreur de configuration, pas transitoire :
    ne doit jamais déclencher de retry ni même d'appel HTTP."""
    call_count = {"n": 0}

    def _should_not_be_called(*args, **kwargs):
        call_count["n"] += 1
        raise AssertionError("httpx.post n'aurait jamais dû être appelé")

    monkeypatch.setattr(httpx, "post", _should_not_be_called)

    provider = OpenAIEmbeddingProvider(api_key="", model="test-model", base_url="https://example.test")
    with pytest.raises(EmbeddingProviderError):
        provider.embed(["bonjour"])

    assert call_count["n"] == 0


def test_embedding_batches_large_input_lists(monkeypatch):
    """Vérifie que les listes de textes dépassant MAX_EMBEDDING_BATCH_SIZE (32)
    sont bien découpées en plusieurs requêtes HTTP (<= 32 par requête)."""
    recorded_batches = []

    def _mock_post(url, headers=None, json=None, timeout=None):
        recorded_batches.append(json["input"])
        return httpx.Response(
            status_code=200,
            json={
                "object": "list",
                "data": [{"object": "embedding", "embedding": [0.1, 0.2]} for _ in json["input"]],
                "usage": {"prompt_tokens": len(json["input"]) * 5},
            },
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx, "post", _mock_post)

    provider = OpenAIEmbeddingProvider(
        api_key="test-key", model="test-model", base_url="https://example.test"
    )
    texts = [f"chunk {i}" for i in range(100)]  # 100 > 32
    result = provider.embed(texts)

    assert len(result) == 100
    assert len(recorded_batches) == 4  # 32 + 32 + 32 + 4
    assert len(recorded_batches[0]) == 32
    assert len(recorded_batches[1]) == 32
    assert len(recorded_batches[2]) == 32
    assert len(recorded_batches[3]) == 4
