import json
from typing import Iterator, Protocol

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.metrics import LLM_COST_USD_TOTAL, LLM_REQUESTS_TOTAL, LLM_TOKENS_TOTAL
from app.services.cost_tracking import estimate_cost, estimate_tokens
from app.services.spend_cap import check_spend_cap, record_spend


class ChatProvider(Protocol):
    def generate(self, messages: list[dict]) -> str: ...
    def generate_stream(self, messages: list[dict]) -> Iterator[str]: ...


class ChatProviderError(Exception):
    """Levée quand le service de génération ne peut pas être appelé."""


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
    """Provider par défaut, compatible avec l'API chat completions au format
    OpenAI (fonctionne avec OpenRouter, Azure OpenAI, vLLM, etc. via base_url)."""

    def __init__(self, api_key: str, model: str, base_url: str, temperature: float = 0.1):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.temperature = temperature

    def generate(self, messages: list[dict]) -> str:
        if not self.api_key:
            raise ChatProviderError("LLM_API_KEY manquant : impossible d'appeler le service de génération.")

        # Estimation du coût avant l'appel pour vérifier le plafond mensuel.
        estimated_input = sum(estimate_tokens(m.get("content", "")) for m in messages)
        estimated_cost = estimate_cost(self.model, estimated_input)
        check_spend_cap(estimated_cost, settings.llm_monthly_spend_cap_usd)

        try:
            data = _post_chat_completion(self.base_url, self.api_key, self.model, messages, self.temperature)
        except httpx.HTTPError as exc:
            LLM_REQUESTS_TOTAL.labels(model=self.model, status="error").inc()
            raise ChatProviderError(
                f"Appel au service de génération échoué après 3 tentatives : {exc}"
            ) from exc

        LLM_REQUESTS_TOTAL.labels(model=self.model, status="success").inc()

        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        input_tokens = usage.get("prompt_tokens") or estimated_input
        output_tokens = usage.get("completion_tokens") or estimate_tokens(content)
        actual_cost = estimate_cost(self.model, input_tokens, output_tokens)
        LLM_TOKENS_TOTAL.labels(model=self.model, direction="input").inc(input_tokens)
        LLM_TOKENS_TOTAL.labels(model=self.model, direction="output").inc(output_tokens)
        LLM_COST_USD_TOTAL.labels(model=self.model).inc(actual_cost)
        record_spend(actual_cost)

        return content

    def generate_stream(self, messages: list[dict]) -> Iterator[str]:
        """Variante streaming : yield le texte au fur et à mesure qu'il arrive,
        au format SSE côté fournisseur (`stream: true`, lignes `data: {...}`).

        Pas de retry ici, contrairement à `generate()` : une fois le premier
        fragment envoyé au client, on ne peut plus "recommencer" la réponse
        sans lui montrer un résultat incohérent. Le retry a du sens avant
        d'avoir rien streamé, pas après — limite assumée, voir
        docs/sprints/backlog-03-streaming.md.
        """
        if not self.api_key:
            raise ChatProviderError("LLM_API_KEY manquant : impossible d'appeler le service de génération.")

        try:
            with httpx.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
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
                    payload = line[len("data: ") :].strip()
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
        except httpx.HTTPError as exc:
            LLM_REQUESTS_TOTAL.labels(model=self.model, status="error").inc()
            raise ChatProviderError(f"Appel au service de génération (stream) échoué : {exc}") from exc

        LLM_REQUESTS_TOTAL.labels(model=self.model, status="success").inc()


def get_chat_provider() -> ChatProvider:
    """Point d'extension unique, même logique que get_embedding_provider()."""
    return OpenAIChatProvider(
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        base_url=settings.llm_api_base_url,
    )
