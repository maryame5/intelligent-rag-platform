from app.services.validation import detect_mismatched_signature


def test_valid_pdf_signature_is_not_flagged():
    data = b"%PDF-1.4\n%...reste du fichier..."
    assert detect_mismatched_signature("application/pdf", data) is False


def test_fake_pdf_without_pdf_header_is_flagged():
    # Un exécutable ou n'importe quel binaire renommé en .pdf n'aura pas cette signature.
    data = b"MZ\x90\x00\x03\x00\x00\x00"  # en-tête typique d'un exécutable Windows
    assert detect_mismatched_signature("application/pdf", data) is True


def test_valid_text_file_is_not_flagged():
    data = "Ceci est un texte tout à fait normal.".encode("utf-8")
    assert detect_mismatched_signature("text/plain", data) is False


def test_binary_content_declared_as_text_is_flagged():
    data = b"\x00\x01\x02\x03binary garbage"
    assert detect_mismatched_signature("text/plain", data) is True


def test_unknown_content_type_is_never_flagged():
    # La fonction ne connaît que les types listés dans ALLOWED_MIME_TYPES ;
    # validate_upload() a déjà rejeté les types non supportés avant.
    assert detect_mismatched_signature("image/png", b"whatever") is False


def test_valid_docx_signature_is_not_flagged():
    docx_content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    data = b"PK\x03\x04" + b"reste du zip..."
    assert detect_mismatched_signature(docx_content_type, data) is False


def test_fake_docx_without_zip_signature_is_flagged():
    docx_content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    data = b"ceci n'est pas un zip"
    assert detect_mismatched_signature(docx_content_type, data) is True


def test_valid_html_is_not_flagged():
    assert detect_mismatched_signature("text/html", b"<!DOCTYPE html><html></html>") is False
    assert detect_mismatched_signature("text/html", b"<p>fragment valide</p>") is False


def test_binary_content_declared_as_html_is_flagged():
    assert detect_mismatched_signature("text/html", b"\x00\x01\x02sans aucun chevron") is True


def test_valid_markdown_is_not_flagged():
    data = "# Titre\nContenu normal.".encode("utf-8")
    assert detect_mismatched_signature("text/markdown", data) is False
