# Architecture

## Flux principal
React → API → RAG Service → Retrieval → Reranking → Prompt Builder → LLM → Réponse + Citations

## Flux d'ingestion
Upload → Validation → Storage (MinIO) → Extraction → Cleaning → Chunking → Metadata → Embedding → Vector Index → READY

## Modèle de données (Sprint 0-2)
- **User** (id, email, hashed_password, role, created_at)
- **KnowledgeBase** (id, name, owner_id, created_at)
- **Document** (id, knowledge_base_id, filename, storage_path, mime_type, size_bytes, status, created_at)
- **Chunk** (id, document_id, chunk_index, content, page, section, created_at)
- **IngestionJob** (id, document_id, status, error_message, created_at, updated_at)

À enrichir aux sprints suivants : Embedding, Conversation, Message, EvaluationRun.

**Pipeline d'ingestion (Sprint 2, étendu §13)** : `POST /knowledge-bases/{id}/documents` →
validation (type/taille/signature) → stockage MinIO → retour immédiat `{document, job_id}`
(202) → tâche de fond : téléchargement → extraction (PDF/TXT/DOCX/HTML/Markdown, page par
page ou section par section selon le format) → nettoyage → chunking fixed-size (1000
caractères, overlap 200, métadonnées `page`/`section` conservées) → persistance des chunks
→ statut `READY` ou `FAILED`.

**Support multi-formats (§13 du backlog)** : PDF et TXT depuis le Sprint 2 ; DOCX (via
`python-docx`), HTML (via `BeautifulSoup`) et Markdown (regex sur les titres `#`) ajoutés
ensuite. Chaque format renseigne différemment les métadonnées de citation :
- **PDF** : `page` (numéro réel), `section` toujours `None` (nécessiterait d'analyser la
  mise en forme des polices — hors scope).
- **TXT** : `page=1`, `section=None` (pas de structure).
- **DOCX** : `page=1` partout (python-docx n'expose pas les sauts de page de façon
  exploitable), `section` = titre du dernier style "Heading"/"Title" rencontré.
- **HTML** : `page=1`, `section` = texte du dernier tag `<h1>`-`<h6>` rencontré en parcourant
  le DOM (pas une regex sur le texte aplati, qui perdrait les balises de titre).
- **Markdown** : `page=1`, `section` = titre `#`/`##`/... le plus proche précédant le texte.

Le champ `Chunk.section` existait dans le schéma depuis le Sprint 2 mais n'était rempli par
aucun format avant cette extension — l'ajout DOCX/HTML/Markdown a été l'occasion de le
compléter plutôt que de le laisser inutilisé indéfiniment.

Suivi du traitement via `GET /jobs/{job_id}` (statut PENDING/RUNNING/SUCCESS/FAILED +
message d'erreur si échec).

## Embeddings & recherche vectorielle (Sprint 3)

**Embeddings** : `app/services/embeddings.py` définit une interface `EmbeddingProvider`
(une seule méthode `embed(texts) -> vectors`) implémentée par défaut via l'API OpenAI-compatible
(`OpenAIEmbeddingProvider`, configurable via `LLM_API_KEY`/`EMBEDDING_MODEL`/`EMBEDDING_API_BASE_URL`).
But : pouvoir changer de fournisseur (modèle local, Azure, Cohere...) sans toucher au
pipeline d'ingestion ni à la recherche. Chaque chunk stocke son vecteur (`chunks.embedding`,
JSON-encodé) et le nom du modèle utilisé (`chunks.embedding_model`) — utile pour comparer
plusieurs modèles d'embeddings côte à côte (§9 du cahier des charges).

**Recherche (`POST /knowledge-bases/{id}/search`)** : similarité cosinus calculée **en
mémoire côté Python** (`app/services/retrieval.py`), pas via un moteur vectoriel dédié
(pgvector/Qdrant). Décision volontaire pour le MVP : le volume par knowledge base reste
faible en développement, et ça évite d'ajouter un service d'infrastructure supplémentaire
avant d'en avoir réellement besoin. Top-K configurable, filtrage par `document_id`.
**Limite connue** : ne scale pas au-delà de quelques milliers de chunks par KB — à migrer
vers pgvector (déjà sur Postgres, pas de nouveau service) si les benchmarks du Sprint 7
montrent un problème de latence.

