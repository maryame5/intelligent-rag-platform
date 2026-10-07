# Audit d'Observabilité & Composants RAG / LLM

Ce document consigne l'état des lieux de la plateforme RAG avant l'intégration de Langfuse (observabilité LLM & traces OpenTelemetry).

---

## 1. Cartographie des appels LLM, Embeddings & Reranker

### 1.1. Modèle de Langage (LLM) — Génération, Réécriture & Juges

* **SDK / Protocole utilisé** : Appels HTTP REST directs via `httpx` avec politique de retry backoff exponentiel via `tenacity` (aucun SDK lourd ou framework propriétaire).
* **Provider & Configuration** : Compatible OpenAI API (`POST /chat/completions`).
  * URL par défaut : `https://openrouter.ai/api/v1` ou `https://api.groq.com/openai/v1` (configuré via `settings.llm_api_base_url` et `settings.llm_api_key`).
  * Modèle par défaut : `z-ai/glm-5.2:free` (dév) / `qwen/qwen3.8-27b` (prod).
* **Points d'appel dans le code** :
  1. **Génération de réponse RAG** ([generation.py](file:///d:/rag-platform/backend/app/services/generation.py#L43-L131)) :
     * `OpenAIChatProvider.generate(messages)` : réponse synchrone bloquante.
     * `OpenAIChatProvider.generate_stream(messages)` : réponse en streaming SSE.
     * Calcul de coût et tokens via [cost_tracking.py](file:///d:/rag-platform/backend/app/services/cost_tracking.py) et vérification de plafond budgétaire via [spend_cap.py](file:///d:/rag-platform/backend/app/services/spend_cap.py).
  2. **Reformulation de requête** ([query_rewriting.py](file:///d:/rag-platform/backend/app/services/query_rewriting.py#L16-L39)) :
     * `rewrite_query(chat_provider, history, question)` : résout les références anaphoriques et pronoms avec l'historique de conversation.
  3. **Expansion de requête** ([query_expansion.py](file:///d:/rag-platform/backend/app/services/query_expansion.py#L13-L43)) :
     * `expand_query(chat_provider, query)` : génère jusqu'à 3 variations alternatives pour enrichir le rappel documentaire.
  4. **Reranking par prompt** ([reranking.py](file:///d:/rag-platform/backend/app/services/reranking.py#L26-L71)) :
     * `LLMReranker.rerank(query, candidates)` : demande au LLM de réordonner les $K \le 20$ meilleurs candidats extraits.
  5. **Évaluation LLM-as-a-Judge** ([llm_judge.py](file:///d:/rag-platform/backend/app/evaluation/llm_judge.py#L30-L57)) :
     * `score_faithfulness(chat_provider, context, answer)` : évaluation de la fidélité de la réponse aux extraits sources ($[0, 1]$).
     * `score_answer_relevance(chat_provider, question, answer)` : évaluation de l'adéquation de la réponse à la question ($[0, 1]$).

---

### 1.2. Embeddings (Vectorisation)

* **SDKs & Providers supportés** :
  1. **Local (par défaut, ONNX / CPU)** : `fastembed.TextEmbedding` via [FastEmbedEmbeddingProvider](file:///d:/rag-platform/backend/app/services/embeddings.py#L186-L214).
     * Modèle : `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (dimension 384).
     * Pas de clé API nécessaire, exécution locale sans coût ni rate limit.
  2. **Cloud (OpenAI-compatible)** : `httpx` (`POST /embeddings`) via [OpenAIEmbeddingProvider](file:///d:/rag-platform/backend/app/services/embeddings.py#L71-L113).
     * Modèle : `liquid/lfm-2.5-embedding-350m:free` (OpenRouter) ou modèles OpenAI.
  3. **Mise en cache** : Décorateur `CachingEmbeddingProvider` avec Redis (`TTL = 7 jours`, clé de hachage SHA-256 `embedding:<sha256>`).
* **Points d'appel dans le code** :
  * **Ingestion asynchrone** ([ingestion.py](file:///d:/rag-platform/backend/app/services/ingestion.py#L51-L53)) : calcul vectoriel par lot sur l'ensemble des chunks du document.
  * **Recherche vectorielle & hybride** ([chat.py](file:///d:/rag-platform/backend/app/api/routes/chat.py#L108-L141), [retrieval.py](file:///d:/rag-platform/backend/app/api/routes/retrieval.py#L24-L58)) : vectorisation de la question utilisateur et des reformulations.
  * **Évaluation de benchmark** ([runner.py](file:///d:/rag-platform/backend/app/evaluation/runner.py#L69)) : vectorisation des questions du jeu de données de test.

---

### 1.3. Reranker

* **SDK / Provider** : [LLMReranker](file:///d:/rag-platform/backend/app/services/reranking.py#L26-L71) utilisant l'instance `ChatProvider` courante.
* **Fonctionnement** : Un prompt système contraint le LLM à répondre par la séquence ordonnée d'indices (ex: `3,1,4,2`), avec repli immédiat et gracieux sur l'ordre initial en cas de non-respect du format ou d'indisponibilité.

---

## 2. Celery & Tâches Asynchrones

* **Application Celery** :
  * Définie dans [worker.py](file:///d:/rag-platform/backend/app/worker.py) :
    ```python
    celery_app = Celery(
        "rag_platform",
        broker=settings.redis_url,
        backend=settings.redis_url,
        include=[
            "app.tasks.ingestion_task",
            "app.tasks.email_task",
        ],
    )
    ```
* **Tâches déclarées** :
  1. `ingestion.run_ingestion` ([ingestion_task.py](file:///d:/rag-platform/backend/app/tasks/ingestion_task.py#L5-L21)) :
     * Exécute `run_ingestion(document_id, job_id)` de [ingestion.py](file:///d:/rag-platform/backend/app/services/ingestion.py).
     * Pipeline d'ingestion : MinIO download $\to$ extraction de texte $\to$ nettoyage $\to$ chunking $\to$ calcul des embeddings $\to$ stockage PostgreSQL / pgvector $\to$ invalidation du cache BM25.
  2. `email.send_invitation` ([email_task.py](file:///d:/rag-platform/backend/app/tasks/email_task.py#L5-L16)) :
     * Envoi d'emails d'invitation aux workspaces via SMTP.
* **Commande de démarrage du worker** :
  * Utilisée dans [docker-compose.yml](file:///d:/rag-platform/docker-compose.yml#L111) et [docker-compose.prod.yml](file:///d:/rag-platform/docker-compose.prod.yml#L118) :
    ```bash
    celery -A app.worker.celery_app worker --loglevel=info
    ```

---

## 3. Pipeline RAG & Évaluation Automatique

### 3.1. Étapes du Pipeline RAG ([chat.py](file:///d:/rag-platform/backend/app/api/routes/chat.py))

```mermaid
flowchart TD
    A[Question Utilisateur] --> B[Historique Conversationnel]
    B --> C[Query Rewriting LLM]
    C --> D{Mode de recherche}
    D -->|Standard| E[Dense pgvector HNSW + Sparse BM25]
    D -->|Query Expansion| F[Query Expansion LLM + Multi-Query Hybrid]
    E --> G[Reciprocal Rank Fusion RRF]
    F --> G
    G --> H{Candidats pertinents ?}
    H -->|Non score < MIN_SCORE| I[Refus Déterministe NO_CONTEXT]
    H -->|Oui| J{Rerank actif ?}
    J -->|Oui| K[LLM Reranker]
    J -->|Non| L[Top-K Direct]
    K --> M[Prompt Builder avec Citations [1], [2]]
    L --> M
    M --> N[Génération LLM - Sync ou Stream SSE]
    N --> O[Persistance Message & Citations]
```

### 3.2. Module d'Évaluation Automatique ([backend/app/evaluation/](file:///d:/rag-platform/backend/app/evaluation/))

* **Métriques de Retrieval** :
  * `Recall@K` : proportion des documents pertinents retrouvés.
  * `Precision@K` : fraction des documents retournés qui sont pertinents.
  * `MRR (Mean Reciprocal Rank)` : inverse du rang d'apparition du premier résultat pertinent.
* **Métriques de Génération (LLM-as-a-Judge)** :
  * `Faithfulness` (Fidélité au contexte fourni).
  * `Answer Relevance` (Pertinence par rapport à la question).
* **Exécution** :
  * `run_evaluation()` dans [runner.py](file:///d:/rag-platform/backend/app/evaluation/runner.py) exécute les questions d'un benchmark (ex: `eval/datasets/sample_benchmark_v1.json`), agrège les métriques, calcule les percentiles de latence (P95) et le taux d'erreur.

---

## 4. État des Endpoints `/health` et `/ready`

| Endpoint | Statut | Détails |
| :--- | :--- | :--- |
| `/health` | **Existe** | Présent dans [main.py](file:///d:/rag-platform/backend/app/main.py#L144-L166). Renvoie l'état (`status: "ok"`), l'environnement, le provider/modèle d'embedding, le modèle LLM et la consommation du spend cap mensuel. |
| `/ready` | **Inexistant** | Aucun endpoint de readiness probe dédié vérifiant la connectivité DB, Redis, MinIO ou Langfuse. |

---

## 5. Synthèse pour l'Instrumentation Langfuse

1. **Architecture & Déploiement** :
   * Déployer Langfuse v3 self-hosted via `docker-compose.yml` (`langfuse-web`, `langfuse-worker`, `clickhouse`, réutilisation du `redis`, `minio` avec bucket dédié `langfuse`, et base `postgres` dédiée `langfuse`).
2. **Configuration & Tolérance aux pannes** :
   * Variables : `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`, `LANGFUSE_ENABLED`.
   * En cas d'indisponibilité ou `LANGFUSE_ENABLED=false`, toutes les opérations RAG doivent continuer sans exception ni blocage.
3. **Traçage du cycle RAG** :
   * Créer une trace racine par requête RAG avec `user_id` et `session_id` (`conversation_id`).
   * Spans distincts : `query_rewriting`, `query_expansion`, `retrieval` (vector/bm25/hybrid/rrf), `rerank`, `generation`.
   * Générations tracées avec métadonnées complètes : modèle, tokens prompt/completion, coût USD, latence.
4. **Traçage de l'Ingestion Celery** :
   * Tâche Celery instrumentée avec spans pour `extraction`, `cleaning`, `chunking`, `embedding`, `indexing`.
   * Appel explicite à `langfuse.flush()` à la fin des tâches et lors de l'arrêt du worker / de l'API.
5. **Gestion des Prompts & Évaluation** :
   * Centralisation des prompts système (`SYSTEM_PROMPT`, `QUERY_REWRITE_SYSTEM_PROMPT`, `QUERY_EXPANSION_SYSTEM_PROMPT`, `RERANK_SYSTEM_PROMPT`, `FAITHFULNESS_PROMPT`, `ANSWER_RELEVANCE_PROMPT`) avec fallback local.
   * Export des scores d'évaluation (`faithfulness`, `answer_relevance`, `recall_at_k`, etc.) vers les traces Langfuse.
