# Sprint 3 — Embeddings & Vector Retrieval

## Quoi

Génération d'embeddings pour chaque chunk, recherche sémantique par similarité cosinus,
avec Top-K configurable et filtrage par document.

## Pourquoi

**Un provider d'embeddings interchangeable, pas un appel API codé en dur** : le cahier
des charges (§9) veut pouvoir comparer plusieurs modèles d'embeddings entre eux. Si le code
appelait directement l'API d'un fournisseur, changer de modèle voudrait dire réécrire le
pipeline d'ingestion et la recherche. Avec une interface `EmbeddingProvider` (une seule
méthode `embed(texts) -> vectors`), changer de fournisseur ne touche qu'un point d'entrée
(`get_embedding_provider()`), jamais la logique métier.

**Recherche par similarité cosinus calculée en Python, pas via un moteur vectoriel
dédié (pgvector/Qdrant)** : décision volontaire, pas un oubli. Tant que le volume de chunks
par knowledge base reste modeste (quelques milliers), charger les candidats en mémoire et
les scorer en Python est largement suffisant, et ça évite d'ajouter un service
d'infrastructure avant d'en avoir réellement besoin. La limite est documentée explicitement
(`docs/architecture.md`) : si les benchmarks du Sprint 7 montrent un problème de latence à
l'échelle, la migration vers `pgvector` est immédiate (déjà sur PostgreSQL, pas de nouveau
service à ajouter à Docker Compose).

**Chaque chunk stocke le nom du modèle utilisé** (`embedding_model`) : indispensable pour
pouvoir comparer plusieurs modèles d'embeddings côte à côte plus tard sans avoir à
retraiter tout l'historique pour savoir quel vecteur vient de quel modèle.

## Comment

**`app/services/embeddings.py`** — interface `EmbeddingProvider`, implémentation par
défaut `OpenAIEmbeddingProvider` (compatible avec l'API OpenAI standard, donc utilisable
avec OpenRouter, Azure, ou tout service qui expose la même forme d'API).

**Pipeline d'ingestion étendu** (suite du Sprint 2) : après le chunking, un seul appel
batché calcule les embeddings de tous les chunks d'un document en une fois (plus efficace
qu'un appel par chunk), stockés en JSON sur `chunks.embedding`.

**`app/services/retrieval.py`** — `cosine_similarity(a, b)` (fonction pure, testée
indépendamment) et `search_chunks(db, kb_id, query_embedding, top_k, document_id)` : charge
les chunks candidats (filtrés par knowledge base, statut `READY`, document optionnel),
calcule leur score, retourne les `top_k` meilleurs.

**`POST /knowledge-bases/{id}/search`** — endpoint de recherche, prend une question en
texte, calcule son embedding, retourne les chunks les plus proches avec leur document
source et leur score.

**Tester** : `cosine_similarity` est testée avec des cas géométriques simples (vecteurs
identiques → 1.0, orthogonaux → 0.0, opposés → -1.0). La recherche de bout en bout est
testée avec un **provider d'embeddings factice déterministe** (représentation
"bag-of-words" sur un petit vocabulaire fixe) — ça permet de vérifier un vrai classement par
pertinence sans dépendre d'un modèle réel ni d'un accès réseau.

## Limites connues

- Pas de benchmark retrieval formalisé (Recall@K/Precision@K/MRR) à ce stade — prévu
  formellement au Sprint 7. Ce sprint ne fait que poser la mécanique de recherche.
- La similarité cosinus en mémoire ne scale pas indéfiniment (voir "Pourquoi" ci-dessus).
