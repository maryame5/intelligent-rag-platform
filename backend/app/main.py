import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.logging_config import configure_logging
from app.core.rate_limit import limiter

configure_logging()
access_logger = logging.getLogger("rag_platform.access")

app = FastAPI(title="Production RAG Platform API", version="0.1.0")

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Trop de requêtes, réessayez plus tard."})


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attribue un ID de corrélation à chaque requête (repris depuis l'en-tête
    X-Request-ID si le client en fournit un, sinon généré), le renvoie dans la
    réponse, et logue method/path/status/durée. Base pour retrouver le
    parcours complet d'une requête dans les logs d'un système distribué —
    utile dès qu'il y a plus d'une instance du backend derrière un load balancer."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        response.headers["X-Request-ID"] = request_id
        access_logger.info(
            "request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response


app.add_middleware(RequestContextMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

# Métriques HTTP génériques (requêtes/latence/statut par endpoint) exposées sur
# /metrics au format Prometheus. Métriques RAG-spécifiques (tokens, coût,
# durée d'ingestion, faithfulness) dans app/core/metrics.py.
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "environment": settings.environment}
