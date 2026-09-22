# Documentation par sprint

Chaque fichier ci-dessous répond à trois questions pour le sprint correspondant :
**quoi** a été construit, **pourquoi** ces choix plutôt que d'autres, **comment** ça
fonctionne concrètement (fichiers clés, flux, commandes de test).

C'est la référence à lire pour comprendre le projet sans avoir à relire tout le code —
en particulier les décisions d'architecture qui ne sont pas évidentes juste en lisant les
fichiers (pourquoi BackgroundTasks et pas Celery, pourquoi la similarité cosinus en mémoire
et pas pgvector, pourquoi le refus est codé en dur, etc.).

| Sprint | Sujet | Fichier |
|---|---|---|
| 0 | Cadrage & architecture | [sprint-00-cadrage.md](./sprints/sprint-00-cadrage.md) |
| 1 | Backend & Authentication | [sprint-01-auth.md](./sprints/sprint-01-auth.md) |
| 2 | Document ingestion | [sprint-02-ingestion.md](./sprints/sprint-02-ingestion.md) |
| 3 | Embeddings & Vector Retrieval | [sprint-03-embeddings-retrieval.md](./sprints/sprint-03-embeddings-retrieval.md) |
| 4 | RAG Generation & Chat | [sprint-04-generation-chat.md](./sprints/sprint-04-generation-chat.md) |
| 5 | Hybrid Search + Reranking | [sprint-05-hybrid-rerank.md](./sprints/sprint-05-hybrid-rerank.md) |
| 6 | Async, Tests & Security | [sprint-06-async-security.md](./sprints/sprint-06-async-security.md) |
| 7 | Evaluation, Observability & CI/CD | [sprint-07-evaluation-observability-cicd.md](./sprints/sprint-07-evaluation-observability-cicd.md) |

Les 8 sprints du planning initial sont maintenant tous documentés. Le backlog post-MVP
(§13 du cahier des charges) suit le même format, préfixé `backlog-` :

| # | Sujet | Fichier |
|---|---|---|
| 1 | Support DOCX/HTML/Markdown avancé | [backlog-01-docx-html-markdown.md](./sprints/backlog-01-docx-html-markdown.md) |
| 2 | Hybrid retrieval avancé & query expansion | [backlog-02-hybrid-query-expansion.md](./sprints/backlog-02-hybrid-query-expansion.md) |
| 3 | Streaming des réponses | [backlog-03-streaming.md](./sprints/backlog-03-streaming.md) |
| 4 | Feedback utilisateur & boucle d'amélioration | [backlog-04-feedback.md](./sprints/backlog-04-feedback.md) |

Pour la vue d'ensemble technique (schéma de données complet, flux d'ingestion et de chat
bout en bout), voir [`architecture.md`](./architecture.md). Pour le planning global,
voir [`roadmap.md`](./roadmap.md).

À mesure que les sprints suivants (6, 7...) seront réalisés, un fichier du même format sera
ajouté ici.
