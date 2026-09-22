import re


def clean_text(text: str) -> str:
    """Nettoyage du texte : supprime les octets nuls et caractères de contrôle,
    normalise les espaces Unicode (fines, insécables) et réduit les sauts de ligne multiples.
    """
    if not text:
        return ""

    # Supprime les caractères de contrôle non imprimables (ex: \x00-\x08, \x0b-\x0c, \x0e-\x1f, \x7f)
    text = re.sub(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]", "", text)
    # Normalise les espaces Unicode (espaces fines \u2009, insécables \u00a0, etc.)
    text = text.replace("\u2009", " ").replace("\u00a0", " ").replace("\u200b", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" *\n *", "\n", text)
    return text.strip()
