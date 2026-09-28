"""add user ownership to integrations

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-29
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("integrations") as batch_op:
        batch_op.add_column(
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True)
        )
        batch_op.create_foreign_key(
            "integrations_user_id_fkey",
            "users",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_index("ix_integrations_user_id", ["user_id"])


def downgrade() -> None:
    with op.batch_alter_table("integrations") as batch_op:
        batch_op.drop_index("ix_integrations_user_id")
        batch_op.drop_constraint("integrations_user_id_fkey", type_="foreignkey")
        batch_op.drop_column("user_id")