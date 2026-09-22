import json


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


def _parse_sse_events(raw_text: str) -> list[dict]:
    events = []
    for block in raw_text.strip().split("\n\n"):
        block = block.strip()
        if block.startswith("data: "):
            events.append(json.loads(block[len("data: ") :]))
    return events


def test_chat_stream_grounded_reconstructs_full_answer_with_citations(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "stream1@example.com")
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "conges.txt", b"chat chat chat politique de conges.")

    response = client.post(
        "/chat/stream",
        json={"knowledge_base_id": kb["id"], "message": "chat"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    events = _parse_sse_events(response.text)
    assert len(events) >= 2  # au moins un chunk + l'événement "done"

    chunks = [e for e in events if e["type"] == "answer_chunk"]
    done = [e for e in events if e["type"] == "done"][0]

    full_answer = "".join(c["content"] for c in chunks)
    assert full_answer == "Voici la réponse basée sur le contexte fourni [1]."
    assert done["grounded"] is True
    assert len(done["citations"]) >= 1
    assert "message_id" in done


def test_chat_stream_persists_assistant_message(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "stream2@example.com")
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "conges.txt", b"chat chat chat politique de conges.")

    response = client.post(
        "/chat/stream",
        json={"knowledge_base_id": kb["id"], "message": "chat"},
        headers=headers,
    )
    events = _parse_sse_events(response.text)
    conversation_id = [e for e in events if e["type"] == "done"][0]["conversation_id"]

    history = client.get(f"/conversations/{conversation_id}", headers=headers)
    assert history.status_code == 200
    messages = history.json()["messages"]
    assert len(messages) == 2  # user + assistant
    assert messages[1]["role"] == "ASSISTANT"
    assert messages[1]["content"] == "Voici la réponse basée sur le contexte fourni [1]."


def test_chat_stream_on_empty_kb_sends_deterministic_refusal(client, fake_embeddings, fake_chat):
    headers = register_and_login(client, "stream3@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Vide"}, headers=headers).json()

    response = client.post(
        "/chat/stream",
        json={"knowledge_base_id": kb["id"], "message": "peu importe"},
        headers=headers,
    )
    assert response.status_code == 200
    events = _parse_sse_events(response.text)

    chunks = [e for e in events if e["type"] == "answer_chunk"]
    done = [e for e in events if e["type"] == "done"][0]

    assert "pas trouvé" in chunks[0]["content"].lower()
    assert done["grounded"] is False
    assert done["citations"] == []


def test_chat_stream_requires_kb_ownership(client, fake_embeddings, fake_chat):
    headers_a = register_and_login(client, "stream_owner_a@example.com")
    headers_b = register_and_login(client, "stream_owner_b@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Privée"}, headers=headers_a).json()

    response = client.post(
        "/chat/stream",
        json={"knowledge_base_id": kb["id"], "message": "peu importe"},
        headers=headers_b,
    )
    assert response.status_code == 404
