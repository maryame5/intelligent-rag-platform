"""
Tests for workspace invitations and email dispatch.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.core.security import create_access_token
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceInvitation, WorkspaceMember, WorkspaceRole
from app.services.email import build_invitation_email_html, send_email


def test_build_invitation_email_html():
    html = build_invitation_email_html(
        inviter_name="Alice",
        workspace_name="Engineering",
        role="MEMBER",
        invite_url="http://localhost:5173/accept-invite?token=xyz123",
        expires_in_hours=48,
    )
    assert "Engineering" in html
    assert "Alice" in html
    assert "http://localhost:5173/accept-invite?token=xyz123" in html
    assert "MEMBER" in html


def test_send_email_dev_fallback(monkeypatch, caplog):
    # When smtp_host is empty, should log and return True without contacting network
    from app.core.config import settings
    monkeypatch.setattr(settings, "smtp_host", "")

    success = send_email(
        to_email="colleague@example.com",
        subject="Test Subject",
        html_content="<p>Hello</p>",
    )
    assert success is True


def test_send_email_smtp_success(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(settings, "smtp_user", "user")
    monkeypatch.setattr(settings, "smtp_password", "pass")
    monkeypatch.setattr(settings, "smtp_tls", True)
    monkeypatch.setattr(settings, "smtp_ssl", False)

    with patch("smtplib.SMTP") as mock_smtp_cls:
        mock_server = mock_smtp_cls.return_value
        success = send_email(
            to_email="colleague@example.com",
            subject="Test Subject",
            html_content="<p>Hello</p>",
        )
        assert success is True
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("user", "pass")
        mock_server.send_message.assert_called_once()
        mock_server.quit.assert_called_once()



def test_workspace_invitation_flow(client, db_session):
    # 1. Create admin user and workspace
    admin = User(email="admin_ws@example.com", hashed_password="fakehashadmin")
    db_session.add(admin)
    db_session.flush()

    ws = Workspace(name="Test Workspace", created_by=admin.id)
    db_session.add(ws)
    db_session.flush()

    membership = WorkspaceMember(
        workspace_id=ws.id,
        user_id=admin.id,
        role=WorkspaceRole.ADMIN,
    )
    db_session.add(membership)
    db_session.commit()

    token = create_access_token(str(admin.id))
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Invite a new team member
    with patch("app.tasks.email_task.send_workspace_invitation_email", return_value=True):
        res = client.post(
            f"/workspaces/{ws.id}/invitations",
            json={"email": "newuser@example.com", "role": "MEMBER"},
            headers=headers,
        )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "newuser@example.com"
    assert data["role"] == "MEMBER"

    # 3. List invitations
    res_list = client.get(f"/workspaces/{ws.id}/invitations", headers=headers)
    assert res_list.status_code == 200
    invites = res_list.json()
    assert len(invites) == 1
    assert invites[0]["email"] == "newuser@example.com"

    # 4. Inspect invitation details via token
    inv_row = db_session.query(WorkspaceInvitation).filter(WorkspaceInvitation.id == data["id"]).first()
    assert inv_row is not None
    inv_token = inv_row.token

    res_inspect = client.get(f"/workspaces/invitations/{inv_token}")
    assert res_inspect.status_code == 200
    inspect_data = res_inspect.json()
    assert inspect_data["workspace_name"] == "Test Workspace"
    assert inspect_data["email"] == "newuser@example.com"
    assert inspect_data["is_expired"] is False
    assert inspect_data["is_accepted"] is False

    # 5. Accept invitation with password for new account
    res_accept = client.post(
        f"/workspaces/invitations/{inv_token}/accept",
        json={"password": "securepassword123", "display_name": "New Colleague"},
    )
    assert res_accept.status_code == 200
    auth_data = res_accept.json()
    assert "access_token" in auth_data

    # Verify user created and member of workspace
    new_user = db_session.query(User).filter(User.email == "newuser@example.com").first()
    assert new_user is not None
    assert new_user.display_name == "New Colleague"

    new_member = (
        db_session.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == ws.id,
            WorkspaceMember.user_id == new_user.id,
        )
        .first()
    )
    assert new_member is not None
    assert new_member.role == WorkspaceRole.MEMBER

    # 6. Try to accept already accepted invitation -> error 400
    res_reaccept = client.post(
        f"/workspaces/invitations/{inv_token}/accept",
        json={"password": "securepassword123"},
    )
    assert res_reaccept.status_code == 400
    assert "already accepted" in res_reaccept.json()["detail"]


def test_expired_invitation(client, db_session):
    admin = User(email="admin_exp@example.com", hashed_password="fakehashadmin")
    db_session.add(admin)
    db_session.flush()

    ws = Workspace(name="Expired WS", created_by=admin.id)
    db_session.add(ws)
    db_session.flush()

    inv = WorkspaceInvitation(
        workspace_id=ws.id,
        email="late@example.com",
        role=WorkspaceRole.MEMBER,
        token="expired_token_123",
        invited_by=admin.id,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    db_session.add(inv)
    db_session.commit()

    # Inspect shows expired
    res_inspect = client.get("/workspaces/invitations/expired_token_123")
    assert res_inspect.status_code == 200
    assert res_inspect.json()["is_expired"] is True

    # Accept fails
    res_accept = client.post(
        "/workspaces/invitations/expired_token_123/accept",
        json={"password": "password123"},
    )
    assert res_accept.status_code == 400
    assert "expired" in res_accept.json()["detail"]
