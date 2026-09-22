from app.services.cost_tracking import estimate_cost, estimate_tokens


def test_free_model_costs_nothing():
    assert estimate_cost("z-ai/glm-5.2:free", input_tokens=10_000, output_tokens=5_000) == 0.0


def test_unknown_model_defaults_to_zero_cost():
    # On ne devine jamais un tarif pour un modèle inconnu : 0 plutôt qu'un
    # chiffre arbitraire qui fausserait le suivi de coût.
    assert estimate_cost("modele-jamais-vu", input_tokens=1_000_000, output_tokens=1_000_000) == 0.0


def test_estimate_tokens_never_returns_zero_for_nonempty_text():
    assert estimate_tokens("a") >= 1


def test_estimate_tokens_scales_with_length():
    short = estimate_tokens("bonjour")
    long_text = estimate_tokens("bonjour " * 100)
    assert long_text > short
