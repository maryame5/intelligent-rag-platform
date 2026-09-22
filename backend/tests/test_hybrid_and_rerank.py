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


def test_hybrid_mode_returns_results(client, fake_minio, worker_session_override, fake_embeddings):
    headers = register_and_login(client, "hybrid1@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    _upload_and_wait(client, headers, kb["id"], "budget.txt", b"Le budget 2026 est de dix millions.")
    _upload_and_wait(client, headers, kb["id"], "chat.txt", b"Le chat chat chat dort.")

    response = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "budget", "top_k": 5, "mode": "hybrid"},
        headers=headers,
    )
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    assert all("rank" in r for r in results)


def test_rerank_changes_the_result_order(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "hybrid2@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    # Deux documents avec le même score vectoriel/BM25 pour "chat" : sans
    # reranking, l'ordre initial de récupération devrait déterminer le rang.
    _upload_and_wait(client, headers, kb["id"], "a.txt", b"chat chat chat")
    _upload_and_wait(client, headers, kb["id"], "b.txt", b"chat chat chat")

    without_rerank = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "chat", "top_k": 2, "rerank": False},
        headers=headers,
    ).json()

    with_rerank = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "chat", "top_k": 2, "rerank": True},
        headers=headers,
    ).json()

    assert len(without_rerank) == 2
    assert len(with_rerank) == 2
    # Le FakeChatProvider de test inverse systématiquement l'ordre des candidats
    # reçus : le 1er résultat doit donc changer entre les deux appels.
    assert without_rerank[0]["chunk_id"] != with_rerank[0]["chunk_id"]
    assert without_rerank[0]["chunk_id"] == with_rerank[1]["chunk_id"]


def test_rerank_on_single_result_does_not_call_llm(
    client, fake_minio, worker_session_override, fake_embeddings, monkeypatch
):
    """Si un seul chunk existe, le reranker ne doit même pas appeler le LLM."""

    def _explode():
        raise AssertionError("le LLM n'aurait jamais dû être appelé pour un seul candidat")

    class _ExplodingProvider:
        def generate(self, messages):
            _explode()

    monkeypatch.setattr("app.api.routes.retrieval.get_chat_provider", lambda: _ExplodingProvider())

    headers = register_and_login(client, "hybrid3@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "seul.txt", b"chat chat chat")

    response = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "chat", "top_k": 5, "rerank": True},
        headers=headers,
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_hybrid_search_filters_out_irrelevant_candidates_before_fusion(
    client, fake_minio, worker_session_override, fake_embeddings
):
    """Régression : avant correctif, hybrid_search() renvoyait toujours le
    "meilleur" candidat technique même quand rien n'était réellement pertinent
    (score proche de 0), cassant le refus déterministe de /chat pour toute
    knowledge base ne contenant que quelques documents. Ici, la requête ne
    partage aucun terme avec le contenu du document ET n'est pas dans le
    vocabulaire de l'embedding factice -> les deux méthodes doivent renvoyer
    un score nul, donc hybrid_search() doit renvoyer une liste vide."""
    headers = register_and_login(client, "hybridfilter@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "budget.txt", b"Le budget 2026 est de dix millions.")

    response = client.post(
        f"/knowledge-bases/{kb['id']}/search",
        json={"query": "salaire salaire salaire", "top_k": 5, "mode": "hybrid"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json() == []
