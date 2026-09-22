# Tarifs indicatifs en USD pour 1 million de tokens. Les modèles ":free"
# d'OpenRouter sont à 0 par définition. Pour un modèle inconnu, on suppose 0
# plutôt que d'inventer un chiffre arbitraire qui fausserait le suivi de coût.
PRICING_PER_MILLION_TOKENS: dict[str, dict[str, float]] = {
    "z-ai/glm-5.2:free": {"input": 0.0, "output": 0.0},
    "liquid/lfm-2.5-embedding-350m:free": {"input": 0.0, "output": 0.0},
}
_DEFAULT_PRICING = {"input": 0.0, "output": 0.0}


def estimate_cost(model: str, input_tokens: int, output_tokens: int = 0) -> float:
    pricing = PRICING_PER_MILLION_TOKENS.get(model, _DEFAULT_PRICING)
    return (input_tokens / 1_000_000) * pricing["input"] + (output_tokens / 1_000_000) * pricing["output"]


def estimate_tokens(text: str) -> int:
    """Approximation grossière (~4 caractères/token en moyenne) utilisée en
    repli quand l'API ne renvoie pas de champ `usage` — donne un ordre de
    grandeur, pas un compte exact. À remplacer par un vrai tokenizer
    (tiktoken ou équivalent) si le suivi de coût doit devenir précis."""
    return max(1, len(text) // 4)
