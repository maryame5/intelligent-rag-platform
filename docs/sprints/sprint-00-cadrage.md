# Sprint 0 — Cadrage & architecture

## Quoi

Le squelette exécutable du projet : structure de repo, Docker Compose, stack technique
choisie, modèle de données initial (`User`, `KnowledgeBase`, `Document`).

## Pourquoi

Le cahier des charges est explicite (§15) : avoir un squelette qui tourne en local **avant**
de toucher au LLM. L'idée est d'éviter le piège classique du "projet RAG" qui commence par
brancher un modèle et improvise l'infrastructure autour au fur et à mesure — ça produit un
prototype, pas un produit. Ici, l'ordre est inversé : d'abord une base solide (auth, base de
données, conteneurs), le RAG vient après.

Stack retenue et pourquoi :
- **FastAPI** : typé, rapide à documenter (`/docs` auto-généré), écosystème mature pour de
  l'IA (compatible avec à peu près tout ce dont on aura besoin plus tard).
- **PostgreSQL** : relationnel, fiable, et — décision qui ne se voit qu'au Sprint 3 — permet
  d'ajouter `pgvector` plus tard sans introduire un nouveau service d'infrastructure.
- **MinIO** : stockage objet compatible S3, pour ne pas stocker les fichiers uploadés dans
  la base de données ni sur le disque du conteneur applicatif.
- **Docker Compose** : un seul `docker compose up` doit suffire à faire tourner tout
  l'écosystème (Postgres, Redis, MinIO, backend, frontend) en local.

## Comment

```
rag-platform/
├── docker-compose.yml       # Postgres, Redis, MinIO, backend, frontend
├── backend/
│   └── app/
│       ├── main.py          # point d'entrée FastAPI
│       ├── core/config.py   # settings (variables d'environnement)
│       ├── core/security.py # hashing mot de passe, JWT
│       ├── db/               # session SQLAlchemy, Base déclarative
│       ├── models/           # User, KnowledgeBase, Document (SQLAlchemy)
│       ├── schemas/           # Pydantic (validation entrée/sortie API)
│       └── api/routes/        # endpoints FastAPI
├── frontend/                  # squelette Vite + React + TS + Tailwind
└── docs/                      # cette documentation
```

**Démarrer le projet** :
```bash
cp .env.example .env
docker compose up -d --build
```
API sur `http://localhost:8000/docs`, frontend sur `http://localhost:5173`.

## Limites connues à ce stade

- Le frontend initial n'était qu'un squelette (appel de `/health` pour vérifier la connexion). Le
  frontend complet est développé avec TanStack Start et React.
- Pas encore de migrations Alembic à ce stade (arrivées au Sprint 1) — les tables sont
  créées via `Base.metadata.create_all()` implicitement par les tests, pas en production.
