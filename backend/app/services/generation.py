import json
import logging
from typing import Iterator, Protocol

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.metrics import LLM_COST_USD_TOTAL, LLM_REQUESTS_TOTAL, LLM_TOKENS_TOTAL
from app.core.observability import observe_span
from app.services.cost_tracking import estimate_cost, estimate_tokens
from app.services.spend_cap import check_spend_cap, record_spend

logger = logging.getLogger(__name__)

# Codes HTTP et messages indiquant un quota épuisé / clé expirée côté Groq.
# On bascule sur le fallback Gemini uniquement pour ces cas précis —
# on ne veut pas masquer des erreurs réseau ou serveur légitimes.
_QUOTA_STATUS_CODES = {429}
_QUOTA_ERROR_FRAGMENTS = (
    "rate_limit",
    "rate limit",
    "quota",
    "exceeded",
    "too many requests",
    "insufficient_quota",
    "tokens per",
)


class ChatProvider(Protocol):
    def generate(self, messages: list[dict]) -> str: ...
    def generate_stream(self, messages: list[dict]) -> Iterator[str]: ...


class ChatProviderError(Exception):
    """Levée quand le service de génération ne peut pas être appelé."""


def _is_quota_error(exc: httpx.HTTPStatusError) -> bool:
    """Retourne True si l'erreur HTTP signale un quota Groq épuisé / clé expirée."""
    if exc.response.status_code in _QUOTA_STATUS_CODES:
        return True
    try:
        body = exc.response.json()
        message = str(body).lower()
    except Exception:
        message = exc.response.text.lower()
    return any(fragment in message for fragment in _QUOTA_ERROR_FRAGMENTS)


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, max=4),
    retry=retry_if_exception_type(httpx.HTTPError),
)
def _post_chat_completion(
    base_url: str, api_key: str, model: str, messages: list[dict], temperature: float
) -> dict:
    """Appel HTTP isolé pour lui appliquer un retry avec backoff exponentiel sur
    les erreurs réseau transitoires — mêmes réglages que pour les embeddings."""
    response = httpx.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": model, "messages": messages, "temperature": temperature},
        timeout=60.0,
    )
    response.raise_for_status()
    return response.json()


