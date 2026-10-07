import re

from app.core.observability import get_prompt_with_fallback
from app.services.generation import ChatProvider, ChatProviderError

FAITHFULNESS_PROMPT = (
    "Tu évalues si une réponse est fidèle à son contexte source. On te donne un "
    "contexte et une réponse générée à partir de ce contexte. Réponds UNIQUEMENT "
    "avec un nombre entre 0 et 1 (ex. 0.8) représentant la proportion d'affirmations "
    "de la réponse qui sont bien étayées par le contexte — 1 si tout est étayé, "
    "0 si la réponse invente des informations absentes du contexte. Aucun texte "
    "supplémentaire, juste le nombre."
)

ANSWER_RELEVANCE_PROMPT = (
    "Tu évalues si une réponse répond bien à la question posée (indépendamment de "
    "son exactitude factuelle). Réponds UNIQUEMENT avec un nombre entre 0 et 1 "
    "(ex. 0.9) — 1 si la réponse adresse complètement la question, 0 si elle est "
    "hors sujet. Aucun texte supplémentaire, juste le nombre."
)


def get_faithfulness_prompt() -> str:
    return get_prompt_with_fallback("rag_eval_faithfulness_prompt", FAITHFULNESS_PROMPT)


def get_answer_relevance_prompt() -> str:
    return get_prompt_with_fallback("rag_eval_answer_relevance_prompt", ANSWER_RELEVANCE_PROMPT)


def _parse_score(raw: str) -> float:
    match = re.search(r"(\d+(?:\.\d+)?)", raw)
    if not match:
        raise ValueError(f"Réponse non parsable en score : {raw!r}")
    value = float(match.group(1))
    return max(0.0, min(1.0, value))


def score_faithfulness(chat_provider: ChatProvider, context: str, answer: str) -> float | None:
    """Approximation LLM-as-judge — pas une vérité absolue. Un LLM qui juge un
    autre LLM (ou lui-même) a ses propres biais et limites ; ce score sert à
    comparer des configurations entre elles (chunking A vs B, reranker on/off),
    pas à certifier qu'une réponse est correcte dans l'absolu. Retourne None si
    le score n'est pas parsable ou si l'appel échoue — jamais une valeur inventée."""
    system_prompt = get_faithfulness_prompt()
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Contexte :\n{context}\n\nRéponse à évaluer :\n{answer}"},
    ]
    try:
        raw = chat_provider.generate(messages)
        return _parse_score(raw)
    except (ChatProviderError, ValueError):
        return None


def score_answer_relevance(chat_provider: ChatProvider, question: str, answer: str) -> float | None:
    system_prompt = get_answer_relevance_prompt()
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Question : {question}\n\nRéponse à évaluer :\n{answer}"},
    ]
    try:
        raw = chat_provider.generate(messages)
        return _parse_score(raw)
    except (ChatProviderError, ValueError):
        return None
