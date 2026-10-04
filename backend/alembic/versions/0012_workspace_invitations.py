"""add workspace_invitations table

Revision ID: 0012
Revises: 0011
Create Date: 2026-09-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from sqlalchemy.dialects import postgresql

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

workspace_role_enum = postgresql.ENUM("ADMIN", "MEMBER", name="workspacerole", create_type=False)


def upgrade() -> None:
    op.create_table(
        "workspace_invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column(
            "role",
            workspace_role_enum,
            nullable=False,
            server_default="MEMBER",
        ),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column(
            "invited_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_workspace_invitations_email", "workspace_invitations", ["email"])
    op.create_index("ix_workspace_invitations_token", "workspace_invitations", ["token"], unique=True)
    op.create_index(
        "ix_workspace_invitations_workspace_id", "workspace_invitations", ["workspace_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_workspace_invitations_workspace_id", table_name="workspace_invitations")
    op.drop_index("ix_workspace_invitations_token", table_name="workspace_invitations")
    op.drop_index("ix_workspace_invitations_email", table_name="workspace_invitations")
    op.drop_table("workspace_invitations")
