# Production RAG Platform

[![CI](https://github.com/maryame5/intelligent-rag-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/maryame5/intelligent-rag-platform/actions/workflows/ci.yml)

Système RAG production-ready : ingestion de documents, retrieval hybride (vector + BM25), reranking,
génération grounded avec citations, évaluation automatique, observabilité et CI/CD.

## Stack
- **Frontend** : React + TypeScript + Vite + Tailwind
- **Backend** : FastAPI + Pydantic + SQLAlchemy
- **Data** : PostgreSQL (recherche vectorielle) + Redis + MinIO
- **Async** : Celery + Redis
- **Infra** : Docker Compose + GitHub Actions
- **Observability** : Prometheus + Grafana + logs structurés

## Démarrage rapide

```bash
cp .env.example .env
docker compose up -d --build
```

- API : http://localhost:8000/docs
- Frontend : http://localhost:5173
- MinIO console : http://localhost:9001

## Structure

```
backend/        API FastAPI (auth, knowledge bases, documents, RAG)
frontend/       Application React
infrastructure/ Config docker/CI/monitoring
docs/           Architecture, ADRs, notes de sprint
```

## Documentation par sprint

Voir `docs/sprints/README.md` pour une documentation détaillée (quoi/pourquoi/comment) de
chaque sprint réalisé — la référence pour comprendre le projet sans relire tout le code.

## Roadmap

Voir `docs/roadmap.md` — 8 sprints d'une semaine, du squelette au système observable et évalué.

## Sprint actuel

Les 8 sprints du planning initial sont terminés (voir `docs/sprints/` pour le détail de
chacun). Le projet est présenté comme une démo publique d'un système RAG hybride évalué ;
les métriques sans données observées sont affichées comme indisponibles plutôt qu'inventées.
