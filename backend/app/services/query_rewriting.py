from app.models.message import Message, MessageRole
from app.services.generation import ChatProvider, ChatProviderError

QUERY_REWRITE_SYSTEM_PROMPT = (
    "Tu es un module de reformulation de requêtes de recherche documentaire.\n"
    "Ton rôle est UNIQUEMENT de clarifier les pronoms et références implicites à l'historique "
    "(ex: 'et pour lui ?', 'dans ce cas', 'pourquoi ?').\n"
    "RÈGLES STRICTES :\n"
    "1. Si la question est déjà claire et compréhensible seule, RENVOIE-LA EXACTEMENT À L'IDENTIQUE mot pour mot.\n"
    "2. N'ajoute JAMAIS de faits, de chiffres, de pourcentages ou d'hypothèses qui ne sont pas dans la question de l'utilisateur.\n"
    "3. Ne transforme JAMAIS une question ouverte ('Quel est X ?') en affirmation ou question fermée ('Est-ce que X est Y ?').\n"
    "4. Réponds UNIQUEMENT avec la question reformulée, sans guillemets ni commentaire."
)


def rewrite_query(chat_provider: ChatProvider, history: list[Message], question: str) -> str:
    """Transforme une question dépendante du contexte conversationnel (« et pour
    l'autre document ? ») en requête autonome, pour que la recherche vectorielle
    ne rate pas les références implicites à l'historique.

    Sans historique, la question est déjà autonome : on économise un appel LLM.
    Si l'appel de réécriture échoue, on retombe sur la question brute plutôt que
    de bloquer la conversation.
    """
    if not history:
        return question

    messages = [{"role": "system", "content": QUERY_REWRITE_SYSTEM_PROMPT}]
    for msg in history:
        role = "user" if msg.role == MessageRole.USER else "assistant"
        messages.append({"role": role, "content": msg.content})
    messages.append({"role": "user", "content": question})

    try:
        rewritten = chat_provider.generate(messages)
        return rewritten.strip() or question
    except ChatProviderError:
        return question
