def recall_at_k(retrieved: list, relevant: set, k: int) -> float | None:
    """Proportion des documents pertinents effectivement retrouvés dans le Top-K.
    Retourne None si l'ensemble des documents pertinents est vide — la question
    n'a pas de vérité terrain exploitable, on ne peut pas calculer de recall
    (et surtout pas prétendre que c'est 0 ou 1, ce serait trompeur)."""
    if not relevant:
        return None
    top_k = set(retrieved[:k])
    return len(top_k & relevant) / len(relevant)


def precision_at_k(retrieved: list, relevant: set, k: int) -> float | None:
    """Proportion des K résultats retournés qui sont effectivement pertinents."""
    if not relevant:
        return None
    if k <= 0:
        return None
    top_k = retrieved[:k]
    if not top_k:
        return 0.0
    return len(set(top_k) & relevant) / len(top_k)


def reciprocal_rank(retrieved: list, relevant: set) -> float:
    """1/rang du premier résultat pertinent trouvé, 0 si aucun. Une seule requête ;
    la Mean Reciprocal Rank (MRR) est la moyenne de cette valeur sur tout un
    benchmark — voir `mean_reciprocal_rank`."""
    if not relevant:
        return 0.0
    for rank, item in enumerate(retrieved, start=1):
        if item in relevant:
            return 1.0 / rank
    return 0.0


def mean_reciprocal_rank(retrieved_lists: list[list], relevant_sets: list[set]) -> float:
    """MRR agrégée sur plusieurs requêtes (un benchmark entier)."""
    if not retrieved_lists:
        return 0.0
    scores = [reciprocal_rank(r, rel) for r, rel in zip(retrieved_lists, relevant_sets)]
    return sum(scores) / len(scores)


def mean_ignoring_none(values: list[float | None]) -> float | None:
    """Moyenne d'une liste qui peut contenir des None (questions sans vérité
    terrain de retrieval, ou score LLM-judge non parsable) — les None sont
    exclus plutôt que traités comme 0, ce qui fausserait la moyenne vers le bas."""
    usable = [v for v in values if v is not None]
    if not usable:
        return None
    return sum(usable) / len(usable)


def percentile(values: list[float], p: float) -> float:
    """Percentile simple par interpolation la plus proche (suffisant pour un
    P95 de latence sur un benchmark de quelques dizaines de questions — pas
    besoin d'une librairie de stats dédiée pour ça)."""
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round(p / 100 * (len(ordered) - 1))))
    return ordered[index]
