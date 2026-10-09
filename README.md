# Production RAG Platform

[![CI](https://github.com/maryame5/intelligent-rag-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/maryame5/intelligent-rag-platform/actions/workflows/ci.yml)

Système RAG production-ready : ingestion de documents, retrieval hybride (vector + BM25), reranking,
génération grounded avec citations, évaluation automatique, observabilité et CI/CD.

## Stack

- **Frontend** : React + TypeScript + Vite + Tailwind — authentification, chat RAG, gestion des bases de connaissances, dashboard métriques
- **Backend** : FastAPI + Pydantic + SQLAlchemy
- **Data** : PostgreSQL (vecteurs JSON + BM25) + Redis + MinIO
- **Async** : Celery + Redis
- **Infra** : Docker Compose + Caddy (HTTPS) + GitHub Actions
- **Observability** : Prometheus + Grafana + logs structurés

## Démarrage rapide (dev)

```bash
cp .env.example .env
# Renseigner LLM_API_KEY dans .env (Groq gratuit : https://console.groq.com/keys)
docker compose up -d --build
```

- API docs : http://localhost:8000/docs
- Frontend : http://localhost:5173
- MinIO console : http://localhost:9001
- Flower (Monitoring Celery) : http://localhost:5555 (auth par défaut : `admin` / `admin`)
- Prometheus : http://localhost:9090
- Grafana : http://localhost:3001 (auth : `admin` / `admin`)
- Langfuse (LLM Tracing) : http://localhost:3000

## Déploiement production

```bash
cp .env.prod.example .env.prod
# Renseigner tous les secrets (SECRET_KEY, mots de passe, domaines, LLM_API_KEY)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Caddy gère automatiquement les certificats TLS Let's Encrypt. Aucun port de base de données
n'est exposé à l'extérieur.

## Architecture vectorielle

Les embeddings sont générés **localement** via FastEmbed (ONNX, CPU, sans API key, sans rate
limit). Le modèle par défaut est `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
(384 dims, multilangue). Le stockage et la recherche vectorielle s'appuient nativement sur
**PostgreSQL + pgvector** avec un index HNSW (`vector_cosine_ops`, O(log n)), assurant des temps
de réponse sous les 10 ms même sur des bases à large volume.

La recherche hybride combine la similarité vectorielle pgvector et la recherche textuelle BM25 via
Reciprocal Rank Fusion (RRF), suivi d'un reranking optionnel.

> **Note :** changer de modèle d'embedding (`LOCAL_EMBEDDING_MODEL`) après indexation nécessite
> de réindexer tous les documents (dimensions différentes). La config est validée au démarrage.

## Structure

```
backend/        API FastAPI (auth, knowledge bases, documents, RAG)
frontend/       Application React (UI complète : chat, KB, dashboard, admin)
infrastructure/ Config Caddy, Prometheus
docs/           Architecture, ADRs, notes de sprint
```

## Documentation par sprint

Voir `docs/sprints/README.md` pour une documentation détaillée (quoi/pourquoi/comment) de
chaque sprint réalisé — la référence pour comprendre le projet sans relire tout le code.

## Roadmap

Voir `docs/roadmap.md` — 8 sprints d'une semaine, du squelette au système observable et évalué.



