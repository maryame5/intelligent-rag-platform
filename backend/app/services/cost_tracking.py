# Tarifs indicatifs en USD pour 1 million de tokens.
# Les modèles ":free" d'OpenRouter sont à 0 par définition.
# Pour un modèle inconnu, on suppose 0 plutôt que d'inventer un chiffre
# arbitraire qui fausserait le suivi de coût.
# Source tarifs Groq : https://console.groq.com/docs/pricing (septembre 2026)
PRICING_PER_MILLION_TOKENS: dict[str, dict[str, float]] = {
    # OpenRouter gratuits
    "z-ai/glm-5.2:free": {"input": 0.0, "output": 0.0},
    "liquid/lfm-2.5-embedding-350m:free": {"input": 0.0, "output": 0.0},
    # Groq
    "qwen/qwen3.8-27b": {"input": 0.10, "output": 0.10},
    "llama3-8b-8192": {"input": 0.05, "output": 0.08},
    "llama3-70b-8192": {"input": 0.59, "output": 0.79},
    "mixtral-8x7b-32768": {"input": 0.24, "output": 0.24},
    # Google Gemini
    "gemini-3.8-flash": {"input": 0.075, "output": 0.30},
    "gemini-2.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
    # Modèles locaux FastEmbed (ONNX) : coût nul
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2": {"input": 0.0, "output": 0.0},
    "BAAI/bge-small-en-v1.5": {"input": 0.0, "output": 0.0},
    "BAAI/bge-base-en-v1.5": {"input": 0.0, "output": 0.0},
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
