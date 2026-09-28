from dataclasses import dataclass

DEFAULT_CHUNK_SIZE = 1000
DEFAULT_OVERLAP = 200

# Séparateurs testés par ordre de préférence pour couper un chunk : fin de
# paragraphe, fin de phrase, saut de ligne, puis simple espace.
_BREAKS = ("\n\n", ". ", "? ", "! ", "\n", " ")


@dataclass
class ChunkResult:
    chunk_index: int
    content: str
    page: int | None
    section: str | None = None


def _snap_end(text: str, start: int, end: int, chunk_size: int) -> int:
    """Recule `end` jusqu'à la meilleure frontière (phrase, puis mot) située
    dans la seconde moitié de la fenêtre. Sans frontière (mot géant, texte
    sans espaces), on garde la coupe brute plutôt que de boucler."""
    if end >= len(text):
        return len(text)
    floor = start + chunk_size // 2
    window = text[floor:end]
    for sep in _BREAKS:
        idx = window.rfind(sep)
        if idx != -1:
            return floor + idx + len(sep)
    return end


def _snap_start(text: str, pos: int, end: int) -> int:
    """Avance `pos` jusqu'au début du mot suivant, pour que l'overlap ne
    commence pas au milieu d'un mot."""
    if pos <= 0 or text[pos - 1].isspace():
        return pos
    i = pos
    while i < end and not text[i].isspace():
        i += 1
    return i + 1 if i < end else pos


def fixed_size_chunks(
    blocks: list[tuple[int, str | None, str]],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_OVERLAP,
) -> list[ChunkResult]:
    """Découpe chaque bloc (page/section) en chunks d'environ `chunk_size`
    caractères avec chevauchement, en coupant sur des frontières de phrase
    ou de mot. La taille est donc un maximum, pas une valeur exacte."""
    if chunk_size <= overlap:
        raise ValueError("chunk_size doit être strictement supérieur à overlap.")

    chunks: list[ChunkResult] = []
    global_index = 0

    for page_number, section, raw_text in blocks:
        text = raw_text.strip()
        text_len = len(text)
        if text_len == 0:
            continue

        start = 0
        while start < text_len:
            end = _snap_end(text, start, min(start + chunk_size, text_len), chunk_size)
            content = text[start:end].strip()
            if content:
                chunks.append(
                    ChunkResult(chunk_index=global_index, content=content, page=page_number, section=section)
                )
                global_index += 1

            if end >= text_len:
                break

            next_start = _snap_start(text, end - overlap, end)
            start = next_start if next_start > start else end  # garde-fou anti-boucle

    return chunks
