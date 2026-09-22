def test_login_rate_limit_triggers_429_beyond_threshold(client):
    """La route /auth/login est limitée à 10/minute. On envoie volontairement
    11 requêtes pour vérifier que la 11e est bien bloquée."""
    client.post("/auth/register", json={"email": "ratelimit1@example.com", "password": "strongpass123"})

    responses = [
        client.post(
            "/auth/login", json={"email": "ratelimit1@example.com", "password": "wrongpassword"}
        )
        for _ in range(11)
    ]

    statuses = [r.status_code for r in responses]
    assert 429 in statuses
    # Toutes les requêtes avant la limite doivent être traitées normalement (401 ici,
    # puisque le mot de passe est volontairement faux) — jamais bloquées avant l'heure.
    assert statuses[:10] == [401] * 10


def test_register_rate_limit_triggers_429_beyond_threshold(client):
    responses = [
        client.post(
            "/auth/register",
            json={"email": f"ratelimit_reg_{i}@example.com", "password": "strongpass123"},
        )
        for i in range(11)
    ]

    statuses = [r.status_code for r in responses]
    assert 429 in statuses


def test_rate_limit_response_has_useful_message(client):
    for _ in range(10):
        client.post("/auth/login", json={"email": "whoever@example.com", "password": "x"})

    response = client.post("/auth/login", json={"email": "whoever@example.com", "password": "x"})
    assert response.status_code == 429
    assert "detail" in response.json()


def test_rate_limit_is_reset_between_tests(client):
    """Vérifie que la fixture de reset fonctionne : ce test, exécuté après les
    précédents qui ont saturé la limite, doit repartir avec un quota complet."""
    response = client.post(
        "/auth/register", json={"email": "fresh_quota@example.com", "password": "strongpass123"}
    )
    assert response.status_code == 201
