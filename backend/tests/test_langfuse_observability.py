from unittest.mock import MagicMock, patch
import pytest

from app.core.config import settings
from app.core.observability import (
    flush_observability,
    get_langfuse_client,
    get_prompt_with_fallback,
    observe_span,
    observe_step,
    record_evaluation_score,
    reset_langfuse_client,
    shutdown_observability,
    trace_rag_turn,
)
from app.evaluation.llm_judge import get_answer_relevance_prompt, get_faithfulness_prompt
from app.services.prompt_builder import get_system_prompt
from app.services.query_expansion import get_query_expansion_prompt
from app.services.query_rewriting import get_query_rewrite_prompt
from app.services.reranking import get_rerank_prompt


@pytest.fixture(autouse=True)
def clean_observability():
    reset_langfuse_client()
    yield
    reset_langfuse_client()


def test_langfuse_disabled_returns_none():
    with patch.object(settings, "langfuse_enabled", False):
        reset_langfuse_client()
        client = get_langfuse_client()
        assert client is None


def test_prompt_fallback_when_disabled():
    with patch.object(settings, "langfuse_enabled", False):
        reset_langfuse_client()
        prompt = get_prompt_with_fallback("unknown_prompt", "Default fallback text")
        assert prompt == "Default fallback text"


def test_all_system_prompts_return_valid_fallbacks():
    with patch.object(settings, "langfuse_enabled", False):
        reset_langfuse_client()
        assert "assistant documentaire" in get_system_prompt()
        assert "reformulation" in get_query_rewrite_prompt()
        assert "reformulations alternatives" in get_query_expansion_prompt()
        assert "reranking" in get_rerank_prompt()
        assert "fidèle à son contexte" in get_faithfulness_prompt()
        assert "répond bien à la question" in get_answer_relevance_prompt()


def test_noop_contexts_when_disabled():
    with patch.object(settings, "langfuse_enabled", False):
        reset_langfuse_client()

        with trace_rag_turn(trace_name="test_trace", user_id="user1", session_id="sess1") as client:
            assert client is None

        with observe_span(name="test_span", as_type="span") as span:
            assert span is None

        # These must execute without error
        record_evaluation_score(name="faithfulness", value=0.95)
        flush_observability()
        shutdown_observability()


def test_observe_step_decorator_when_disabled():
    with patch.object(settings, "langfuse_enabled", False):
        @observe_step(name="sample_step")
        def add(a, b):
            return a + b

        assert add(2, 3) == 5


def test_langfuse_enabled_with_mocked_client():
    mock_client = MagicMock()
    mock_prompt = MagicMock()
    mock_prompt.compile.return_value = "Compiled prompt from Langfuse"
    mock_client.get_prompt.return_value = mock_prompt

    with patch.object(settings, "langfuse_enabled", True), \
         patch.object(settings, "langfuse_public_key", "pk-test"), \
         patch.object(settings, "langfuse_secret_key", "sk-test"), \
         patch("app.core.observability._langfuse_instance", mock_client), \
         patch("app.core.observability._langfuse_initialized", True):

        client = get_langfuse_client()
        assert client == mock_client

        prompt = get_prompt_with_fallback("rag_system_prompt", "Local fallback")
        assert prompt == "Compiled prompt from Langfuse"

        record_evaluation_score(name="accuracy", value=0.88, trace_id="trace-123")
        mock_client.create_score.assert_called_once_with(
            trace_id="trace-123",
            name="accuracy",
            value=0.88,
            comment=None,
            metadata={},
        )

        flush_observability()
        mock_client.flush.assert_called_once()

        shutdown_observability()
        mock_client.shutdown.assert_called_once()


def test_langfuse_graceful_fallback_on_client_error():
    mock_client = MagicMock()
    mock_client.get_prompt.side_effect = Exception("Connection timeout to Langfuse server")

    with patch.object(settings, "langfuse_enabled", True), \
         patch.object(settings, "langfuse_public_key", "pk-test"), \
         patch.object(settings, "langfuse_secret_key", "sk-test"), \
         patch("app.core.observability._langfuse_instance", mock_client), \
         patch("app.core.observability._langfuse_initialized", True):

        # When Langfuse fails, it must smoothly return the fallback without crashing
        prompt = get_prompt_with_fallback("rag_system_prompt", "Safe local fallback")
        assert prompt == "Safe local fallback"
