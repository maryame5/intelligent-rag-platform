import pytest

from app.services.chunking import fixed_size_chunks


def test_empty_pages_produce_no_chunks():
    assert fixed_size_chunks([]) == []
    assert fixed_size_chunks([(1, None, "")]) == []
    assert fixed_size_chunks([(1, None, "   ")]) == []


def test_short_text_produces_single_chunk():
    chunks = fixed_size_chunks([(1, None, "Bonjour le monde.")], chunk_size=1000, overlap=200)
    assert len(chunks) == 1
    assert chunks[0].content == "Bonjour le monde."
    assert chunks[0].page == 1
    assert chunks[0].section is None
    assert chunks[0].chunk_index == 0


def test_long_text_is_split_with_overlap():
    text = "a" * 2500
    chunks = fixed_size_chunks([(1, None, text)], chunk_size=1000, overlap=200)

    # starts: 0 (len 1000), 800 (len 1000), 1600 (len 900, s'arrête à la fin du
    # texte) -> 3 chunks. Le dernier chunk n'est pas forcément plein : il couvre
    # simplement le reste du texte une fois qu'on atteint la fin.
    assert len(chunks) == 3
    assert all(len(c.content) <= 1000 for c in chunks)
    assert [c.chunk_index for c in chunks] == list(range(len(chunks)))
    assert len(chunks[-1].content) == 900


def test_page_metadata_preserved_across_pages():
    chunks = fixed_size_chunks(
        [(1, None, "Texte page un."), (2, None, "Texte page deux.")], chunk_size=1000, overlap=200
    )
    pages = [c.page for c in chunks]
    assert pages == [1, 2]


def test_chunk_index_is_global_not_reset_per_page():
    blocks = [(1, None, "a" * 1500), (2, None, "b" * 1500)]
    chunks = fixed_size_chunks(blocks, chunk_size=1000, overlap=200)
    indices = [c.chunk_index for c in chunks]
    assert indices == list(range(len(chunks)))  # jamais de reset à 0 sur la page 2


def test_chunk_size_must_exceed_overlap():
    with pytest.raises(ValueError):
        fixed_size_chunks([(1, None, "peu importe")], chunk_size=100, overlap=100)


def test_section_metadata_is_preserved():
    blocks = [(1, "Introduction", "Texte de l'intro."), (1, "Conclusion", "Texte de la conclusion.")]
    chunks = fixed_size_chunks(blocks, chunk_size=1000, overlap=200)
    sections = [c.section for c in chunks]
    assert sections == ["Introduction", "Conclusion"]


def test_section_can_be_none_while_page_is_set():
    chunks = fixed_size_chunks([(3, None, "Texte de page 3 sans section.")])
    assert chunks[0].page == 3
    assert chunks[0].section is None
