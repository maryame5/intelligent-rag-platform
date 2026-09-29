import httpx
from prometheus_client import REGISTRY

from app.services.embeddings import OpenAIEmbeddingProvider
from app.services.generation import OpenAIChatProvider


def _get_counter_value(name: str, labels: dict) -> float:
    return REGISTRY.get_sample_value(name, labels) or 0.0


def test_embedding_success_increments_request_counter(monkeypatch):
    def fake_post(*args, **kwargs):
        request = httpx.Request("POST", "https://example.test/embeddings")
        return httpx.Response(
            200,
            json={"data": [{"embedding": [0.1, 0.2]}], "usage": {"prompt_tokens": 7}},
            request=request,
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    before = _get_counter_value(
        "embedding_requests_total", {"model": "test-model-metrics-a", "status": "success"}
    )

    provider = OpenAIEmbeddingProvider(
        api_key="key", model="test-model-metrics-a", base_url="https://example.test"
    )
    provider.embed(["texte"])

    after = _get_counter_value(
        "embedding_requests_total", {"model": "test-model-metrics-a", "status": "success"}
    )
    assert after == before + 1


def test_embedding_failure_increments_error_counter(monkeypatch):
    def always_fail(*args, **kwargs):
        raise httpx.ConnectError("échec simulé")

    monkeypatch.setattr(httpx, "post", always_fail)

    before = _get_counter_value(
        "embedding_requests_total", {"model": "test-model-metrics-b", "status": "error"}
    )

    provider = OpenAIEmbeddingProvider(
        api_key="key", model="test-model-metrics-b", base_url="https://example.test"
    )
    try:
        provider.embed(["texte"])
    except Exception:
        pass

    after = _get_counter_value(
        "embedding_requests_total", {"model": "test-model-metrics-b", "status": "error"}
    )
    assert after == before + 1


def test_chat_success_tracks_tokens_from_usage_field(monkeypatch):
    def fake_post(*args, **kwargs):
        request = httpx.Request("POST", "https://example.test/chat/completions")
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "réponse"}}],
                "usage": {"prompt_tokens": 12, "completion_tokens": 3},
            },
            request=request,
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    before = _get_counter_value("llm_tokens_total", {"model": "test-model-metrics-c", "direction": "input"})

    provider = OpenAIChatProvider(
        api_key="key", model="test-model-metrics-c", base_url="https://example.test"
    )
    provider.generate([{"role": "user", "content": "salut"}])

    after = _get_counter_value("llm_tokens_total", {"model": "test-model-metrics-c", "direction": "input"})
    assert after == before + 12
