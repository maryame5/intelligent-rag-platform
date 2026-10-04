"""add workspace_id to knowledge_bases

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-02
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "knowledge_bases",
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index("ix_knowledge_bases_workspace_id", "knowledge_bases", ["workspace_id"])

    # Backfill: attach each existing knowledge base to its owner's first workspace if one exists
    op.execute("""
        UPDATE knowledge_bases kb
        SET workspace_id = (
            SELECT wm.workspace_id
            FROM workspace_members wm
            WHERE wm.user_id = kb.owner_id
            ORDER BY wm.joined_at ASC
            LIMIT 1
        )
        WHERE kb.workspace_id IS NULL;
    """)


def downgrade() -> None:
    op.drop_index("ix_knowledge_bases_workspace_id", table_name="knowledge_bases")
    op.drop_column("knowledge_bases", "workspace_id")
