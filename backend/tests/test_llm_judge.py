from app.evaluation.llm_judge import score_answer_relevance, score_faithfulness
from app.services.generation import ChatProviderError


class _ScriptedProvider:
    def __init__(self, response: str):
        self.response = response

    def generate(self, messages):
        return self.response


class _FailingProvider:
    def generate(self, messages):
        raise ChatProviderError("boom")


def test_score_faithfulness_parses_decimal_score():
    provider = _ScriptedProvider("0.8")
    assert score_faithfulness(provider, "contexte", "réponse") == 0.8


def test_score_faithfulness_clamps_out_of_range_values():
    provider = _ScriptedProvider("1.5")
    assert score_faithfulness(provider, "contexte", "réponse") == 1.0


def test_score_faithfulness_returns_none_on_unparsable_response():
    provider = _ScriptedProvider("je ne sais pas quoi répondre")
    assert score_faithfulness(provider, "contexte", "réponse") is None


def test_score_faithfulness_returns_none_on_provider_error():
    assert score_faithfulness(_FailingProvider(), "contexte", "réponse") is None


def test_score_answer_relevance_parses_score():
    provider = _ScriptedProvider("0.4")
    assert score_answer_relevance(provider, "question ?", "réponse") == 0.4


def test_score_answer_relevance_returns_none_on_provider_error():
    assert score_answer_relevance(_FailingProvider(), "question ?", "réponse") is None


def test_score_extracts_number_even_with_surrounding_text():
    provider = _ScriptedProvider("Le score est 0.65 sur cette réponse.")
    assert score_faithfulness(provider, "contexte", "réponse") == 0.65
