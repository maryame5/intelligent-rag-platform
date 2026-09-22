from typing import Protocol

from app.models.chunk import Chunk
from app.models.document import Document
from app.services.generation import ChatProvider, ChatProviderError

RERANK_SYSTEM_PROMPT = (
    "Tu es un système de reranking. On te donne une question et une liste "
    "numérotée d'extraits candidats. Réponds UNIQUEMENT avec la liste des "
    "numéros des extraits triés du plus pertinent au moins pertinent pour "
    "répondre à la question, séparés par des virgules (exemple : 3,1,4,2). "
    "N'ajoute aucun texte, aucune explication."
)

# Un appel LLM par recherche a un coût/latence non négligeable sur un plan
# gratuit rate-limité : on ne reranke jamais plus que ce nombre de candidats.
MAX_RERANK_CANDIDATES = 20


class Reranker(Protocol):
    def rerank(
        self, query: str, candidates: list[tuple[Chunk, Document, float]]
    ) -> list[tuple[Chunk, Document, float]]: ...


class LLMReranker:
    """Utilise le LLM de génération comme reranker par prompt, faute d'accès à
    un modèle reranker dédié dans l'offre gratuite retenue. Repli automatique
    sur l'ordre d'entrée si l'appel échoue ou si la réponse n'est pas parsable
    — un reranker qui casse la recherche serait pire que pas de reranker."""

    def __init__(self, chat_provider: ChatProvider):
        self.chat_provider = chat_provider

    def rerank(
        self, query: str, candidates: list[tuple[Chunk, Document, float]]
    ) -> list[tuple[Chunk, Document, float]]:
        if len(candidates) <= 1:
            return candidates

        limited = candidates[:MAX_RERANK_CANDIDATES]
        listing = "\n".join(f"{i}. {chunk.content[:400]}" for i, (chunk, _doc, _score) in enumerate(limited, start=1))
        messages = [
            {"role": "system", "content": RERANK_SYSTEM_PROMPT},
            {"role": "user", "content": f"Question : {query}\n\nExtraits :\n{listing}"},
        ]

        try:
            raw = self.chat_provider.generate(messages)
            order = [int(x.strip()) for x in raw.strip().split(",") if x.strip().isdigit()]
        except (ChatProviderError, ValueError):
            return candidates

        seen: set[int] = set()
        reordered: list[tuple[Chunk, Document, float]] = []
        for position in order:
            idx = position - 1
            if 0 <= idx < len(limited) and idx not in seen:
                reordered.append(limited[idx])
                seen.add(idx)

        # Sécurité : tout candidat non repris par le LLM (réponse incomplète,
        # doublon...) est ajouté à la suite plutôt que silencieusement perdu.
        for i, candidate in enumerate(limited):
            if i not in seen:
                reordered.append(candidate)

        return reordered + candidates[MAX_RERANK_CANDIDATES:]


def get_reranker(chat_provider: ChatProvider) -> Reranker:
    return LLMReranker(chat_provider)
