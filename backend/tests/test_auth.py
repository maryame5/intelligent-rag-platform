def test_register_success(client):
    response = client.post("/auth/register", json={"email": "alice@example.com", "password": "strongpass123"})
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "alice@example.com"
    assert body["role"] == "USER"
    assert "hashed_password" not in body  # ne doit jamais fuiter


def test_register_duplicate_email_rejected(client):
    client.post("/auth/register", json={"email": "bob@example.com", "password": "strongpass123"})
    response = client.post("/auth/register", json={"email": "bob@example.com", "password": "anotherpass"})
    assert response.status_code == 400


def test_login_success_returns_token_pair(client):
    client.post("/auth/register", json={"email": "carol@example.com", "password": "strongpass123"})
    response = client.post("/auth/login", json={"email": "carol@example.com", "password": "strongpass123"})
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password_rejected(client):
    client.post("/auth/register", json={"email": "dave@example.com", "password": "strongpass123"})
    response = client.post("/auth/login", json={"email": "dave@example.com", "password": "wrongpassword"})
    assert response.status_code == 401


def test_login_unknown_email_rejected(client):
    response = client.post("/auth/login", json={"email": "ghost@example.com", "password": "whatever123"})
    assert response.status_code == 401


def test_me_requires_authentication(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user(client):
    client.post("/auth/register", json={"email": "erin@example.com", "password": "strongpass123"})
    login = client.post("/auth/login", json={"email": "erin@example.com", "password": "strongpass123"})
    token = login.json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "erin@example.com"


def test_refresh_issues_new_access_token(client):
    client.post("/auth/register", json={"email": "frank@example.com", "password": "strongpass123"})
    login = client.post("/auth/login", json={"email": "frank@example.com", "password": "strongpass123"})
    refresh_token = login.json()["refresh_token"]

    response = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_refresh_rejects_access_token_used_as_refresh(client):
    client.post("/auth/register", json={"email": "gina@example.com", "password": "strongpass123"})
    login = client.post("/auth/login", json={"email": "gina@example.com", "password": "strongpass123"})
    access_token = login.json()["access_token"]

    # Un access token ne doit pas être accepté à la place d'un refresh token.
    response = client.post("/auth/refresh", json={"refresh_token": access_token})
    assert response.status_code == 401


def test_refresh_rejects_garbage_token(client):
    response = client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert response.status_code == 401
