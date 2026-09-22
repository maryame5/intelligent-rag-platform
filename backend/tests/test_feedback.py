from app.core.security import create_access_token


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


def _create_conversation_with_assistant_message(client, headers, fake_minio, fake_embeddings, fake_chat):
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "conges.txt", b"chat chat chat politique de conges.")
    chat_response = client.post("/chat", json={"knowledge_base_id": kb["id"], "message": "chat"}, headers=headers)
    body = chat_response.json()
    return kb, body["conversation_id"], body["message_id"]


def test_submit_thumbs_up_feedback(client, fake_minio, worker_session_override, fake_embeddings, fake_chat):
    headers = register_and_login(client, "feedback1@example.com")
    _kb, _conv, message_id = _create_conversation_with_assistant_message(
        client, headers, fake_minio, fake_embeddings, fake_chat
    )

    response = client.post(f"/messages/{message_id}/feedback", json={"rating": "up"}, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["rating"] == "up"
    assert body["message_id"] == message_id


def test_resubmitting_feedback_updates_existing_entry_not_duplicates(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "feedback2@example.com")
    _kb, _conv, message_id = _create_conversation_with_assistant_message(
        client, headers, fake_minio, fake_embeddings, fake_chat
    )

    first = client.post(f"/messages/{message_id}/feedback", json={"rating": "up"}, headers=headers)
    second = client.post(
        f"/messages/{message_id}/feedback", json={"rating": "down", "comment": "pas assez précis"}, headers=headers
    )
    assert first.json()["id"] == second.json()["id"]  # même enregistrement, pas un nouveau
    assert second.json()["rating"] == "down"
    assert second.json()["comment"] == "pas assez précis"


def test_feedback_on_user_message_is_rejected(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "feedback3@example.com")
    kb, conversation_id, _assistant_message_id = _create_conversation_with_assistant_message(
        client, headers, fake_minio, fake_embeddings, fake_chat
    )
    history = client.get(f"/conversations/{conversation_id}", headers=headers).json()
    user_message_id = next(m["id"] for m in history["messages"] if m["role"] == "USER")

    response = client.post(f"/messages/{user_message_id}/feedback", json={"rating": "up"}, headers=headers)
    assert response.status_code == 422


def test_feedback_requires_ownership_of_the_message(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers_a = register_and_login(client, "feedback_owner_a@example.com")
    headers_b = register_and_login(client, "feedback_owner_b@example.com")
    _kb, _conv, message_id = _create_conversation_with_assistant_message(
        client, headers_a, fake_minio, fake_embeddings, fake_chat
    )

    response = client.post(f"/messages/{message_id}/feedback", json={"rating": "up"}, headers=headers_b)
    assert response.status_code == 404


def test_feedback_requires_authentication(client):
    response = client.post("/messages/00000000-0000-0000-0000-000000000000/feedback", json={"rating": "up"})
    assert response.status_code == 401


def test_delete_feedback_removes_it(client, fake_minio, worker_session_override, fake_embeddings, fake_chat):
    headers = register_and_login(client, "feedback4@example.com")
    _kb, _conv, message_id = _create_conversation_with_assistant_message(
        client, headers, fake_minio, fake_embeddings, fake_chat
    )
    client.post(f"/messages/{message_id}/feedback", json={"rating": "up"}, headers=headers)

    delete_response = client.delete(f"/messages/{message_id}/feedback", headers=headers)
    assert delete_response.status_code == 204


def test_conversation_history_reflects_submitted_feedback(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "feedback5@example.com")
    _kb, conversation_id, message_id = _create_conversation_with_assistant_message(
        client, headers, fake_minio, fake_embeddings, fake_chat
    )
    client.post(f"/messages/{message_id}/feedback", json={"rating": "down"}, headers=headers)

    history = client.get(f"/conversations/{conversation_id}", headers=headers).json()
    assistant_message = next(m for m in history["messages"] if m["id"] == message_id)
    assert assistant_message["feedback"] == "down"

    user_message = next(m for m in history["messages"] if m["role"] == "USER")
    assert user_message["feedback"] is None


def test_admin_feedback_listing_requires_admin(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "feedback6@example.com")
    _kb, _conv, message_id = _create_conversation_with_assistant_message(
        client, headers, fake_minio, fake_embeddings, fake_chat
    )
    client.post(f"/messages/{message_id}/feedback", json={"rating": "down"}, headers=headers)

    response = client.get("/admin/feedback", headers=headers)
    assert response.status_code == 403


def test_admin_feedback_listing_includes_context_and_filters_by_rating(
    client, admin_user, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    headers = register_and_login(client, "feedback7@example.com")
    kb, _conv, message_id = _create_conversation_with_assistant_message(
        client, headers, fake_minio, fake_embeddings, fake_chat
    )
    client.post(
        f"/messages/{message_id}/feedback", json={"rating": "down", "comment": "réponse incomplète"}, headers=headers
    )

    admin_headers = {"Authorization": f"Bearer {create_access_token(str(admin_user.id))}"}
    response = client.get("/admin/feedback?rating=down", headers=admin_headers)
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    item = items[0]
    assert item["rating"] == "down"
    assert item["comment"] == "réponse incomplète"
    assert item["knowledge_base_name"] == kb["name"]
    assert item["user_email"] == "feedback7@example.com"


def test_admin_metrics_include_feedback_counts(client, admin_user):
    admin_headers = {"Authorization": f"Bearer {create_access_token(str(admin_user.id))}"}
    response = client.get("/admin/metrics", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert "total_feedback_up" in body
    assert "total_feedback_down" in body
