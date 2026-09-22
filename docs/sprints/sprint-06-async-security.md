# Sprint 6 — Async, Tests & Security

## Quoi

Migration de l'ingestion vers Celery pour de vrai, retries avec backoff sur les appels
externes (embeddings, génération, MinIO), cache Redis pour les embeddings, rate limiting
sur les endpoints sensibles, pagination, validation anti-usurpation de type de fichier, et
logs structurés avec ID de corrélation.

## Pourquoi

**Celery maintenant, pas avant** : depuis le Sprint 2, `run_ingestion()` a toujours été
écrite avec l'interface exacte qu'aurait une tâche Celery (elle ouvre sa propre session DB,
ne dépend pas du cycle de la requête HTTP) — précisément pour que ce sprint se limite à
brancher la tuyauterie, sans toucher à la logique métier. `app/tasks/ingestion_task.py` est
volontairement un wrapper de quelques lignes : `run_ingestion_task.delay(...)` remplace
`background_tasks.add_task(...)`, un point, c'est tout.

**Retries au niveau des appels individuels, pas au niveau de la tâche Celery entière** :
c'était tentant de laisser Celery retenter toute la tâche `run_ingestion` en cas d'échec
(`autoretry_for`), mais `run_ingestion()` avale déjà ses propres exceptions pour marquer le
document en `FAILED` avec un message d'erreur clair — laisser Celery retenter par-dessus
aurait masqué cette logique et recommencé tout le pipeline depuis le début à chaque échec,
même pour une erreur définitive (PDF corrompu, par exemple, qui échouera toujours). Les
retries sont donc appliqués **précisément où le cahier des charges les demande** (§7) :
"extraction, embedding, indexing ou appels externes" — c'est-à-dire les appels HTTP
individuels vers l'API d'embeddings/génération, et les appels MinIO. 3 tentatives, backoff
exponentiel (0.5s/1s/2s), et seulement sur des erreurs réseau transitoires (`httpx.HTTPError`,
`ConnectionError`...) — jamais sur une erreur 401 (clé API invalide) ou 400 (requête malformée),
qui ne se résoudront jamais en réessayant.

**Cache Redis pour les embeddings, pas pour la génération** : l'embedding d'un texte donné
avec un modèle donné est toujours le même — un cache est donc sans risque et directement
utile (économise des appels sur un plan gratuit rate-limité, ex. si un document est
re-uploadé, ou si la même question revient dans plusieurs conversations). Une réponse de
chat, elle, dépend du contexte de conversation et n'a pas vocation à être identique deux
fois — mettre en cache la génération n'aurait pas de sens la plupart du temps.

**Rate limiting différencié par endpoint** : `/auth/login` et `/auth/register` sont
limités pour se protéger du brute-force et du spam d'inscription. `/chat` est limité pour
protéger le **quota du plan gratuit OpenRouter** contre un usage abusif — sans ce garde-fou,
un seul utilisateur pourrait épuiser le quota partagé de toute l'application. Les autres
endpoints (lecture de knowledge bases, documents...) ne sont pas limités : ils ne consomment
ni ressource externe payante ni surface d'attaque évidente.

**Validation par signature de fichier, en plus du Content-Type déclaré** : le
`Content-Type` envoyé par le client HTTP est une simple chaîne de caractères qu'il choisit
lui-même — rien n'empêche de renommer un exécutable en `.pdf` et de mentir sur l'en-tête.
`detect_mismatched_signature()` vérifie que le contenu réel commence par la signature
attendue (`%PDF-` pour un PDF) avant d'accepter le fichier. Volontairement basique — ce
n'est pas un antivirus, juste un garde-fou contre le cas le plus évident.

**Logs structurés en `clé=valeur`, pas en JSON strict** : un vrai déploiement production
voudrait probablement du JSON pour l'ingestion automatique par un agrégateur de logs
(Datadog, ELK...). Pour ce projet, `clé=valeur` reste lisible à l'œil nu dans un terminal
tout en donnant la structure minimale utile (ID de corrélation, méthode, chemin, statut,
durée) — un compromis délibéré pour ne pas ajouter de dépendance (`structlog`,
`python-json-logger`) pour un gain marginal à ce stade.

## Comment

**Celery** :
- `app/worker.py` — instance Celery, broker/backend Redis.
- `app/tasks/ingestion_task.py` — `run_ingestion_task`, wrapper mince.
- `docker-compose.yml` — nouveau service `celery_worker` (même image que le backend,
  commande `celery -A app.worker.celery_app worker`).
- **En test** : mode "eager" (`task_always_eager=True`) — `.delay()` s'exécute en
  synchrone, dans le même process, sans Redis ni worker réel. C'est le pattern standard
  recommandé par Celery pour les tests (voir `tests/conftest.py`).

**Retries** : `tenacity` (`@retry(stop=stop_after_attempt(3), wait=wait_exponential(...))`)
appliqué à `_post_embeddings()`, `_post_chat_completion()` (dans `embeddings.py`/
`generation.py`) et aux fonctions de `storage.py` (upload/download/delete MinIO).

**Cache** : `app/services/cache.py` (`get_redis_client()`), `CachingEmbeddingProvider`
dans `embeddings.py` — décore n'importe quel `EmbeddingProvider`, clé de cache =
`sha256(model:texte)`, TTL 7 jours, dégrade silencieusement en "pas de cache" si Redis est
indisponible (jamais une erreur bloquante).

**Rate limiting** : `slowapi` (`app/core/rate_limit.py`), stockage Redis en production
(base séparée du broker Celery, `RATE_LIMIT_STORAGE_URI`), mémoire pure en test.
`@limiter.limit("10/minute")` sur `/auth/register` et `/auth/login`, `"20/minute"` sur
`/chat`.

**Pagination** : `limit`/`offset` (bornés 1-200, défaut 50) sur
`GET /knowledge-bases/{id}/documents` et `GET /knowledge-bases/{id}/conversations`.

**Validation de signature** : `detect_mismatched_signature()` dans `validation.py`,
appelée juste après `validate_upload()` dans la route d'upload.

**Logs** : `app/core/logging_config.py` + `RequestContextMiddleware` dans `main.py` — génère
ou reprend un `X-Request-ID`, le renvoie dans la réponse, logue
`request_id=... method=... path=... status=... duration_ms=...` pour chaque requête.

**Tester** :
```bash
pytest -v tests/test_retry.py tests/test_caching_embeddings.py \
  tests/test_rate_limiting.py tests/test_pagination.py \
  tests/test_file_signature.py tests/test_celery_config.py
```

## Limites connues

- Le rate limiting est par adresse IP (`get_remote_address`) — un utilisateur derrière un
  NAT partagé avec d'autres pourrait être affecté par leur usage. Passer à une clé basée sur
  l'utilisateur authentifié serait plus juste, mais nécessite d'identifier l'utilisateur
  avant de pouvoir le limiter (donc pas applicable à `/auth/login` avant authentification).
- `detect_mismatched_signature()` ne couvre que PDF/TXT (les deux seuls types acceptés
  aujourd'hui) et reste basique — pas de scan antivirus, pas de sandboxing.
- Les logs restent en `clé=valeur` dans le stdout du conteneur — pas encore envoyés vers un
  agrégateur externe (Sprint 7 pourrait introduire Prometheus/Grafana pour les métriques,
  mais les logs applicatifs eux-mêmes resteraient sur ce format sauf besoin contraire).
