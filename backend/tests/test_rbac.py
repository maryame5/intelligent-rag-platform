from app.core.security import create_access_token


def test_admin_metrics_requires_authentication(client):
    response = client.get("/admin/metrics")
    assert response.status_code == 401


def test_admin_metrics_rejects_normal_user(client):
    client.post("/auth/register", json={"email": "normal@example.com", "password": "strongpass123", "role": "USER"})
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


def test_admin_can_list_and_update_user_roles(client, admin_user):
    admin_token = create_access_token(str(admin_user.id))
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create normal user
    client.post("/auth/register", json={"email": "member1@example.com", "password": "strongpass123", "role": "USER"})

    # List users as admin
    res = client.get("/admin/users", headers=admin_headers)
    assert res.status_code == 200
    users = res.json()
    member = next(u for u in users if u["email"] == "member1@example.com")
    assert member["role"] == "USER"

    # Promote to ADMIN
    res_promote = client.patch(
        f"/admin/users/{member['id']}/role",
        json={"role": "ADMIN"},
        headers=admin_headers,
    )
    assert res_promote.status_code == 200
    assert res_promote.json()["role"] == "ADMIN"

    # Demote back to USER
    res_demote = client.patch(
        f"/admin/users/{member['id']}/role",
        json={"role": "USER"},
        headers=admin_headers,
    )
    assert res_demote.status_code == 200
    assert res_demote.json()["role"] == "USER"

