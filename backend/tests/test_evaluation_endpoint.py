from app.core.security import create_access_token


def register_and_login(client, email, password="strongpass123"):
    client.post("/auth/register", json={"email": email, "password": password})
    login = client.post("/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_evaluation_endpoint_requires_admin(client, fake_minio, worker_session_override, fake_embeddings):
    headers = register_and_login(client, "notadmin@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers).json()

    response = client.post(
        "/admin/evaluations/run",
        json={"knowledge_base_id": kb["id"], "dataset_name": "sample_benchmark_v1"},
        headers=headers,
    )
    assert response.status_code == 403


def test_evaluation_endpoint_rejects_unknown_dataset(
    client, admin_user, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    token = create_access_token(str(admin_user.id))
    headers_admin = {"Authorization": f"Bearer {token}"}

    headers_user = register_and_login(client, "owner_for_admin_test@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers_user).json()

    response = client.post(
        "/admin/evaluations/run",
        json={"knowledge_base_id": kb["id"], "dataset_name": "dataset_qui_n_existe_pas"},
        headers=headers_admin,
    )
    assert response.status_code == 404


def test_evaluation_endpoint_runs_sample_dataset(
    client, admin_user, fake_minio, worker_session_override, fake_embeddings, fake_chat
):
    token = create_access_token(str(admin_user.id))
    headers_admin = {"Authorization": f"Bearer {token}"}

    headers_user = register_and_login(client, "owner_for_admin_test2@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Docs"}, headers=headers_user).json()

    response = client.post(
        "/admin/evaluations/run",
        json={
            "knowledge_base_id": kb["id"],
            "dataset_name": "sample_benchmark_v1",
            "run_generation": False,
        },
        headers=headers_admin,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["dataset_name"] == "sample_benchmark"
    assert body["total_questions"] >= 1
    assert "mrr" in body
