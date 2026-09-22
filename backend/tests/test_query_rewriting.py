from app.models.message import Message, MessageRole
from app.services.query_rewriting import rewrite_query


class _RecordingChatProvider:
    def __init__(self, response: str):
        self.response = response
        self.last_messages = None

    def generate(self, messages):
        self.last_messages = messages
        return self.response


class _FailingChatProvider:
    def generate(self, messages):
        from app.services.generation import ChatProviderError

        raise ChatProviderError("boom")


def test_no_history_skips_llm_call_entirely():
    provider = _RecordingChatProvider("ne devrait jamais être renvoyé")
    result = rewrite_query(provider, history=[], question="Quelle est la politique de congés ?")
    assert result == "Quelle est la politique de congés ?"
    assert provider.last_messages is None  # aucun appel effectué


def test_with_history_calls_provider_and_returns_rewritten_query():
    provider = _RecordingChatProvider("Quelle est la politique de congés payés de l'entreprise ?")
    history = [
        Message(role=MessageRole.USER, content="Parle-moi des congés"),
        Message(role=MessageRole.ASSISTANT, content="Il y a 25 jours de congés par an."),
    ]
    result = rewrite_query(provider, history, "et les jours fériés ?")
    assert result == "Quelle est la politique de congés payés de l'entreprise ?"
    assert provider.last_messages is not None
    assert provider.last_messages[0]["role"] == "system"


def test_provider_failure_falls_back_to_raw_question():
    provider = _FailingChatProvider()
    history = [Message(role=MessageRole.USER, content="question précédente")]
    result = rewrite_query(provider, history, "question de suivi")
    assert result == "question de suivi"
