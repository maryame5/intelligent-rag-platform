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


def test_search_ranks_relevant_document_first(client, fake_minio, worker_session_override, fake_embeddings):
    headers = register_and_login(client, "searcher1@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    _upload_and_wait(client, headers, kb["id"], "animaux.txt", b"Le chat chat chat dort sur le canape.")
    _upload_and_wait(
        client, headers, kb["id"], "juridique.txt", b"Le contrat contrat contrat doit etre signe."
    )

    response = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "chat", "top_k": 5},
        headers=headers,
    )
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    assert results[0]["document_filename"] == "animaux.txt"
    # Le score du meilleur résultat doit être strictement positif (chevauchement réel).
    assert results[0]["score"] > 0


def test_search_top_k_limits_results(client, fake_minio, worker_session_override, fake_embeddings):
    headers = register_and_login(client, "searcher2@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    # Contenu long pour garantir plusieurs chunks (chunk_size=1000 par défaut).
    _upload_and_wait(client, headers, kb["id"], "long.txt", (b"Python python python. " * 200))

    response = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "python", "top_k": 2},
        headers=headers,
    )
    assert response.status_code == 200
    assert len(response.json()) <= 2


def test_search_filters_by_document_id(client, fake_minio, worker_session_override, fake_embeddings):
    headers = register_and_login(client, "searcher3@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    doc_a = _upload_and_wait(client, headers, kb["id"], "a.txt", b"chat chat chat")
    doc_b = _upload_and_wait(client, headers, kb["id"], "b.txt", b"chat chat chat")

    response = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "chat", "top_k": 10, "document_id": doc_a["document"]["id"]},
        headers=headers,
    )
    assert response.status_code == 200
    results = response.json()
    assert all(r["document_id"] == doc_a["document"]["id"] for r in results)
    assert not any(r["document_id"] == doc_b["document"]["id"] for r in results)


def test_search_requires_kb_ownership(client, fake_minio):
    headers_a = register_and_login(client, "searcher_a@example.com")
    headers_b = register_and_login(client, "searcher_b@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs A"}, headers=headers_a).json()

    response = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "peu importe"},
        headers=headers_b,
    )
    assert response.status_code == 404


def test_search_on_empty_kb_returns_empty_list(client, fake_embeddings):
    headers = register_and_login(client, "searcher4@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs vides"}, headers=headers).json()

    response = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "quoi que ce soit"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json() == []
