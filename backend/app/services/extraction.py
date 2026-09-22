import io
import re

from bs4 import BeautifulSoup
from docx import Document as DocxDocument
from pypdf import PdfReader

# Chaque bloc extrait est un triplet (numéro_de_page, section, texte_brut).
# `section` est None pour les formats sans structure de titres exploitable
# (PDF, TXT) ; renseigné pour DOCX/HTML/Markdown, dont les titres donnent une
# granularité de citation plus fine ("section X du document Y", pas juste
# "page X"). Le champ `Chunk.section` existe depuis le Sprint 2 mais n'était
# jamais rempli avant ce support multi-formats.
ExtractedBlock = tuple[int, str | None, str]

_HEADING_PATTERN = re.compile(r"^#{1,6}\s+(.+)$", re.MULTILINE)
_HTML_HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
_HTML_CONTENT_TAGS = {"p", "li"}


class ExtractionError(Exception):
    """Levée quand le texte ne peut pas être extrait du fichier."""


def _split_by_markdown_headings(text: str) -> list[ExtractedBlock]:
    matches = list(_HEADING_PATTERN.finditer(text))
    if not matches:
        return [(1, None, text)]

    blocks: list[ExtractedBlock] = []

    preamble = text[: matches[0].start()].strip()
    if preamble:
        blocks.append((1, None, preamble))

    for i, match in enumerate(matches):
        section_title = match.group(1).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        section_text = text[start:end].strip()
        if section_text:
            blocks.append((1, section_title, section_text))

    return blocks


def extract_pages_from_pdf(data: bytes) -> list[ExtractedBlock]:
    """PDF : pas de notion de section exploitable simplement (nécessiterait
    d'analyser la mise en forme des polices/tailles) -> section=None partout,
    la granularité vient de la page."""
    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as exc:
        raise ExtractionError(f"PDF illisible ou corrompu : {exc}") from exc

    blocks: list[ExtractedBlock] = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        blocks.append((i + 1, None, text))
    return blocks


def extract_pages_from_txt(data: bytes) -> list[ExtractedBlock]:
    text = data.decode("utf-8", errors="replace")
    return [(1, None, text)]


def extract_pages_from_markdown(data: bytes) -> list[ExtractedBlock]:
    """Découpe par titres Markdown (#, ##...) : chaque section devient un bloc
    distinct avec son titre en métadonnée. Pas de notion de "page" dans un
    fichier Markdown -> page=1 partout, la granularité vient de `section`."""
    text = data.decode("utf-8", errors="replace")
    return _split_by_markdown_headings(text)


def extract_pages_from_html(data: bytes) -> list[ExtractedBlock]:
    """Découpe par titres HTML (h1-h6) en parcourant le DOM directement — pas
    en regex sur le texte extrait, puisque les balises de titre disparaissent
    dès qu'on aplati le HTML en texte brut.

    Limite connue : heuristique simple (paragraphes et listes rattachés au
    dernier titre vu), pas un vrai parseur de structure de document. Une page
    HTML avec une mise en page complexe (tableaux imbriqués, sections
    multiples sans balises de titre claires) sera moins bien découpée."""
    try:
        soup = BeautifulSoup(data, "html.parser")
    except Exception as exc:
        raise ExtractionError(f"HTML illisible : {exc}") from exc

    for tag in soup(["script", "style"]):
        tag.decompose()

    blocks: list[ExtractedBlock] = []
    current_section: str | None = None
    current_text: list[str] = []

    def flush():
        text = "\n".join(current_text).strip()
        if text:
            blocks.append((1, current_section, text))

    for element in soup.find_all(_HTML_HEADING_TAGS | _HTML_CONTENT_TAGS):
        if element.name in _HTML_HEADING_TAGS:
            flush()
            current_text = []
            current_section = element.get_text(strip=True)
        else:
            text = element.get_text(strip=True)
            if text:
                current_text.append(text)

    flush()

    if not blocks:
        # Pas de <p>/<li>/titres détectés (page très simple, texte flottant
        # directement dans <body> ou <div>) : on prend tout le texte brut
        # plutôt que de retourner un document vide.
        full_text = soup.get_text(separator="\n").strip()
        blocks = [(1, None, full_text)]

    return blocks


def extract_pages_from_docx(data: bytes) -> list[ExtractedBlock]:
    """DOCX : pas de "page" fiable via python-docx (les sauts de page ne sont
    pas exposés de façon exploitable dans l'API) -> page=1 partout. Les styles
    "Heading"/"Title" des paragraphes servent à découper par section, ce qui
    correspond à la structure réelle d'un document Word bien formaté."""
    try:
        document = DocxDocument(io.BytesIO(data))
    except Exception as exc:
        raise ExtractionError(f"DOCX illisible ou corrompu : {exc}") from exc

    blocks: list[ExtractedBlock] = []
    current_section: str | None = None
    current_text: list[str] = []

    def flush():
        text = "\n".join(current_text).strip()
        if text:
            blocks.append((1, current_section, text))

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue
        style_name = paragraph.style.name if paragraph.style else ""
        if style_name.startswith("Heading") or style_name.startswith("Title"):
            flush()
            current_text = []
            current_section = text
        else:
            current_text.append(text)

    flush()
    return blocks


def extract_pages(data: bytes, mime_type: str) -> list[ExtractedBlock]:
    if mime_type == "application/pdf":
        return extract_pages_from_pdf(data)
    if mime_type == "text/plain":
        return extract_pages_from_txt(data)
    if mime_type == "text/markdown":
        return extract_pages_from_markdown(data)
    if mime_type == "text/html":
        return extract_pages_from_html(data)
    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return extract_pages_from_docx(data)
    raise ExtractionError(f"Type MIME non pris en charge pour l'extraction : {mime_type}")
