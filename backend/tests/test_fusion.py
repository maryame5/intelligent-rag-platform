from dataclasses import dataclass

from app.services.fusion import reciprocal_rank_fusion


@dataclass
class _FakeChunk:
    id: str


@dataclass
class _FakeDocument:
    filename: str


def test_item_ranked_first_in_both_lists_wins():
    a = (_FakeChunk("a"), _FakeDocument("a.txt"), 0.9)
    b = (_FakeChunk("b"), _FakeDocument("b.txt"), 0.8)

    fused = reciprocal_rank_fusion([[a, b], [a, b]])
    assert [c.id for c, _d, _s in fused] == ["a", "b"]


def test_item_only_in_one_list_still_appears():
    a = (_FakeChunk("a"), _FakeDocument("a.txt"), 0.9)
    b = (_FakeChunk("b"), _FakeDocument("b.txt"), 0.8)

    fused = reciprocal_rank_fusion([[a], [b]])
    ids = {c.id for c, _d, _s in fused}
    assert ids == {"a", "b"}


def test_consensus_across_lists_beats_appearing_in_only_one_list():
    a = (_FakeChunk("a"), _FakeDocument("a.txt"), 0.9)
    b = (_FakeChunk("b"), _FakeDocument("b.txt"), 0.8)
    c = (_FakeChunk("c"), _FakeDocument("c.txt"), 0.7)

    # "c" est 1er... mais uniquement dans la première liste (absent de la seconde).
    # "b" est bien classé (mais pas 1er) dans les deux listes : la fusion doit
    # le faire gagner malgré son absence de rang n°1 individuel.
    fused = reciprocal_rank_fusion([[c, b, a], [b, a]])
    ids_in_order = [chunk.id for chunk, _doc, _score in fused]
    assert ids_in_order[0] == "b"


def test_empty_lists_return_empty_result():
    assert reciprocal_rank_fusion([]) == []
    assert reciprocal_rank_fusion([[], []]) == []
