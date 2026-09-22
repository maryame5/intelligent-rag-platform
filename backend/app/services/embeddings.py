import hashlib
import json
import threading
from typing import Protocol

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.metrics import EMBEDDING_REQUESTS_TOTAL, LLM_COST_USD_TOTAL, LLM_TOKENS_TOTAL
from app.services.cache import get_redis_client
from app.services.cost_tracking import estimate_cost, estimate_tokens

# LFM2.5-Embedding-350M (gratuit sur OpenRouter) accepte 512 tokens max par input.
# Pour du texte contenant des chiffres, tableaux financiers ou caractères accentués,
# la densité de tokens peut être très élevée (1 token ≈ 1 à 1.5 caractère).
# On borne donc strictement à 500 caractères pour garantir de rester toujours sous les 512 tokens.
MAX_EMBEDDING_INPUT_CHARS = 500

# Combien de temps garder un vecteur en cache : les embeddings d'un texte donné
# ne changent jamais pour un même modèle, donc une durée longue est sûre. On
# limite quand même pour permettre de "purger" en changeant juste le TTL sans
# vider Redis à la main si jamais un bug de calcul est corrigé.
EMBEDDING_CACHE_TTL_SECONDS = 7 * 24 * 3600


class EmbeddingProvider(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]: ...


class EmbeddingProviderError(Exception):
    """Levée quand le service d'embeddings ne peut pas être appelé (clé manquante, erreur réseau...)."""


@retry(
    reraise=True,
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1.0, min=1, max=10),
    retry=retry_if_exception_type(httpx.HTTPError),
)
def _post_embeddings(base_url: str, api_key: str, model: str, texts: list[str]) -> dict:
    """Appel HTTP isolé pour pouvoir lui appliquer un retry avec backoff
    exponentiel sur les erreurs réseau ou de rate-limiting (timeout, 429, 5xx)."""
    response = httpx.post(
        f"{base_url}/embeddings",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": model, "input": texts},
        timeout=30.0,
    )
    if response.status_code >= 400:
        # On inclut le corps de la réponse dans l'exception pour que Celery
        # le logue — très utile pour diagnostiquer les erreurs upstream.
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        raise httpx.HTTPStatusError(
            f"HTTP {response.status_code} from embeddings API: {detail}",
            request=response.request,
            response=response,
        )
    return response.json()


# OpenRouter (et la plupart des fournisseurs d'embeddings) imposent une limite stricte
# sur le nombre d'éléments dans le tableau `input` (OpenRouter rejette avec 400 si > 128).
# Pour éviter aussi de déclencher le rate limiting du tier gratuit, on envoie par lots de 32 max.
MAX_EMBEDDING_BATCH_SIZE = 32


class OpenAIEmbeddingProvider:
    """Provider par défaut, compatible avec l'API embeddings au format OpenAI
    (fonctionne avec OpenRouter, Azure OpenAI, vLLM, etc. via base_url)."""

    def __init__(self, api_key: str, model: str, base_url: str):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not self.api_key:
            raise EmbeddingProviderError(
                "LLM_API_KEY manquant : impossible d'appeler le service d'embeddings."
            )
        if not texts:
            return []

        truncated = [t[:MAX_EMBEDDING_INPUT_CHARS] for t in texts]
        all_embeddings: list[list[float]] = []
        total_input_tokens = 0

        for i in range(0, len(truncated), MAX_EMBEDDING_BATCH_SIZE):
            batch = truncated[i : i + MAX_EMBEDDING_BATCH_SIZE]
            try:
                data = _post_embeddings(self.base_url, self.api_key, self.model, batch)
            except httpx.HTTPError as exc:
                EMBEDDING_REQUESTS_TOTAL.labels(model=self.model, status="error").inc()
                raise EmbeddingProviderError(
                    f"Appel au service d'embeddings échoué après 3 tentatives : {exc}"
                ) from exc

            EMBEDDING_REQUESTS_TOTAL.labels(model=self.model, status="success").inc()

            usage = data.get("usage", {})
            input_tokens = usage.get("prompt_tokens") or sum(estimate_tokens(t) for t in batch)
            total_input_tokens += input_tokens
            all_embeddings.extend([item["embedding"] for item in data.get("data", [])])

        LLM_TOKENS_TOTAL.labels(model=self.model, direction="input").inc(total_input_tokens)
        LLM_COST_USD_TOTAL.labels(model=self.model).inc(estimate_cost(self.model, total_input_tokens))

        return all_embeddings


