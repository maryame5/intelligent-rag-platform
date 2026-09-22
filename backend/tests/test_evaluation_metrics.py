from app.evaluation.metrics import (
    mean_ignoring_none,
    mean_reciprocal_rank,
    percentile,
    precision_at_k,
    recall_at_k,
    reciprocal_rank,
)


def test_recall_at_k_all_relevant_found():
    assert recall_at_k(["a", "b", "c"], {"a", "b"}, k=3) == 1.0


def test_recall_at_k_partial():
    assert recall_at_k(["a", "x", "y"], {"a", "b"}, k=3) == 0.5


def test_recall_at_k_none_when_no_ground_truth():
    assert recall_at_k(["a", "b"], set(), k=3) is None


def test_recall_at_k_respects_k_boundary():
    # "b" est pertinent mais hors du Top-1 : ne doit pas compter.
    assert recall_at_k(["a", "b"], {"b"}, k=1) == 0.0


def test_precision_at_k_basic():
    assert precision_at_k(["a", "b", "c"], {"a"}, k=3) == 1 / 3


def test_precision_at_k_none_when_no_ground_truth():
    assert precision_at_k(["a"], set(), k=1) is None


def test_precision_at_k_empty_retrieved_list():
    assert precision_at_k([], {"a"}, k=5) == 0.0


def test_reciprocal_rank_first_position():
    assert reciprocal_rank(["a", "b"], {"a"}) == 1.0


def test_reciprocal_rank_third_position():
    assert reciprocal_rank(["x", "y", "a"], {"a"}) == 1 / 3


def test_reciprocal_rank_zero_when_not_found():
    assert reciprocal_rank(["x", "y"], {"a"}) == 0.0


def test_reciprocal_rank_zero_when_no_ground_truth():
    assert reciprocal_rank(["a", "b"], set()) == 0.0


def test_mean_reciprocal_rank_aggregates_correctly():
    retrieved_lists = [["a", "b"], ["x", "a"]]
    relevant_sets = [{"a"}, {"a"}]
    # requête 1 : rang 1 -> 1.0 ; requête 2 : rang 2 -> 0.5 ; moyenne = 0.75
    assert mean_reciprocal_rank(retrieved_lists, relevant_sets) == 0.75


def test_mean_ignoring_none_excludes_none_values():
    assert mean_ignoring_none([1.0, None, 3.0]) == 2.0


def test_mean_ignoring_none_all_none_returns_none():
    assert mean_ignoring_none([None, None]) is None


def test_percentile_p95_on_sorted_values():
    values = list(range(1, 101))  # 1..100
    result = percentile([float(v) for v in values], 95)
    assert 94 <= result <= 96  # tolérance sur la méthode d'interpolation


def test_percentile_empty_list_returns_zero():
    assert percentile([], 95) == 0.0
