# Roadmap — 8 sprints

| Sprint | Focus | Statut |
|---|---|---|
| 0 | Cadrage & architecture | ✅ squelette initial |
| 1 | Backend & Authentication | ✅ auth JWT + refresh, RBAC, migrations Alembic, tests |
| 2 | Document ingestion | ✅ upload validé, MinIO, extraction PDF/TXT, cleaning, chunking, jobs de suivi |
| 3 | Embeddings & Vector Retrieval | ✅ provider d'embeddings interchangeable, recherche cosinus, Top-K, filtrage par document |
| 4 | RAG Generation & Chat | ✅ génération grounded (OpenRouter/GLM 5.2), citations, historique, réécriture de requête, refus déterministe |
| 5 | Hybrid Search + Reranking | ✅ BM25 + fusion RRF, reranker LLM avec repli sûr, endpoint /search comparatif (vector/hybrid, rerank on/off) |
| 6 | Async, Tests & Security | ✅ Celery pour de vrai, retries, cache Redis embeddings, rate limiting, pagination, anti-usurpation fichier, logs structurés |
| 7 | Evaluation, Observability & CI/CD | ✅ Recall@K/Precision@K/MRR, faithfulness LLM-as-judge, Prometheus/Grafana, CI avec lint+coverage+build Docker |

Les 8 sprints du planning initial sont terminés. Voir `docs/sprints/` pour le détail
quoi/pourquoi/comment de chaque sprint, et le §13 du cahier des charges pour le backlog futur
(OCR, multi-tenant, SSO, streaming, A/B testing des prompts, Kubernetes...).
| 2 | Document ingestion | ⬜ |
| 3 | Embeddings & Vector Retrieval | ⬜ |
| 4 | RAG Generation & Chat | ⬜ |
| 5 | Hybrid Search + Reranking | ⬜ |
| 6 | Async, Tests & Security | ⬜ |
| 7 | Evaluation, Observability & CI/CD | ⬜ |

Détails complets dans le cahier des charges.

## Routine par sprint
1. Planification + design (J1)
2. Implémentation (J2-4)
3. Tests + refactoring (J5)
4. Intégration + documentation (J6)
5. Demo + bilan + backlog suivant (J7)

Règle : ne jamais démarrer une nouvelle fonctionnalité majeure avant que l'incrément précédent soit stable.
