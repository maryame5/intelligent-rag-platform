from prometheus_client import Counter, Histogram

# Les métriques HTTP génériques (requêtes/latence/statut par endpoint) sont
# couvertes automatiquement par prometheus-fastapi-instrumentator (voir main.py).
# Celles-ci sont spécifiques au domaine RAG — pas dérivables des métriques HTTP.

LLM_REQUESTS_TOTAL = Counter(
    "llm_requests_total",
    "Nombre d'appels au LLM de génération",
    ["model", "status"],  # status: success | error
)

EMBEDDING_REQUESTS_TOTAL = Counter(
    "embedding_requests_total",
    "Nombre d'appels au service d'embeddings",
    ["model", "status"],
)

LLM_TOKENS_TOTAL = Counter(
    "llm_tokens_total",
    "Tokens consommés (approximation si l'API ne renvoie pas de champ usage)",
    ["model", "direction"],  # direction: input | output
)

LLM_COST_USD_TOTAL = Counter(
    "llm_cost_usd_total",
    "Coût estimé en USD (0 pour les modèles gratuits)",
    ["model"],
)

INGESTION_DURATION_SECONDS = Histogram(
    "ingestion_duration_seconds",
    "Durée totale du pipeline d'ingestion (extraction -> chunking -> embeddings)",
)

RAG_FAITHFULNESS_SCORE = Histogram(
    "rag_faithfulness_score",
    "Score de faithfulness (0-1) mesuré lors des runs d'évaluation",
    buckets=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0),
)
