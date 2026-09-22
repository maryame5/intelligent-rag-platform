"""initial schema: users, knowledge_bases, documents

Revision ID: 0001
Revises:
Create Date: 2026-09-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.db.migration_utils import create_enum_idempotent

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role_enum = postgresql.ENUM("USER", "ADMIN", name="userrole", create_type=False)
document_status_enum = postgresql.ENUM(
    "PROCESSING", "READY", "FAILED", name="documentstatus", create_type=False
)
# create_type=False : sans ça, SQLAlchemy tente de recréer le type ENUM une
# seconde fois pendant op.create_table() (en plus de la création explicite
# ci-dessous avec checkfirst=True), et la seconde tentative échoue avec
# "type already exists" puisqu'elle n'a pas de checkfirst.


def upgrade() -> None:
    create_enum_idempotent(user_role_enum, op.get_bind())
    create_enum_idempotent(document_status_enum, op.get_bind())

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", user_role_enum, nullable=False, server_default="USER"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "knowledge_bases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_knowledge_bases_owner_id", "knowledge_bases", ["owner_id"])

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "knowledge_base_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge_bases.id"),
            nullable=False,
        ),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("status", document_status_enum, nullable=False, server_default="PROCESSING"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_documents_knowledge_base_id", "documents", ["knowledge_base_id"])


def downgrade() -> None:
    op.drop_table("documents")
    op.drop_table("knowledge_bases")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    document_status_enum.drop(op.get_bind(), checkfirst=True)
    user_role_enum.drop(op.get_bind(), checkfirst=True)