## Génération & Chat (Sprint 4)

**Choix des modèles** : pour rester sur un plan gratuit, les deux providers pointent vers
OpenRouter (`https://openrouter.ai/api/v1`) :
- Génération : `z-ai/glm-5.2:free` (GLM 5.2 — bon suivi d'instructions de grounding, 128K contexte).
- Embeddings : `liquid/lfm-2.5-embedding-350m:free` (limite 512 tokens/input — les chunks
  envoyés sont tronqués à 1800 caractères par sécurité côté `app/services/embeddings.py`).

Configurable via `.env` (`LLM_MODEL`, `EMBEDDING_MODEL`, `LLM_API_BASE_URL`) sans changer de
code — même interface `ChatProvider`/`EmbeddingProvider` que pour n'importe quel autre fournisseur.
**Attention** : modèles gratuits, rate-limités, dont les entrées/sorties peuvent être
utilisées pour l'entraînement côté fournisseur — à ne pas utiliser avec des données
confidentielles réelles sans vérifier les conditions actuelles.

**Pipeline `POST /chat`** :
1. Vérifie l'ownership de la knowledge base.
2. Charge l'historique de la conversation (ou en crée une nouvelle).
3. **Réécriture de requête** (`query_rewriting.py`) : si un historique existe, un appel LLM
   transforme la question en requête autonome (« et les jours fériés ? » → question complète).
   Sans historique, pas d'appel — on économise une latence inutile.
4. Recherche sémantique (Sprint 3) sur la requête réécrite, filtrage par score minimal
   (`MIN_RELEVANCE_SCORE`).
5. **Si aucun chunk pertinent** : réponse de refus **déterministe**, codée en dur — ne dépend
   pas du LLM pour respecter la consigne "ne pas inventer". C'est volontaire : un LLM peut
   halluciner même avec une bonne instruction système ; ce garde-fou ne peut pas être contourné.
6. Sinon : prompt grounded avec citations numérotées (`prompt_builder.py`) → génération → réponse.
7. Message utilisateur + message assistant (avec citations en JSON) persistés.

**Limite connue sur les citations** : toutes les sources récupérées par le retrieval sont
retournées comme citations, sans vérifier que le LLM les a effectivement utilisées dans sa
réponse (pas de parsing des `[n]` générés). Suffisant pour le MVP ; à affiner si besoin
d'une correspondance stricte entre `[n]` cité et source affichée.

## Hybrid Search + Reranking (Sprint 5)

**Recherche hybride** (`app/services/bm25_search.py`, `fusion.py`) : BM25 (Okapi, lexical,
calculé en mémoire — même philosophie que la recherche vectorielle) fusionné avec la
recherche vectorielle via **Reciprocal Rank Fusion** (k=60). Choisi plutôt qu'une simple
moyenne pondérée des scores parce que cosinus et BM25 ne vivent pas sur la même échelle
(fusionner leurs rangs plutôt que leurs valeurs évite d'avoir à les normaliser arbitrairement).

**Reranking** (`app/services/reranking.py`) : **pas de modèle reranker dédié disponible
gratuitement via une API standard** dans le catalogue OpenRouter retenu (les rerankers ont
généralement besoin d'un endpoint `/rerank` propriétaire, pas d'un simple `/chat/completions`).
Compromis : le LLM de génération (GLM 5.2) sert de reranker par prompt — on lui donne la
question + les candidats numérotés, il renvoie l'ordre de pertinence. Repli automatique sur
l'ordre d'entrée si la réponse n'est pas parsable ou si l'appel échoue : un reranker qui
casse la recherche serait pire que pas de reranker.

**`POST /knowledge-bases/{id}/search`** accepte maintenant `mode` (`vector`/`hybrid`) et
`rerank` (bool), pour permettre la comparaison explicite demandée par le cahier des charges
(§9) : vector-only vs hybrid vs reranked.

**Mise à jour** : `/chat` a ensuite basculé sur `use_hybrid=true` par défaut (gratuit, pas
d'appel LLM supplémentaire) tout en laissant `rerank=false` par défaut (coûte un appel LLM
de plus par message) — voir la section Sprint 6 ci-dessous pour le détail des décisions de
robustesse qui ont suivi.

## Async, Tests & Security (Sprint 6)

**Celery** : `app/worker.py` (instance Celery, broker/backend Redis) et
`app/tasks/ingestion_task.py` (wrapper mince autour de `run_ingestion()`, déjà conçue depuis
le Sprint 2 avec l'interface qu'attend Celery). En test, mode "eager"
(`task_always_eager=True`) — `.delay()` s'exécute en synchrone, sans Redis ni worker réel.

**Retries** (`tenacity`) sur les appels réseau individuels (embeddings, génération, MinIO) —
au niveau de chaque appel, pas de la tâche Celery entière (`run_ingestion()` avale déjà ses
propres exceptions pour marquer un échec définitif ; laisser Celery retenter par-dessus
aurait recommencé tout le pipeline à chaque échec, y compris pour des erreurs qui ne se
résoudront jamais).

**Cache Redis pour les embeddings** (`CachingEmbeddingProvider` dans `embeddings.py`) — clé
`sha256(model:texte)`, TTL 7 jours, dégrade en "pas de cache" si Redis est indisponible.

**Rate limiting** (`slowapi`, `app/core/rate_limit.py`) : `/auth/login`/`/auth/register`
(anti brute-force), `/chat` (protection du quota OpenRouter gratuit partagé).

**Pagination** (`limit`/`offset`) sur les listes de documents et conversations.

**Validation anti-usurpation de fichier** (`detect_mismatched_signature()` dans
`validation.py`) : vérifie la signature réelle du contenu plutôt que de faire confiance au
`Content-Type` déclaré, trivialement falsifiable.

**Logs structurés** avec ID de corrélation par requête (`RequestContextMiddleware`,
`X-Request-ID`).

## Évaluation & Observabilité (Sprint 7)

**Benchmark versionné** (`backend/eval/datasets/`) : fichiers JSON suivis par git, un par
version (`sample_benchmark_v1.json`...). Chaque question porte une liste de documents
sources attendus (vérité terrain pour Recall@K/Precision@K/MRR) et, optionnellement, une
réponse attendue. `app/evaluation/runner.py` exécute un dataset contre une knowledge base
réelle et calcule à la fois les métriques retrieval (calcul exact, déterministe) et les
métriques génération (faithfulness/answer relevance, via LLM-as-judge — donc approximatif,
voir `docs/sprints/sprint-07-evaluation-observability-cicd.md` pour les limites assumées).

**Déclenchement** : `POST /admin/evaluations/run` (ADMIN uniquement — potentiellement de
nombreux appels LLM par run).

**Observabilité** : `/metrics` (Prometheus). Métriques HTTP automatiques
(`prometheus-fastapi-instrumentator`) + métriques RAG custom (`app/core/metrics.py`) :
tokens/coût par appel LLM/embedding, durée du pipeline d'ingestion, distribution des scores
de faithfulness. Prometheus + Grafana tournent via `docker-compose.yml` (pas de dashboard
pré-construit fourni — à connecter manuellement au premier lancement).

## CI/CD (Sprint 7)

`.github/workflows/ci.yml` : lint (`ruff`) → tests avec seuil de couverture (`pytest-cov`,
60%) → build Docker du backend (valide que le `Dockerfile` fonctionne réellement, pas
seulement que `requirements.txt` s'installe en local), en parallèle du build frontend.

## Multi-Tenant & Invitations Workspace (Sprint 8)

Gestion multi-utilisateurs et collaboration en entreprise :
- **Workspaces & Membres** : isolation logique des équipes avec rôles (`ADMIN`, `MEMBER`).
- **Invitations sécurisées par Email** : génération de jetons d'invitation avec expiration (48h), envoi asynchrone via Celery Worker et modèle dédié `WorkspaceInvitation`.
- **Rattachement intelligent** : aucun compte dupliqué pour les utilisateurs déjà inscrits, onboarding automatique avec mot de passe pour les nouveaux arrivants.
- **Documentation complète et diagrammes de flux** : voir [`docs/workspace-invitations.md`](file:///d:/rag-platform/docs/workspace-invitations.md).

