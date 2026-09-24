"""add ondelete CASCADE to foreign keys

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-22
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("knowledge_bases") as batch_op:
        batch_op.drop_constraint("knowledge_bases_owner_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "knowledge_bases_owner_id_fkey",
            "users",
            ["owner_id"],
            ["id"],
            ondelete="CASCADE",
        )

    with op.batch_alter_table("documents") as batch_op:
        batch_op.drop_constraint("documents_knowledge_base_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "documents_knowledge_base_id_fkey",
            "knowledge_bases",
            ["knowledge_base_id"],
            ["id"],
            ondelete="CASCADE",
        )

    with op.batch_alter_table("chunks") as batch_op:
        batch_op.drop_constraint("chunks_document_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "chunks_document_id_fkey",
            "documents",
            ["document_id"],
            ["id"],
            ondelete="CASCADE",
        )

    with op.batch_alter_table("ingestion_jobs") as batch_op:
        batch_op.drop_constraint("ingestion_jobs_document_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "ingestion_jobs_document_id_fkey",
            "documents",
            ["document_id"],
            ["id"],
            ondelete="CASCADE",
        )

    with op.batch_alter_table("conversations") as batch_op:
        batch_op.drop_constraint("conversations_knowledge_base_id_fkey", type_="foreignkey")
        batch_op.drop_constraint("conversations_user_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "conversations_knowledge_base_id_fkey",
            "knowledge_bases",
            ["knowledge_base_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_foreign_key(
            "conversations_user_id_fkey",
            "users",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )

    with op.batch_alter_table("messages") as batch_op:
        batch_op.drop_constraint("messages_conversation_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "messages_conversation_id_fkey",
            "conversations",
            ["conversation_id"],
            ["id"],
            ondelete="CASCADE",
        )

    with op.batch_alter_table("message_feedback") as batch_op:
        batch_op.drop_constraint("message_feedback_message_id_fkey", type_="foreignkey")
        batch_op.drop_constraint("message_feedback_user_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "message_feedback_message_id_fkey",
            "messages",
            ["message_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_foreign_key(
            "message_feedback_user_id_fkey",
            "users",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    with op.batch_alter_table("message_feedback") as batch_op:
        batch_op.drop_constraint("message_feedback_user_id_fkey", type_="foreignkey")
        batch_op.drop_constraint("message_feedback_message_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "message_feedback_user_id_fkey", "users", ["user_id"], ["id"]
        )
        batch_op.create_foreign_key(
            "message_feedback_message_id_fkey", "messages", ["message_id"], ["id"]
        )

    with op.batch_alter_table("messages") as batch_op:
        batch_op.drop_constraint("messages_conversation_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "messages_conversation_id_fkey", "conversations", ["conversation_id"], ["id"]
        )

    with op.batch_alter_table("conversations") as batch_op:
        batch_op.drop_constraint("conversations_user_id_fkey", type_="foreignkey")
        batch_op.drop_constraint("conversations_knowledge_base_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "conversations_user_id_fkey", "users", ["user_id"], ["id"]
        )
        batch_op.create_foreign_key(
            "conversations_knowledge_base_id_fkey", "knowledge_bases", ["knowledge_base_id"], ["id"]
        )

    with op.batch_alter_table("ingestion_jobs") as batch_op:
        batch_op.drop_constraint("ingestion_jobs_document_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "ingestion_jobs_document_id_fkey", "documents", ["document_id"], ["id"]
        )

    with op.batch_alter_table("chunks") as batch_op:
        batch_op.drop_constraint("chunks_document_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "chunks_document_id_fkey", "documents", ["document_id"], ["id"]
        )

    with op.batch_alter_table("documents") as batch_op:
        batch_op.drop_constraint("documents_knowledge_base_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "documents_knowledge_base_id_fkey", "knowledge_bases", ["knowledge_base_id"], ["id"]
        )

    with op.batch_alter_table("knowledge_bases") as batch_op:
        batch_op.drop_constraint("knowledge_bases_owner_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "knowledge_bases_owner_id_fkey", "users", ["owner_id"], ["id"]
        )
