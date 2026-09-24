"""add workspaces and workspace_members tables

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-22
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
    )
    op.create_table(
        "workspace_members",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Enum("ADMIN", "MEMBER", name="workspacerole"), nullable=False, server_default="MEMBER"),
        sa.Column("joined_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),
    )


def downgrade() -> None:
    op.drop_table("workspace_members")
    op.drop_table("workspaces")
    sa.Enum(name="workspacerole").drop(op.get_bind(), checkfirst=True)
