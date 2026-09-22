from dataclasses import dataclass

from app.services.generation import ChatProviderError
from app.services.reranking import LLMReranker


@dataclass
class _FakeChunk:
    id: str
    content: str = "contenu"


@dataclass
class _FakeDocument:
    filename: str = "doc.txt"


class _ScriptedProvider:
    def __init__(self, response: str):
        self.response = response

    def generate(self, messages):
        return self.response


class _FailingProvider:
    def generate(self, messages):
        raise ChatProviderError("boom")


def _candidates(*ids):
    return [(_FakeChunk(i), _FakeDocument(), 1.0) for i in ids]


def test_reorders_according_to_llm_response():
    candidates = _candidates("a", "b", "c")
    reranker = LLMReranker(_ScriptedProvider("3,1,2"))

    result = reranker.rerank("peu importe", candidates)
    assert [chunk.id for chunk, _doc, _score in result] == ["c", "a", "b"]


def test_falls_back_to_original_order_on_unparsable_response():
    candidates = _candidates("a", "b", "c")
    reranker = LLMReranker(_ScriptedProvider("réponse qui n'est pas une liste de nombres"))

    result = reranker.rerank("peu importe", candidates)
    assert [chunk.id for chunk, _doc, _score in result] == ["a", "b", "c"]


def test_falls_back_to_original_order_on_provider_error():
    candidates = _candidates("a", "b", "c")
    reranker = LLMReranker(_FailingProvider())

    result = reranker.rerank("peu importe", candidates)
    assert [chunk.id for chunk, _doc, _score in result] == ["a", "b", "c"]


def test_missing_indices_in_response_are_appended_not_lost():
    candidates = _candidates("a", "b", "c")
    reranker = LLMReranker(_ScriptedProvider("2"))  # ne mentionne que "b"

    result = reranker.rerank("peu importe", candidates)
    ids = [chunk.id for chunk, _doc, _score in result]
    assert ids[0] == "b"
    assert set(ids) == {"a", "b", "c"}  # rien n'est perdu


def test_single_candidate_is_returned_unchanged_without_llm_call():
    candidates = _candidates("a")
    reranker = LLMReranker(_FailingProvider())  # ne doit même pas être appelé

    result = reranker.rerank("peu importe", candidates)
    assert [chunk.id for chunk, _doc, _score in result] == ["a"]
