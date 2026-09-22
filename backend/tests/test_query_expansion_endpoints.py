def register_and_login(client, email, password="strongpass123"):
    client.post("/auth/register", json={"email": email, "password": password})
    login = client.post("/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _upload_and_wait(client, headers, kb_id, filename, content: bytes):
    upload = client.post(
        f"/knowledge-bases/{kb_id}/documents",
        files={"file": (filename, content, "text/plain")},
        headers=headers,
    )
    assert upload.status_code == 202
    return upload.json()


def test_search_with_expand_query_still_finds_relevant_document(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "expand1@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "chat.txt", b"chat chat chat politique de conges.")

    response = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "chat", "top_k": 5, "expand_query": True},
        headers=headers,
    )
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    assert results[0]["document_filename"] == "chat.txt"


def test_search_expand_query_on_empty_kb_returns_empty_list(client, fake_embeddings, fake_chat):
    headers = register_and_login(client, "expand2@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Vide"}, headers=headers).json()

    response = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "peu importe", "expand_query": True},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json() == []


def test_chat_with_expand_query_is_grounded_with_citations(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "expand3@example.com")
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "conges.txt", b"chat chat chat politique de conges.")

    response = client.post(
        "/chat",
        json={"knowledge_base_id": kb["id"], "message": "chat", "expand_query": True},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["grounded"] is True
    assert len(body["citations"]) >= 1
