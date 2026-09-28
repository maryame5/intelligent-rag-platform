import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_default_secret_is_allowed_in_development():
    Settings(environment="development", secret_key="change-me")


@pytest.mark.parametrize("secret", ["change-me", "", "trop-court"])
def test_weak_secret_rejected_in_production(secret):
    with pytest.raises(ValidationError):
        Settings(environment="production", secret_key=secret)


def test_strong_secret_accepted_in_production():
    Settings(environment="production", secret_key="a" * 40)