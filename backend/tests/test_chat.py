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


def test_chat_on_empty_kb_returns_deterministic_refusal(client, fake_embeddings, fake_chat):
    headers = register_and_login(client, "chat1@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs vides"}, headers=headers).json()

    response = client.post(
        "/chat",
        json={"knowledge_base_id": kb["id"], "message": "Quelle est la politique de congés ?"},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["grounded"] is False
    assert body["citations"] == []
    assert "pas trouvé" in body["answer"].lower()


def test_chat_with_relevant_document_is_grounded_with_citations(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "chat2@example.com")
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers).json()

    _upload_and_wait(
        client, headers, kb["id"], "conges.txt", b"La politique de conges chat chat chat est de 25 jours."
    )

    response = client.post(
        "/chat",
        json={"knowledge_base_id": kb["id"], "message": "chat"},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["grounded"] is True
    assert "[1]" in body["answer"]
    assert len(body["citations"]) >= 1
    assert body["citations"][0]["document_filename"] == "conges.txt"
    assert "conversation_id" in body


def test_chat_requires_kb_ownership(client, fake_embeddings, fake_chat):
    headers_a = register_and_login(client, "chat_owner_a@example.com")
    headers_b = register_and_login(client, "chat_owner_b@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Privée"}, headers=headers_a).json()

    response = client.post(
        "/chat",
        json={"knowledge_base_id": kb["id"], "message": "peu importe"},
        headers=headers_b,
    )
    assert response.status_code == 404


def test_conversation_continues_across_turns(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "chat3@example.com")
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "conges.txt", b"chat chat chat politique de conges.")

    first = client.post(
        "/chat", json={"knowledge_base_id": kb["id"], "message": "chat"}, headers=headers
    )
    conversation_id = first.json()["conversation_id"]

    second = client.post(
        "/chat",
        json={"knowledge_base_id": kb["id"], "conversation_id": conversation_id, "message": "chat encore"},
        headers=headers,
    )
    assert second.status_code == 200
    assert second.json()["conversation_id"] == conversation_id

    history = client.get(f"/conversations/{conversation_id}", headers=headers)
    assert history.status_code == 200
    messages = history.json()["messages"]
    assert len(messages) == 4  # 2 tours = 2 messages USER + 2 messages ASSISTANT
    assert messages[0]["role"] == "USER"
    assert messages[1]["role"] == "ASSISTANT"


def test_get_conversation_requires_ownership(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers_a = register_and_login(client, "chat_conv_a@example.com")
    headers_b = register_and_login(client, "chat_conv_b@example.com")
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers_a).json()
    _upload_and_wait(client, headers_a, kb["id"], "doc.txt", b"chat chat chat")

    chat_response = client.post(
        "/chat", json={"knowledge_base_id": kb["id"], "message": "chat"}, headers=headers_a
    )
    conversation_id = chat_response.json()["conversation_id"]

    response = client.get(f"/conversations/{conversation_id}", headers=headers_b)
    assert response.status_code == 404


def test_list_conversations_for_kb(client, fake_minio, worker_session_override, fake_embeddings, fake_chat):
    headers = register_and_login(client, "chat4@example.com")
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "doc.txt", b"chat chat chat")

    client.post("/chat", json={"knowledge_base_id": kb["id"], "message": "chat"}, headers=headers)
    client.post("/chat", json={"knowledge_base_id": kb["id"], "message": "chat encore"}, headers=headers)

    response = client.get(f"/knowledge-bases/{kb['id']}/conversations", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_chat_hybrid_default_refuses_clearly_irrelevant_question(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    """Régression directe du bug corrigé dans hybrid_search() : /chat utilise
    use_hybrid=True par défaut. Avant correctif, une knowledge base ne
    contenant qu'un document sur un tout autre sujet aurait tout de même
    "trouvé" ce document (score technique non nul) pour n'importe quelle
    question, y compris totalement hors sujet — cassant le refus déterministe."""
    headers = register_and_login(client, "hybridrefusal@example.com")
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "conges.txt", b"chat chat chat politique de conges.")

    response = client.post(
        "/chat",
        json={"knowledge_base_id": kb["id"], "message": "salaire salaire salaire"},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["grounded"] is False
    assert body["citations"] == []
