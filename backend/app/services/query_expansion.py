from app.services.generation import ChatProvider, ChatProviderError

QUERY_EXPANSION_SYSTEM_PROMPT = (
    "Tu génères des reformulations alternatives d'une question pour améliorer "
    "une recherche documentaire. Donne exactement 3 reformulations différentes "
    "(synonymes, angle différent, sans changer le sens de la question), une par "
    "ligne, sans numérotation ni commentaire ni guillemets."
)

MAX_EXPANSIONS = 3


def expand_query(chat_provider: ChatProvider, query: str) -> list[str]:
    """Retourne la requête originale suivie de quelques reformulations.

    La requête originale est TOUJOURS en première position, même si l'appel
    LLM échoue ou renvoie n'importe quoi — l'expansion est une amélioration
    du rappel, jamais une dépendance dont l'échec casserait la recherche.
    Les doublons (reformulation identique à l'originale, ou entre elles) sont
    éliminés pour ne pas gaspiller des appels de recherche redondants."""
    messages = [
        {"role": "system", "content": QUERY_EXPANSION_SYSTEM_PROMPT},
        {"role": "user", "content": query},
    ]

    try:
        raw = chat_provider.generate(messages)
        candidates = [line.strip(" -•\t").strip() for line in raw.splitlines()]
    except ChatProviderError:
        candidates = []

    variants = [query]
    seen = {query.strip().lower()}
    for candidate in candidates:
        key = candidate.lower()
        if candidate and key not in seen:
            variants.append(candidate)
            seen.add(key)
        if len(variants) >= MAX_EXPANSIONS + 1:
            break

    return variants
