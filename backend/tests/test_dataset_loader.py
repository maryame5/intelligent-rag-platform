import pytest

from app.evaluation.dataset_loader import DatasetNotFoundError, load_dataset


def test_loads_sample_dataset_successfully():
    dataset = load_dataset("sample_benchmark_v1")
    assert dataset.name == "sample_benchmark"
    assert dataset.version == "v1"
    assert len(dataset.questions) >= 1


def test_missing_dataset_raises_not_found():
    with pytest.raises(DatasetNotFoundError):
        load_dataset("ce_dataset_n_existe_pas")


def test_path_traversal_attempt_is_neutralized():
    with pytest.raises(DatasetNotFoundError):
        load_dataset("../../../etc/passwd")
