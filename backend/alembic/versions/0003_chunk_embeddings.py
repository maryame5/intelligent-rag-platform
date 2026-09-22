"""sprint 3: embedding columns on chunks

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("chunks", sa.Column("embedding", sa.Text(), nullable=True))
    op.add_column("chunks", sa.Column("embedding_model", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("chunks", "embedding_model")
    op.drop_column("chunks", "embedding")
