from dataclasses import dataclass

DEFAULT_CHUNK_SIZE = 1000
DEFAULT_OVERLAP = 200


@dataclass
class ChunkResult:
    chunk_index: int
    content: str
    page: int | None
    section: str | None = None


def fixed_size_chunks(
    blocks: list[tuple[int, str | None, str]],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_OVERLAP,
) -> list[ChunkResult]:
    """Découpe le texte de chaque bloc (page ou section) en chunks de taille
    fixe avec chevauchement.

    Chaque bloc d'entrée est un triplet (page, section, texte) — `section` est
    None pour les formats qui n'en ont pas (PDF, TXT). Le chunking est fait
    bloc par bloc (pas sur le texte concaténé) pour que chaque chunk garde des
    métadonnées `page`/`section` fiables — nécessaire pour les citations
    (§6 du cahier des charges).
    """
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
            end = min(start + chunk_size, text_len)
            content = text[start:end].strip()
            if content:
                chunks.append(
                    ChunkResult(chunk_index=global_index, content=content, page=page_number, section=section)
                )
                global_index += 1

            if end == text_len:
                break
            start = end - overlap

    return chunks
