"""Verify that analytics and integrations never leak data between users."""

from app.models.document import Document, DocumentStatus
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User


def _register_and_login(client, email, password="testpass123"):
    client.post("/auth/register", json={"email": email, "password": password})
    response = client.post("/auth/login", json={"email": email, "password": password})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_analytics_metrics_only_counts_own_documents(client, db_session):
    headers_a = _register_and_login(client, "alice@example.com")
    headers_b = _register_and_login(client, "bob@example.com")

    alice = db_session.query(User).filter(User.email == "alice@example.com").first()
    knowledge_base = KnowledgeBase(name="KB Alice", owner_id=alice.id)
    db_session.add(knowledge_base)
    db_session.commit()
    db_session.refresh(knowledge_base)
    db_session.add(
        Document(
            knowledge_base_id=knowledge_base.id,
            filename="secret.pdf",
            storage_path="x",
            mime_type="application/pdf",
            size_bytes=10,
            status=DocumentStatus.READY,
        )
    )
    db_session.commit()

    response_a = client.get("/analytics/metrics", headers=headers_a)
    response_b = client.get("/analytics/metrics", headers=headers_b)

    assert response_a.status_code == 200
    assert response_b.status_code == 200
    assert response_a.json()["indexedDocuments"] == 1
    assert response_b.json()["indexedDocuments"] == 0


def test_analytics_activity_does_not_crash_and_is_scoped(client, db_session):
    headers_a = _register_and_login(client, "carol@example.com")
    headers_b = _register_and_login(client, "dave@example.com")

    carol = db_session.query(User).filter(User.email == "carol@example.com").first()
    knowledge_base = KnowledgeBase(name="KB Carol", owner_id=carol.id)
    db_session.add(knowledge_base)
    db_session.commit()
    db_session.refresh(knowledge_base)
    db_session.add(
        Document(
            knowledge_base_id=knowledge_base.id,
            filename="carol-only.pdf",
            storage_path="x",
            mime_type="application/pdf",
            size_bytes=10,
            status=DocumentStatus.READY,
        )
    )
    db_session.commit()

    response_a = client.get("/analytics/activity", headers=headers_a)
    response_b = client.get("/analytics/activity", headers=headers_b)

    assert response_a.status_code == 200
    assert response_b.status_code == 200
    targets_a = [item["target"] for item in response_a.json()]
    targets_b = [item["target"] for item in response_b.json()]
    assert "carol-only.pdf" in targets_a
    assert "carol-only.pdf" not in targets_b


def test_integrations_are_isolated_per_user(client):
    headers_a = _register_and_login(client, "erin@example.com")
    headers_b = _register_and_login(client, "frank@example.com")

    list_a = client.get("/integrations", headers=headers_a)
    assert list_a.status_code == 200
    assert len(list_a.json()) == 6

    connect = client.post(
        "/integrations/notion/connect",
        headers=headers_a,
        json={"config": {}},
    )
    assert connect.status_code == 200
    assert connect.json()["status"] == "connected"

    list_a_after = client.get("/integrations", headers=headers_a)
    notion_a = next(item for item in list_a_after.json() if item["provider"] == "notion")
    assert notion_a["status"] == "connected"

    list_b = client.get("/integrations", headers=headers_b)
    notion_b = next(item for item in list_b.json() if item["provider"] == "notion")
    assert notion_b["status"] == "available"
