from app.services.generation import ChatProviderError
from app.services.query_expansion import expand_query


class _ScriptedProvider:
    def __init__(self, response: str):
        self.response = response

    def generate(self, messages):
        return self.response


class _FailingProvider:
    def generate(self, messages):
        raise ChatProviderError("boom")


def test_original_query_always_first():
    provider = _ScriptedProvider("reformulation A\nreformulation B")
    variants = expand_query(provider, "quel est le tarif ?")
    assert variants[0] == "quel est le tarif ?"


def test_variants_are_parsed_line_by_line():
    provider = _ScriptedProvider("reformulation A\nreformulation B\nreformulation C")
    variants = expand_query(provider, "question")
    assert variants == ["question", "reformulation A", "reformulation B", "reformulation C"]


def test_duplicate_of_original_is_dropped():
    provider = _ScriptedProvider("question\nreformulation B")
    variants = expand_query(provider, "question")
    assert variants == ["question", "reformulation B"]


def test_duplicate_variants_between_themselves_are_dropped():
    provider = _ScriptedProvider("même reformulation\nmême reformulation\nautre")
    variants = expand_query(provider, "question")
    assert variants == ["question", "même reformulation", "autre"]


def test_strips_bullet_prefixes():
    provider = _ScriptedProvider("- reformulation A\n• reformulation B")
    variants = expand_query(provider, "question")
    assert variants == ["question", "reformulation A", "reformulation B"]


def test_provider_failure_falls_back_to_original_only():
    variants = expand_query(_FailingProvider(), "question")
    assert variants == ["question"]


def test_empty_response_falls_back_to_original_only():
    provider = _ScriptedProvider("")
    variants = expand_query(provider, "question")
    assert variants == ["question"]


def test_caps_number_of_variants():
    provider = _ScriptedProvider("a\nb\nc\nd\ne\nf")
    variants = expand_query(provider, "question")
    assert len(variants) <= 4  # original + MAX_EXPANSIONS(3)
