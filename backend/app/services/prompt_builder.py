from app.models.chunk import Chunk
from app.models.document import Document
from app.models.message import Message, MessageRole

SYSTEM_PROMPT = (
    "Tu es un assistant documentaire d'entreprise. Réponds directement, de façon claire et "
    "synthétique à la question posée, UNIQUEMENT à partir des extraits fournis ci-dessous, "
    "jamais à partir de connaissances externes. "
    "Ne formule aucune hypothèse non demandée et ne commence pas par réciter ce qui manque. "
    "Si les extraits ne contiennent pas la réponse, dis simplement et sobrement que l'information "
    "n'est pas mentionnée dans les documents fournis. "
    "Quand tu t'appuies sur un extrait, cite son numéro entre crochets, par exemple [1] ou [2]. "
    "Réponds dans la langue de la question."
)


def build_context_block(results: list[tuple[Chunk, Document, float]]) -> str:
    blocks = []
    for i, (chunk, document, _score) in enumerate(results, start=1):
        page_info = f", page {chunk.page}" if chunk.page else ""
        blocks.append(f"[{i}] (source : {document.filename}{page_info})\n{chunk.content}")
    return "\n\n".join(blocks)


def build_chat_messages(
    question: str,
    results: list[tuple[Chunk, Document, float]],
    history: list[Message],
) -> list[dict]:
    """Construit la liste de messages envoyée au LLM : system (grounding) +
    historique de conversation + question courante accompagnée du contexte
    récupéré. N'est appelé que quand `results` n'est pas vide — le cas
    'contexte insuffisant' est géré en amont, de façon déterministe (voir
    app/api/routes/chat.py), sans dépendre du LLM pour respecter la consigne."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for msg in history:
        role = "user" if msg.role == MessageRole.USER else "assistant"
        messages.append({"role": role, "content": msg.content})

    context_block = build_context_block(results)
    user_content = f"Extraits de documents :\n{context_block}\n\nQuestion : {question}"
    messages.append({"role": "user", "content": user_content})
    return messages
