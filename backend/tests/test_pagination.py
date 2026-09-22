def register_and_login(client, email, password="strongpass123"):
    client.post("/auth/register", json={"email": email, "password": password})
    login = client.post("/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_documents_pagination_limit(client, fake_minio, worker_session_override, fake_embeddings):
    headers = register_and_login(client, "page1@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    for i in range(5):
        client.post(
            f"/knowledge-bases/{kb['id']}/documents",
            files={"file": (f"doc{i}.txt", f"contenu {i}".encode(), "text/plain")},
            headers=headers,
        )

    response = client.get(f"/knowledge-bases/{kb['id']}/documents?limit=2", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_documents_pagination_offset_does_not_repeat_items(
    client, fake_minio, worker_session_override, fake_embeddings
):
    headers = register_and_login(client, "page2@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    for i in range(5):
        client.post(
            f"/knowledge-bases/{kb['id']}/documents",
            files={"file": (f"doc{i}.txt", f"contenu {i}".encode(), "text/plain")},
            headers=headers,
        )

    page1 = client.get(f"/knowledge-bases/{kb['id']}/documents?limit=2&offset=0", headers=headers).json()
    page2 = client.get(f"/knowledge-bases/{kb['id']}/documents?limit=2&offset=2", headers=headers).json()

    ids_page1 = {d["id"] for d in page1}
    ids_page2 = {d["id"] for d in page2}
    assert ids_page1.isdisjoint(ids_page2)


def test_documents_pagination_default_limit_is_reasonable(
    client, fake_minio, worker_session_override, fake_embeddings
):
    headers = register_and_login(client, "page3@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()
    client.post(
        f"/knowledge-bases/{kb['id']}/documents",
        files={"file": ("a.txt", b"contenu", "text/plain")},
        headers=headers,
    )

    response = client.get(f"/knowledge-bases/{kb['id']}/documents", headers=headers)
    assert response.status_code == 200  # pas d'erreur sans paramètres explicites


def test_conversations_pagination_limit(client, fake_minio, worker_session_override, fake_embeddings, fake_chat):
    headers = register_and_login(client, "page4@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()
    client.post(
        f"/knowledge-bases/{kb['id']}/documents",
        files={"file": ("doc.txt", b"chat chat chat", "text/plain")},
        headers=headers,
    )

    for _ in range(3):
        client.post("/chat", json={"knowledge_base_id": kb["id"], "message": "chat"}, headers=headers)

    response = client.get(f"/knowledge-bases/{kb['id']}/conversations?limit=2", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_pagination_rejects_invalid_limit(client, fake_minio, worker_session_override, fake_embeddings):
    headers = register_and_login(client, "page5@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    response = client.get(f"/knowledge-bases/{kb['id']}/documents?limit=0", headers=headers)
    assert response.status_code == 422  # limit doit être >= 1

    response = client.get(f"/knowledge-bases/{kb['id']}/documents?limit=1000", headers=headers)
    assert response.status_code == 422  # limit doit être <= 200
