# Sprint 5 — Hybrid Search + Reranking

## Quoi

Recherche hybride (vectoriel + BM25 fusionnés), reranking par LLM, endpoint de recherche
comparatif, et bascule de `/chat` sur la recherche hybride par défaut.

## Pourquoi

**BM25 en complément du vectoriel, pas à sa place** : les embeddings excellent pour la
similarité sémantique ("congés" ≈ "vacances") mais peuvent lisser des termes exacts
importants (références de contrat, codes, acronymes). BM25 (recherche lexicale classique)
excelle justement là où les embeddings sont faibles. Combiner les deux couvre plus de cas
que l'un ou l'autre seul.

**Reciprocal Rank Fusion (RRF), pas une moyenne pondérée des scores** : un score cosinus
(0 à 1) et un score BM25 (Okapi, sans borne fixe) ne vivent pas sur la même échelle — les
moyenner directement demanderait une normalisation arbitraire. RRF fusionne les *rangs*
plutôt que les valeurs : chaque chunk reçoit `1/(k+rang)` dans chaque liste où il apparaît,
les scores se cumulent. Un chunk bien classé dans les deux listes gagne, même sans être
1er dans l'une d'elles — exactement le comportement souhaité pour de la fusion multi-source.

**Reranking par prompt LLM, pas par un modèle reranker dédié** : décision contrainte par
le choix de rester sur un plan gratuit. Les modèles reranker (type Nemotron Rerank VL)
nécessitent généralement un endpoint `/rerank` propriétaire, pas simplement
`/chat/completions` — aucun n'était disponible gratuitement sur une API standard dans le
catalogue retenu. À la place, le LLM de génération (GLM 5.2) reçoit la question et les
candidats numérotés, et renvoie l'ordre de pertinence. **Avec repli automatique** sur
l'ordre d'origine si la réponse n'est pas parsable ou si l'appel échoue — un reranker qui
casse la recherche serait pire que pas de reranker du tout.

**`/chat` bascule sur hybrid par défaut, mais pas sur rerank par défaut** : l'hybride
(BM25 + vectoriel) est "gratuit" — aucun appel LLM supplémentaire, juste du calcul en
mémoire. Le reranking, lui, coûte un appel LLM de plus à *chaque* message — sur un plan
gratuit rate-limité, l'imposer par défaut aurait doublé la consommation de quota pour un
gain incertain sans mesure. Le reranking reste donc disponible via un paramètre
(`rerank: true`) plutôt qu'activé silencieusement.

**Correctif post-livraison (trouvé en écrivant un test manuel bout-en-bout)** :
`hybrid_search()` renvoyait initialement le "meilleur" candidat technique même quand rien
n'était réellement pertinent — un chunk existant dans la KB obtenait toujours un score RRF
non nul simplement en faisant partie du top-k de l'une des deux méthodes, même avec un score
brut proche de 0. Concrètement : une knowledge base contenant un seul document sur la
politique de congés répondait quand même (de façon groundée en apparence) à "quelle est la
capitale de la Mongolie ?", cassant la garantie de refus déterministe qui est la propriété
la plus importante de tout le système. Corrigé en filtrant chaque liste de candidats
(cosinus >= 0.05, BM25 > 0 — un score BM25 strictement nul signifie zéro terme commun, pas
une heuristique arbitraire) **avant** la fusion RRF, pas après. Testé par
`test_hybrid_search_filters_out_irrelevant_candidates_before_fusion` et
`test_chat_hybrid_default_refuses_clearly_irrelevant_question`.

**Seuil de pertinence différent selon le mode** : le score RRF fusionné (échelle
~0.01-0.03) n'a rien à voir avec un cosinus (échelle 0-1). Le seuil `MIN_RELEVANCE_SCORE`
utilisé pour décider "contexte insuffisant" en mode vectoriel pur n'a donc aucun sens en
mode hybride — en hybride, seule l'absence totale de résultat déclenche le refus.

## Comment

**`app/services/bm25_search.py`** — BM25 Okapi calculé en mémoire (même philosophie que
la recherche vectorielle : suffisant tant que le volume par KB reste modeste).

**`app/services/fusion.py`** — `reciprocal_rank_fusion(result_lists, k=60)`.

**`app/services/retrieval.py`** — `hybrid_search()` orchestre : récupère `candidate_k`
candidats de chaque méthode (plus large que le `top_k` final, pour que la fusion ait
vraiment de quoi arbitrer), puis fusionne.

**`app/services/reranking.py`** — `LLMReranker.rerank(query, candidates)` : construit un
prompt listant les candidats, parse la réponse (liste de numéros séparés par virgules),
réordonne. Tout candidat non repris dans la réponse du LLM est ajouté à la fin plutôt que
perdu silencieusement.

**`POST /knowledge-bases/{id}/search`** accepte `mode` (`"vector"` / `"hybrid"`) et
`rerank` (bool) — permet la comparaison explicite demandée par le cahier des charges (§9) :
vector-only vs hybrid vs reranked, avec les mêmes documents.

**`POST /chat`** accepte maintenant `use_hybrid` (défaut `true`) et `rerank` (défaut
`false`).

**Tester** : fusion RRF et reranker testés en pur unitaire (candidats fictifs, provider de
chat scripté). Le pipeline complet est testé via l'API avec un chat provider factice qui
inverse déterministement l'ordre des candidats reçus — ça permet de vérifier que le
reranking change réellement l'ordre des résultats, pas seulement qu'il ne plante pas.

## Limites connues

- Le reranker LLM est limité à 20 candidats max par appel (`MAX_RERANK_CANDIDATES`) — au
  delà, le prompt deviendrait trop long et coûteux pour un gain marginal.
- Pas encore de mesure chiffrée de l'apport réel du hybrid/rerank sur la qualité des
  réponses (nécessite le benchmark du Sprint 7) — la bascule de `/chat` sur hybrid par
  défaut est une décision raisonnée mais pas encore validée par des métriques.
