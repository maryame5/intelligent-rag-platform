# Sprint 7 — Evaluation, Observability & CI/CD

## Quoi

Un harnais d'évaluation (Recall@K, Precision@K, MRR, faithfulness, answer relevance) sur
un dataset versionné, des métriques Prometheus (HTTP génériques + spécifiques RAG : tokens,
coût, durée d'ingestion, qualité), et un pipeline CI/CD renforcé (lint, tests avec seuil de
couverture, build Docker).

## Pourquoi

**Dataset versionné en JSON dans le repo git, pas en base de données** : "versionner les
datasets" (§6/§9 du cahier des charges) au sens le plus simple qui marche — un fichier JSON
suivi par git a déjà un historique de versions, un diff lisible, et peut être comparé entre
branches sans infrastructure supplémentaire. Le nom de fichier porte la version
(`sample_benchmark_v1.json`) pour que comparer "v1 vs v2" soit aussi simple que comparer deux
fichiers.

**Un gabarit de 3 questions, pas 50-100 remplies** : le cahier des charges demande un
benchmark de 50 à 100 questions, mais ça suppose de vraies knowledge bases avec du contenu
réel — écrire 80 questions/réponses sur des documents qui n'existent pas encore aurait
produit un dataset artificiel sans valeur. Le gabarit fourni montre le format exact attendu
(question, réponse attendue optionnelle, documents sources attendus) et couvre déjà les 3
cas structurants : question avec réponse factuelle précise, question sans réponse figée mais
avec vérité terrain de retrieval, et question hors périmètre (doit déclencher le refus
déterministe du Sprint 4, pas une réponse inventée). À étoffer jusqu'à 50-100 dès que de
vrais documents sont chargés.

**Recall@K/Precision@K retournent `None`, jamais `0`, quand il n'y a pas de vérité
terrain** : une question sans `expected_document_filenames` renseigné n'est pas une question
où le retrieval a "tout raté" — c'est une question qui n'a simplement pas de vérité terrain
pour cette métrique. Retourner 0 aurait silencieusement tiré la moyenne du benchmark vers le
bas pour une raison qui n'a rien à voir avec la qualité du système. `mean_ignoring_none()`
exclut ces valeurs plutôt que de les traiter comme des échecs.

**LLM-as-judge pour faithfulness/relevance, avec les limites assumées** : il n'existe pas
de moyen automatique et gratuit de vérifier qu'une réponse en langage naturel est
factuellement fidèle à son contexte sans repasser par un LLM pour en juger. C'est
l'approche standard de l'industrie (RAGAS et similaires fonctionnent pareil), mais elle a un
biais réel : un LLM qui juge un autre LLM (ou lui-même) hérite de ses propres angles morts.
Ces scores servent à **comparer des configurations entre elles** (chunking A vs B, reranker
on/off) sur le même dataset — pas à certifier qu'une réponse est correcte dans l'absolu.
Documenté explicitement dans le code, pas juste ici.

**Prometheus + `prometheus-fastapi-instrumentator`, pas une solution custom** : les
métriques HTTP génériques (latence par endpoint, taux d'erreur, throughput — exactement ce
que le cahier des charges demande en "Engineering" au §9) sont un besoin standard que cette
librairie couvre en une ligne, avec le format d'export que Grafana consomme nativement. Les
métriques spécifiquement RAG (tokens, coût, durée d'ingestion, faithfulness) sont ajoutées à
la main dans `app/core/metrics.py`, câblées directement dans les providers d'embeddings/
génération — pas de couche d'abstraction supplémentaire, juste des `Counter`/`Histogram`
incrémentés au bon endroit.

**CI avec un seuil de couverture, pas juste "les tests passent"** : un seuil de couverture
(60%, volontairement conservateur vu l'ampleur du projet) empêche qu'un futur sprint ajoute
du code sans aucun test associé sans que ça se voie. Le lint (`ruff`) tourne en premier
(`needs` dans le workflow) pour échouer vite sur des erreurs triviales avant de lancer des
tests plus longs. Le build Docker valide que le `Dockerfile` fonctionne réellement — un
`requirements.txt` qui marche en local peut très bien échouer dans l'image si une dépendance
système manque, et ça ne se voit qu'au build.

## Comment

**Évaluation** (`app/evaluation/`) :
- `metrics.py` — Recall@K, Precision@K, MRR (fonctions pures, testées isolément).
- `schema.py` — `EvaluationDataset`/`EvaluationQuestion` (Pydantic).
- `dataset_loader.py` — charge un dataset par nom (pas par chemin arbitraire — protection
  anti path-traversal même sur un endpoint admin).
- `llm_judge.py` — `score_faithfulness()`, `score_answer_relevance()`.
- `cost_tracking.py` (dans `app/services/`, réutilisé ici et par les métriques Prometheus)
  — `estimate_cost()`, `estimate_tokens()` (repli si l'API ne renvoie pas de `usage`).
- `runner.py` — `run_evaluation()` orchestre tout : pour chaque question du dataset,
  retrieval (vector ou hybrid, avec ou sans rerank) → métriques retrieval → génération
  optionnelle → LLM-as-judge → agrégation (moyennes, MRR, P95 de latence, taux d'erreur).

**Déclenchement** : `POST /admin/evaluations/run` (réservé ADMIN — ça peut déclencher de
nombreux appels LLM, pas une opération à exposer aux USER) :
```json
{
  "knowledge_base_id": "...",
  "dataset_name": "sample_benchmark_v1",
  "top_k": 5,
  "mode": "hybrid",
  "rerank": true,
  "run_generation": true
}
```

**Observabilité** :
- `/metrics` (Prometheus) — métriques HTTP automatiques (`prometheus-fastapi-instrumentator`)
  + métriques custom (`app/core/metrics.py`) : `llm_requests_total`, `embedding_requests_total`,
  `llm_tokens_total`, `llm_cost_usd_total`, `ingestion_duration_seconds`,
  `rag_faithfulness_score`.
- `docker-compose.yml` — services `prometheus` (scrape `/metrics` toutes les 15s) et
  `grafana` (port 3000, connecter manuellement la datasource Prometheus au premier lancement
  — pas de dashboard pré-construit fourni, hors scope pour ce sprint).

**CI/CD** (`.github/workflows/ci.yml`) : `lint` (ruff) → `backend-tests` (pytest + coverage,
seuil 60%) → `backend-docker-build` (valide le `Dockerfile`), en parallèle `frontend-build`.

**Tester** :
```bash
pytest -v tests/test_evaluation_metrics.py tests/test_llm_judge.py \
  tests/test_cost_tracking.py tests/test_dataset_loader.py \
  tests/test_evaluation_runner.py tests/test_evaluation_endpoint.py \
  tests/test_prometheus_metrics.py
```

## Limites connues

- Le dataset d'exemple ne contient que 3 questions — à étoffer jusqu'à 50-100 avec de
  vrais documents avant de tirer des conclusions statistiquement solides d'un run.
- Aucun dashboard Grafana pré-construit n'est fourni — juste la connexion Prometheus/Grafana
  fonctionnelle, prête à recevoir des dashboards.
- Le seuil de couverture CI (60%) est un point de départ raisonnable, pas une science exacte
  — à ajuster si des zones critiques se révèlent insuffisamment testées.
- `estimate_tokens()` est une approximation grossière (~4 caractères/token) — un vrai
  tokenizer (tiktoken ou équivalent) donnerait un compte exact si le suivi de coût devait
  devenir précis (pertinent surtout si l'on bascule un jour sur un modèle payant).
