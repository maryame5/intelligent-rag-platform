from app.core.security import create_access_token


def test_admin_metrics_requires_authentication(client):
    response = client.get("/admin/metrics")
    assert response.status_code == 401


def test_admin_metrics_rejects_normal_user(client):
    client.post("/auth/register", json={"email": "normal@example.com", "password": "strongpass123"})
    login = client.post("/auth/login", json={"email": "normal@example.com", "password": "strongpass123"})
    token = login.json()["access_token"]

    response = client.get("/admin/metrics", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_admin_metrics_allows_admin(client, admin_user):
    token = create_access_token(str(admin_user.id))
    response = client.get("/admin/metrics", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert "total_users" in body
    assert "total_knowledge_bases" in body
    assert "total_documents" in body
