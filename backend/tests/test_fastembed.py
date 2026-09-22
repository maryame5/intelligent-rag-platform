from unittest.mock import MagicMock, patch
import pytest

from app.services.embeddings import EmbeddingProviderError, FastEmbedEmbeddingProvider


def test_fastembed_empty_input():
    provider = FastEmbedEmbeddingProvider(model_name="test-model")
    assert provider.embed([]) == []


def test_fastembed_embed_success():
    fake_model = MagicMock()
    # Simuler deux vecteurs numpy
    fake_vec1 = MagicMock()
    fake_vec1.tolist.return_value = [0.1, 0.2, 0.3]
    fake_vec2 = MagicMock()
    fake_vec2.tolist.return_value = [0.4, 0.5, 0.6]
    fake_model.embed.return_value = [fake_vec1, fake_vec2]

    with patch("app.services.embeddings.get_fastembed_model", return_value=fake_model):
        provider = FastEmbedEmbeddingProvider(model_name="test-model")
        results = provider.embed(["bonjour", "monde"])

    assert results == [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
    fake_model.embed.assert_called_once_with(["bonjour", "monde"])


def test_fastembed_embed_error_raises_embedding_provider_error():
    fake_model = MagicMock()
    fake_model.embed.side_effect = RuntimeError("ONNX failure")

    with patch("app.services.embeddings.get_fastembed_model", return_value=fake_model):
        provider = FastEmbedEmbeddingProvider(model_name="test-model")
        with pytest.raises(EmbeddingProviderError, match="Erreur lors du calcul d'embeddings local"):
            provider.embed(["bonjour"])
