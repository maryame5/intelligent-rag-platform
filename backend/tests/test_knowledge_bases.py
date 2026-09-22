def register_and_login(client, email, password="strongpass123"):
    client.post("/auth/register", json={"email": email, "password": password})
    login = client.post("/auth/login", json={"email": email, "password": password})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_kb_requires_authentication(client):
    response = client.post("/knowledge-bases", json={"name": "Docs RH"})
    assert response.status_code == 401


def test_create_and_list_kb(client):
    headers = register_and_login(client, "owner1@example.com")

    create = client.post("/knowledge-bases", json={"name": "Docs RH"}, headers=headers)
    assert create.status_code == 201
    assert create.json()["name"] == "Docs RH"

    listing = client.get("/knowledge-bases", headers=headers)
    assert listing.status_code == 200
    names = [kb["name"] for kb in listing.json()]
    assert "Docs RH" in names


def test_kb_isolation_between_users(client):
    """Un utilisateur ne doit jamais voir les knowledge bases d'un autre."""
    headers_a = register_and_login(client, "owner_a@example.com")
    headers_b = register_and_login(client, "owner_b@example.com")

    client.post("/knowledge-bases", json={"name": "Base privée A"}, headers=headers_a)

    listing_b = client.get("/knowledge-bases", headers=headers_b)
    assert listing_b.status_code == 200
    assert listing_b.json() == []  # B ne voit rien de A


def test_get_kb_not_owned_returns_404(client):
    headers_a = register_and_login(client, "owner_c@example.com")
    headers_b = register_and_login(client, "owner_d@example.com")

    created = client.post("/knowledge-bases", json={"name": "Base privée C"}, headers=headers_a)
    kb_id = created.json()["id"]

    response = client.get(f"/knowledge-bases/{kb_id}", headers=headers_b)
    assert response.status_code == 404  # jamais 403 : on ne révèle même pas l'existence
