ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/html": ".html",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


class FileValidationError(Exception):
    """Levée quand un fichier uploadé ne respecte pas les contraintes de type ou de taille."""


def validate_upload(filename: str, content_type: str | None, size_bytes: int) -> None:
    if not filename:
        raise FileValidationError("Nom de fichier manquant.")

    if content_type not in ALLOWED_MIME_TYPES:
        allowed = ", ".join(ALLOWED_MIME_TYPES.keys())
        raise FileValidationError(
            f"Type de fichier non supporté ({content_type}). Types acceptés : {allowed}."
        )

    if size_bytes == 0:
        raise FileValidationError("Le fichier est vide.")

    if size_bytes > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        raise FileValidationError(f"Fichier trop volumineux (max {max_mb} MB).")


def detect_mismatched_signature(content_type: str, data: bytes) -> bool:
    """Vérifie que le contenu réel du fichier correspond à son type MIME déclaré,
    plutôt que de faire confiance à l'en-tête Content-Type envoyé par le client
    (trivialement falsifiable — n'importe qui peut renommer un .exe en .pdf).
    Retourne True si une incohérence est détectée (fichier à rejeter).

    Volontairement basique : ce n'est pas un antivirus, juste un garde-fou
    contre le cas le plus évident (extension/mimetype usurpé)."""
    if content_type == "application/pdf":
        return not data.startswith(b"%PDF-")

    if content_type in ("text/plain", "text/markdown"):
        # Un fichier texte ne devrait pas contenir d'octet nul, signature
        # typique d'un contenu binaire déguisé.
        return b"\x00" in data[:1024]

    if content_type == "text/html":
        # Heuristique large plutôt que d'exiger un <!DOCTYPE html> strict : un
        # fragment HTML valide (juste <p>...</p>) est un fichier HTML légitime.
        return b"<" not in data[:200]

    if content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        # Un .docx est un fichier ZIP (Office Open XML) : signature PK.
        return not data.startswith(b"PK\x03\x04")

    return False