class OpenAIChatProvider:
    """Provider compatible avec l'API chat completions au format OpenAI
    (fonctionne avec Groq, OpenRouter, Azure OpenAI, vLLM, etc. via base_url).

    Supporte un fallback automatique vers un second provider (Gemini) lorsque
    le provider principal retourne une erreur de quota / rate limit (HTTP 429).
    """

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str,
        temperature: float = 0.1,
        fallback_api_key: str = "",
        fallback_model: str = "",
        fallback_base_url: str = "",
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.temperature = temperature
        self.fallback_api_key = fallback_api_key
        self.fallback_model = fallback_model
        self.fallback_base_url = fallback_base_url

    # ------------------------------------------------------------------
    # Helpers internes
    # ------------------------------------------------------------------

    def _has_fallback(self) -> bool:
        return bool(self.fallback_api_key and self.fallback_model and self.fallback_base_url)

    def _record_metrics(self, model: str, messages: list[dict], content: str, data: dict, estimated_input: int) -> None:
        """Enregistre les métriques Prometheus + Langfuse + spend cap."""
        usage = data.get("usage", {})
        input_tokens = usage.get("prompt_tokens") or estimated_input
        output_tokens = usage.get("completion_tokens") or estimate_tokens(content)
        actual_cost = estimate_cost(model, input_tokens, output_tokens)

        LLM_TOKENS_TOTAL.labels(model=model, direction="input").inc(input_tokens)
        LLM_TOKENS_TOTAL.labels(model=model, direction="output").inc(output_tokens)
        LLM_COST_USD_TOTAL.labels(model=model).inc(actual_cost)
        record_spend(actual_cost)

        with observe_span(
            name="llm_chat_completion",
            as_type="generation",
            input_data=messages,
            model=model,
            usage={
                "input": input_tokens,
                "output": output_tokens,
                "total": input_tokens + output_tokens,
            },
            cost=actual_cost,
        ):
            pass

    def _call_primary(self, messages: list[dict], estimated_input: int) -> str:
        """Appelle le provider principal (Groq). Lève httpx.HTTPStatusError sur quota."""
        data = _post_chat_completion(
            self.base_url, self.api_key, self.model, messages, self.temperature
        )
        LLM_REQUESTS_TOTAL.labels(model=self.model, status="success").inc()
        content = data["choices"][0]["message"]["content"]
        self._record_metrics(self.model, messages, content, data, estimated_input)
        return content

    def _call_fallback(self, messages: list[dict], estimated_input: int) -> str:
        """Appelle le provider de fallback (Gemini)."""
        logger.warning(
            "Quota Groq épuisé — bascule sur le fallback Gemini (%s).",
            self.fallback_model,
        )
        try:
            data = _post_chat_completion(
                self.fallback_base_url,
                self.fallback_api_key,
                self.fallback_model,
                messages,
                self.temperature,
            )
        except httpx.HTTPError as exc:
            LLM_REQUESTS_TOTAL.labels(model=self.fallback_model, status="error").inc()
            raise ChatProviderError(
                f"Fallback Gemini ({self.fallback_model}) également en échec : {exc}"
            ) from exc

        LLM_REQUESTS_TOTAL.labels(model=self.fallback_model, status="success").inc()
        content = data["choices"][0]["message"]["content"]
        self._record_metrics(self.fallback_model, messages, content, data, estimated_input)
        return content

    # ------------------------------------------------------------------
    # Interface publique
    # ------------------------------------------------------------------

    def generate(self, messages: list[dict]) -> str:
        if not self.api_key:
            raise ChatProviderError(
                "LLM_API_KEY manquant : impossible d'appeler le service de génération."
            )

        # Estimation du coût avant l'appel pour vérifier le plafond mensuel.
        estimated_input = sum(estimate_tokens(m.get("content", "")) for m in messages)
        estimated_cost = estimate_cost(self.model, estimated_input)
        check_spend_cap(estimated_cost, settings.llm_monthly_spend_cap_usd)

        try:
            return self._call_primary(messages, estimated_input)
        except httpx.HTTPStatusError as exc:
            if self._has_fallback() and _is_quota_error(exc):
                # Quota Groq épuisé → on essaie Gemini
                return self._call_fallback(messages, estimated_input)
            # Autre erreur HTTP (5xx, auth…) : on propage comme avant
            LLM_REQUESTS_TOTAL.labels(model=self.model, status="error").inc()
            raise ChatProviderError(
                f"Appel au service de génération échoué : {exc}"
            ) from exc
        except httpx.HTTPError as exc:
            LLM_REQUESTS_TOTAL.labels(model=self.model, status="error").inc()
            raise ChatProviderError(
                f"Appel au service de génération échoué après 3 tentatives : {exc}"
            ) from exc

    def generate_stream(self, messages: list[dict]) -> Iterator[str]:
        """Variante streaming : yield le texte au fur et à mesure qu'il arrive.

        Le fallback Gemini est activé ici aussi si le premier appel retourne
        une erreur de quota AVANT d'avoir streamé le moindre fragment —
        c'est le seul cas où le fallback est sûr en mode streaming.

        Pas de retry sur le fallback lui-même : une fois le premier fragment
        envoyé au client, on ne peut plus recommencer sans incohérence.
        """
        if not self.api_key:
            raise ChatProviderError(
                "LLM_API_KEY manquant : impossible d'appeler le service de génération."
            )

        primary_failed_on_quota = False

        try:
            yield from self._stream_provider(
                self.base_url, self.api_key, self.model, messages
            )
            return
        except httpx.HTTPStatusError as exc:
            if self._has_fallback() and _is_quota_error(exc):
                primary_failed_on_quota = True
                logger.warning(
                    "Quota Groq épuisé (stream) — bascule sur Gemini (%s).",
                    self.fallback_model,
                )
            else:
                LLM_REQUESTS_TOTAL.labels(model=self.model, status="error").inc()
                raise ChatProviderError(
                    f"Appel au service de génération (stream) échoué : {exc}"
                ) from exc
        except httpx.HTTPError as exc:
            LLM_REQUESTS_TOTAL.labels(model=self.model, status="error").inc()
            raise ChatProviderError(
                f"Appel au service de génération (stream) échoué : {exc}"
            ) from exc

        if primary_failed_on_quota:
            try:
                yield from self._stream_provider(
                    self.fallback_base_url,
                    self.fallback_api_key,
                    self.fallback_model,
                    messages,
                )
            except httpx.HTTPError as exc:
                LLM_REQUESTS_TOTAL.labels(model=self.fallback_model, status="error").inc()
                raise ChatProviderError(
                    f"Fallback Gemini ({self.fallback_model}) également en échec (stream) : {exc}"
                ) from exc

    def _stream_provider(
        self, base_url: str, api_key: str, model: str, messages: list[dict]
    ) -> Iterator[str]:
        """Effectue un appel SSE vers un endpoint donné et yield les deltas texte."""
        with httpx.stream(
            "POST",
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": messages,
                "temperature": self.temperature,
                "stream": True,
            },
            timeout=60.0,
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line or not line.startswith("data: "):
                    continue
                payload = line[len("data: "):].strip()
                if payload == "[DONE]":
                    break
                try:
                    chunk = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                choices = chunk.get("choices") or [{}]
                delta = choices[0].get("delta", {}).get("content")
                if delta:
                    yield delta

        LLM_REQUESTS_TOTAL.labels(model=model, status="success").inc()


def get_chat_provider() -> ChatProvider:
    """Point d'extension unique.

    Retourne un OpenAIChatProvider configuré avec Groq comme provider principal
    et Gemini comme fallback automatique si LLM_FALLBACK_API_KEY est définie.
    """
    return OpenAIChatProvider(
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        base_url=settings.llm_api_base_url,
        fallback_api_key=settings.llm_fallback_api_key,
        fallback_model=settings.llm_fallback_model,
        fallback_base_url=settings.llm_fallback_api_base_url,
    )
