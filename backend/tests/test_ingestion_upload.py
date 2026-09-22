def register_and_login(client, email, password="strongpass123"):
    client.post("/auth/register", json={"email": email, "password": password})
    login = client.post("/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_upload_txt_document_is_ingested_end_to_end(client, fake_minio, worker_session_override, fake_embeddings):
    headers = register_and_login(client, "uploader1@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    file_content = b"Ceci est un document de test pour la plateforme RAG. " * 30
    upload = client.post(
        f"/knowledge-bases/{kb['id']}/documents",
        files={"file": ("notes.txt", file_content, "text/plain")},
        headers=headers,
    )
    assert upload.status_code == 202
    body = upload.json()
    job_id = body["job_id"]
    document_id = body["document"]["id"]

    # TestClient attend la fin de la tâche de fond avant de retourner la réponse.
    job = client.get(f"/jobs/{job_id}", headers=headers)
    assert job.status_code == 200
    assert job.json()["status"] == "SUCCESS"

    document = client.get(f"/documents/{document_id}", headers=headers)
    assert document.status_code == 200
    assert document.json()["status"] == "READY"


def test_upload_rejects_unsupported_mime_type(client, fake_minio):
    headers = register_and_login(client, "uploader2@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    response = client.post(
        f"/knowledge-bases/{kb['id']}/documents",
        files={"file": ("image.png", b"fake-bytes", "image/png")},
        headers=headers,
    )
    assert response.status_code == 422


def test_upload_requires_kb_ownership(client, fake_minio):
    headers_a = register_and_login(client, "owner_x@example.com")
    headers_b = register_and_login(client, "owner_y@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs A"}, headers=headers_a).json()

    response = client.post(
        f"/knowledge-bases/{kb['id']}/documents",
        files={"file": ("notes.txt", b"contenu", "text/plain")},
        headers=headers_b,
    )
    assert response.status_code == 404  # jamais 403 : on ne révèle même pas l'existence de la KB


def test_list_documents_for_a_knowledge_base(client, fake_minio, worker_session_override, fake_embeddings):
    headers = register_and_login(client, "uploader3@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    client.post(
        f"/knowledge-bases/{kb['id']}/documents",
        files={"file": ("a.txt", b"contenu a " * 20, "text/plain")},
        headers=headers,
    )
    client.post(
        f"/knowledge-bases/{kb['id']}/documents",
        files={"file": ("b.txt", b"contenu b " * 20, "text/plain")},
        headers=headers,
    )

    response = client.get(f"/knowledge-bases/{kb['id']}/documents", headers=headers)
    assert response.status_code == 200
    filenames = {d["filename"] for d in response.json()}
    assert filenames == {"a.txt", "b.txt"}


def test_delete_document_removes_it_and_its_chunks(client, fake_minio, worker_session_override, fake_embeddings):
    headers = register_and_login(client, "uploader4@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    upload = client.post(
        f"/knowledge-bases/{kb['id']}/documents",
        files={"file": ("c.txt", b"contenu c " * 20, "text/plain")},
        headers=headers,
    )
    document_id = upload.json()["document"]["id"]

    delete_response = client.delete(f"/documents/{document_id}", headers=headers)
    assert delete_response.status_code == 204

    get_response = client.get(f"/documents/{document_id}", headers=headers)
    assert get_response.status_code == 404
