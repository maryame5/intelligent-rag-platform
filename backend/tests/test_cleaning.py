from app.services.cleaning import clean_text


def test_removes_null_bytes():
    assert "\x00" not in clean_text("bon\x00jour")


def test_collapses_multiple_spaces():
    assert clean_text("mot1    mot2\t\tmot3") == "mot1 mot2 mot3"


def test_collapses_excessive_newlines():
    result = clean_text("para1\n\n\n\n\npara2")
    assert result == "para1\n\npara2"


def test_strips_leading_trailing_whitespace():
    assert clean_text("   texte   ") == "texte"


def test_empty_input_returns_empty_string():
    assert clean_text("") == ""
    assert clean_text(None) == ""