class CachingEmbeddingProvider:
    """Décore un provider d'embeddings avec un cache Redis : évite de recalculer
    (et de payer/consommer du quota gratuit rate-limité pour) l'embedding d'un
    texte déjà vu, identique et calculé avec le même modèle.

    Le client Redis est injectable (constructeur) plutôt que résolu en dur à
    l'intérieur de `embed()`, pour rester testable avec un faux client sans
    dépendre d'un vrai serveur Redis (même principe que MinIO/embeddings ailleurs
    dans le projet)."""

    def __init__(self, inner: EmbeddingProvider, model: str, redis_client=None):
        self.inner = inner
        self.model = model
        self._redis_client = redis_client

    def _client(self):
        return self._redis_client if self._redis_client is not None else get_redis_client()

    def _cache_key(self, text: str) -> str:
        digest = hashlib.sha256(f"{self.model}:{text}".encode("utf-8")).hexdigest()
        return f"embedding:{digest}"

    def embed(self, texts: list[str]) -> list[list[float]]:
        client = self._client()
        results: list[list[float] | None] = [None] * len(texts)
        to_fetch_idx: list[int] = []
        to_fetch_texts: list[str] = []

        for i, text in enumerate(texts):
            try:
                cached = client.get(self._cache_key(text))
            except Exception:
                # Redis indisponible : on dégrade en cache désactivé, jamais en erreur bloquante.
                cached = None
            if cached:
                results[i] = json.loads(cached)
            else:
                to_fetch_idx.append(i)
                to_fetch_texts.append(text)

        if to_fetch_texts:
            fetched = self.inner.embed(to_fetch_texts)
            for idx, vector in zip(to_fetch_idx, fetched):
                results[idx] = vector
                try:
                    client.setex(self._cache_key(texts[idx]), EMBEDDING_CACHE_TTL_SECONDS, json.dumps(vector))
                except Exception:
                    pass

        return results  # type: ignore[return-value]



_fastembed_model_instance = None
_fastembed_model_lock = threading.Lock()


def get_fastembed_model(model_name: str, cache_dir: str | None = None):
    """Charge le modèle FastEmbed en singleton avec thread-safety."""
    global _fastembed_model_instance
    if _fastembed_model_instance is None:
        with _fastembed_model_lock:
            if _fastembed_model_instance is None:
                from fastembed import TextEmbedding

                _fastembed_model_instance = TextEmbedding(
                    model_name=model_name,
                    cache_dir=cache_dir,
                )
    return _fastembed_model_instance


class FastEmbedEmbeddingProvider:
    """Provider local utilisant FastEmbed (ONNX Runtime).
    Léger, tourne sur CPU, sans clé API ni limitation de requêtes journalières.
    """

    def __init__(self, model_name: str, cache_dir: str | None = None):
        self.model = model_name
        self.cache_dir = cache_dir

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        truncated = [t[:MAX_EMBEDDING_INPUT_CHARS] for t in texts]
        try:
            model = get_fastembed_model(self.model, self.cache_dir)
            embeddings_gen = model.embed(truncated)
            vectors: list[list[float]] = [vec.tolist() for vec in embeddings_gen]
        except Exception as exc:
            EMBEDDING_REQUESTS_TOTAL.labels(model=self.model, status="error").inc()
            raise EmbeddingProviderError(f"Erreur lors du calcul d'embeddings local : {exc}") from exc

        EMBEDDING_REQUESTS_TOTAL.labels(model=self.model, status="success").inc()
        tokens = sum(estimate_tokens(t) for t in truncated)
        LLM_TOKENS_TOTAL.labels(model=self.model, direction="input").inc(tokens)
        LLM_COST_USD_TOTAL.labels(model=self.model).inc(0.0)

        return vectors


def get_embedding_provider() -> EmbeddingProvider:
    """Point d'extension unique : retourner le provider configuré (local FastEmbed ou OpenAI/OpenRouter cloud)."""
    provider_type = getattr(settings, "embedding_provider_type", "local").lower()
    if provider_type == "local":
        model_name = settings.local_embedding_model
        inner: EmbeddingProvider = FastEmbedEmbeddingProvider(
            model_name=model_name,
            cache_dir=settings.fastembed_cache_dir,
        )
    else:
        model_name = settings.embedding_model
        inner = OpenAIEmbeddingProvider(
            api_key=settings.llm_api_key,
            model=model_name,
            base_url=settings.embedding_api_base_url,
        )
    return CachingEmbeddingProvider(inner, model=model_name)
