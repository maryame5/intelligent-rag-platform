from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Dimensions de sortie des modèles FastEmbed supportés.
# Changer de modèle après indexation impose de réindexer tous les chunks
# (dimensions différentes = similarité cosinus sans signification).
# Ajouter ici tout nouveau modèle utilisé pour que la validation au
# démarrage puisse alerter en cas d'incohérence.
_FASTEMBED_DIMENSIONS: dict[str, int] = {
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2": 384,
    "BAAI/bge-small-en-v1.5": 384,
    "BAAI/bge-base-en-v1.5": 768,
    "BAAI/bge-large-en-v1.5": 1024,
    "intfloat/multilingual-e5-large": 1024,
    "nomic-ai/nomic-embed-text-v1.5": 768,
}


class Settings(BaseSettings):
    environment: str = "development"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 10080

    database_url: str = "postgresql+psycopg2://rag_user:rag_password@postgres:5432/rag_platform"
    redis_url: str = "redis://redis:6379/0"

    minio_endpoint: str = "minio:9000"
    minio_root_user: str = "minio_admin"
    minio_root_password: str = "minio_password"
    minio_bucket: str = "documents"

    # --- Rate limiting (Redis, base séparée du broker Celery pour ne pas mélanger) ---
    rate_limit_storage_uri: str = "redis://redis:6379/1"

    # --- CORS ---
    # Liste blanche explicite plutôt que "*" : "*" accepte n'importe quel site
    # web tiers pour appeler l'API avec les cookies/tokens de l'utilisateur —
    # correct uniquement pour un prototype jamais exposé publiquement.
    cors_allowed_origins: str = "http://localhost:5173"

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    # --- LLM / Embeddings ---
    llm_api_key: str = ""  # clé Groq/OpenRouter ; voir https://console.groq.com/keys
    llm_model: str = "z-ai/glm-5.2:free"
    llm_api_base_url: str = "https://openrouter.ai/api/v1"
    # "local" utilise FastEmbed (ONNX, CPU, sans API key, sans rate limit) — recommandé.
    # "openai" délègue à n'importe quel service compatible API OpenAI (OpenRouter, Azure, vLLM…).
    embedding_provider_type: str = "local"
    local_embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    fastembed_cache_dir: str = "/root/.cache/fastembed"
    embedding_model: str = "liquid/lfm-2.5-embedding-350m:free"
    embedding_api_base_url: str = "https://openrouter.ai/api/v1"
    # Plafond de dépense LLM mensuel en USD.
    # 0 = désactivé (par défaut). Utilisé par app/services/spend_cap.py.
    # Recommandé en prod pour les modèles payants : ex. 10.0 pour 10 $/mois.
    llm_monthly_spend_cap_usd: float = 0.0

    @property
    def embedding_dimensions(self) -> int | None:
        """Retourne les dimensions du modèle d'embedding local configuré,
        ou None si le modèle n'est pas dans le registre connu.

        Utilisé au démarrage pour détecter un changement de modèle incompatible
        avec les vecteurs déjà stockés (dimensions différentes → scores incohérents).
        """
        if self.embedding_provider_type.lower() == "local":
            return _FASTEMBED_DIMENSIONS.get(self.local_embedding_model)
        # Pour les providers cloud, on ne peut pas inférer les dimensions statiquement.
        return None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def _reject_weak_secret_outside_dev(self) -> "Settings":
        """Reject the default or short JWT secret outside development."""
        if self.environment.lower() not in {"development", "dev", "test", "testing"} and (
            self.secret_key in {"", "change-me"} or len(self.secret_key) < 32
        ):
            raise ValueError(
                "SECRET_KEY faible ou par défaut avec ENVIRONMENT != development : "
                "générez-en une avec `openssl rand -hex 32`."
            )
        return self


settings = Settings()

