import pytest

from app.services.validation import FileValidationError, validate_upload


def test_valid_pdf_passes():
    validate_upload("rapport.pdf", "application/pdf", 1024)


def test_valid_txt_passes():
    validate_upload("notes.txt", "text/plain", 512)


def test_valid_markdown_passes():
    validate_upload("readme.md", "text/markdown", 512)


def test_valid_html_passes():
    validate_upload("page.html", "text/html", 512)


def test_valid_docx_passes():
    docx_content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    validate_upload("rapport.docx", docx_content_type, 2048)


def test_rejects_unsupported_mime_type():
    with pytest.raises(FileValidationError):
        validate_upload("image.png", "image/png", 1024)


def test_rejects_empty_file():
    with pytest.raises(FileValidationError):
        validate_upload("vide.txt", "text/plain", 0)


def test_rejects_oversized_file():
    too_big = 21 * 1024 * 1024
    with pytest.raises(FileValidationError):
        validate_upload("gros.pdf", "application/pdf", too_big)


def test_rejects_missing_filename():
    with pytest.raises(FileValidationError):
        validate_upload("", "application/pdf", 1024)
