# Backlog §13 — Hybrid retrieval avancé & query expansion

## Quoi

Génération de reformulations de requête via le LLM (query expansion), recherche hybride
sur toutes les reformulations à la fois, fusionnées par Reciprocal Rank Fusion — et un vrai
bug de grounding corrigé au passage.

## Pourquoi

**Query expansion pour couvrir le vocabulaire, pas juste la sémantique** : les embeddings
capturent déjà une bonne partie de la similarité sémantique ("tarif" ≈ "prix"), mais BM25
(recherche lexicale) rate tout ce qui n'est pas un terme exact. Une question posée avec des
mots absents du document ("comment annuler mon abonnement ?" quand le document dit
"résiliation") peut rater le seuil BM25 entièrement et arriver limite côté vectoriel.
Générer 2-3 reformulations et chercher avec chacune, puis tout fusionner, couvre plus de
formulations sans changer l'algorithme de scoring lui-même.

**La requête originale est toujours incluse, jamais remplacée** : si l'appel LLM
d'expansion échoue ou renvoie n'importe quoi, `expand_query()` retombe sur `[query]` seule
— l'expansion est une amélioration du rappel, jamais une dépendance dont l'échec casserait
la recherche de base.

**Coût explicite, désactivé par défaut** : comme le reranking (Sprint 5), l'expansion
coûte un appel LLM supplémentaire par recherche. Sur `/chat`, `expand_query` reste à `false`
par défaut pour ne pas doubler la consommation du quota gratuit sans qu'on l'ait demandé.
Disponible via `expand_query: true` sur `/search` et `/chat`.

**Bug trouvé en écrivant les tests de cette fonctionnalité** : en factorisant le filtrage
de pertinence dans `_relevant_vector_candidates()`/`_relevant_keyword_candidates()` pour
les réutiliser entre `hybrid_search()` et la nouvelle `multi_query_hybrid_search()`, un test
sur un corpus de 2-3 documents a révélé (à nouveau) le cas dégénéré de BM25 déjà rencontré
au Sprint 5 : avec un tout petit corpus, l'IDF d'un terme peut devenir nulle ou négative,
donnant un score BM25 négatif à un terme pourtant réellement présent. Le filtre `score > 0`
rejetait alors à tort des résultats légitimes. Ce n'est pas un bug de *code* (le filtre lui
-même est correct), mais un piège de *test* : les tests utilisant un corpus trop petit pour
que BM25 se comporte normalement doivent toujours inclure quelques documents neutres de
remplissage — comme dans `test_bm25_search.py` (Sprint 5) et maintenant
`test_multi_query_search.py`.

## Comment

**`app/services/query_expansion.py`** — `expand_query(chat_provider, query)` : demande 3
reformulations au LLM, une par ligne, déduplique (entre elles et avec l'originale),
retourne toujours `[query, ...variantes]` avec l'originale en premier.

**`app/services/retrieval.py`** — refactorisé :
- `_relevant_vector_candidates()` / `_relevant_keyword_candidates()` : le filtrage par
  pertinence minimale (déjà introduit pour corriger le bug de grounding du Sprint 5),
  factorisé pour être partagé entre `hybrid_search()` (une requête) et la nouvelle
  `multi_query_hybrid_search()` (plusieurs requêtes).
- `multi_query_hybrid_search(db, kb_id, queries, query_embeddings, top_k, ...)` : lance
  vectoriel + BM25 pour CHAQUE reformulation, fusionne toutes les listes obtenues (RRF
  généralisée à N listes plutôt que 2 — la fonction `reciprocal_rank_fusion()` du Sprint 5
  acceptait déjà une liste de listes, aucun changement nécessaire côté fusion elle-même).

**`POST /knowledge-bases/{id}/search`** et **`POST /chat`** acceptent un nouveau champ
`expand_query: bool` (défaut `false`). Quand `true`, remplace le retrieval habituel par
`multi_query_hybrid_search()` sur les reformulations générées.

**Tester** :
```bash
pytest -v tests/test_query_expansion.py tests/test_multi_query_search.py \
  tests/test_query_expansion_endpoints.py
```

## Limites connues

- Les reformulations ne sont pas vérifiées sémantiquement (le LLM pourrait générer une
  reformulation qui dérive du sens original) — acceptable pour un gain de rappel, mais à
  garder en tête si la précision devient un problème plus important que le rappel.
- Chaque reformulation multiplie les appels de recherche (vectoriel + BM25) par variante —
  3 reformulations + l'originale = 4x le travail de retrieval (mais toujours 0 appel LLM
  supplémentaire pour le retrieval lui-même, seul l'appel d'expansion initial coûte).
