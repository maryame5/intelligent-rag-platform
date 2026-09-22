from dataclasses import dataclass

from app.models.message import Message, MessageRole
from app.services.prompt_builder import build_chat_messages, build_context_block


@dataclass
class _FakeChunk:
    content: str
    page: int | None = None


@dataclass
class _FakeDocument:
    filename: str


def test_build_context_block_numbers_sources_from_one():
    results = [
        (_FakeChunk("Contenu A", page=2), _FakeDocument("a.pdf"), 0.9),
        (_FakeChunk("Contenu B"), _FakeDocument("b.txt"), 0.5),
    ]
    block = build_context_block(results)
    assert "[1]" in block
    assert "[2]" in block
    assert "a.pdf" in block
    assert "page 2" in block
    assert "Contenu A" in block
    assert "Contenu B" in block


def test_build_chat_messages_includes_system_history_and_context():
    history = [
        Message(role=MessageRole.USER, content="Bonjour"),
        Message(role=MessageRole.ASSISTANT, content="Bonjour, comment puis-je aider ?"),
    ]
    results = [(_FakeChunk("Extrait pertinent"), _FakeDocument("doc.txt"), 0.8)]

    messages = build_chat_messages("Quelle est la politique ?", results, history)

    assert messages[0]["role"] == "system"
    assert "UNIQUEMENT" in messages[0]["content"]
    assert messages[1] == {"role": "user", "content": "Bonjour"}
    assert messages[2] == {"role": "assistant", "content": "Bonjour, comment puis-je aider ?"}
    assert "Extrait pertinent" in messages[-1]["content"]
    assert "Quelle est la politique ?" in messages[-1]["content"]
