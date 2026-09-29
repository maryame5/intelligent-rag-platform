"""pgvector: activer l'extension, convertir embedding Text→vector(384), index HNSW

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-29

Pourquoi :
  - L'ancienne colonne `chunks.embedding` était de type Text (JSON).
    La similarité cosinus était calculée en Python (scan linéaire O(n)).
  - On migre vers le type natif pgvector vector(384) pour pouvoir utiliser
    un index HNSW (recherche approximative ANN en O(log n)).

Stratégie de migration des données existantes :
  1. Créer une colonne temporaire `embedding_vec` de type vector(384).
  2. Convertir les JSON existants via `embedding::vector`.
     (PostgreSQL peut caster un littéral text → vector s'il ressemble à '[1,2,...]'.)
  3. Supprimer l'ancienne colonne Text, renommer la nouvelle.
  4. Créer l'index HNSW cosine.

Rollback (downgrade) :
  Reconvertit vector → text JSON et recrée l'ancienne colonne Text.

ATTENTION : si la colonne contient des vecteurs de dimension ≠ 384, la migration
échoue avec un message clair de pgvector. Adaptez VECTOR_DIMENSIONS si nécessaire.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VECTOR_DIMENSIONS = 384


def upgrade() -> None:
    # 1. Activer l'extension pgvector (idempotent)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 2. Ajouter colonne temporaire de type vector
    op.execute(
        f"ALTER TABLE chunks ADD COLUMN embedding_vec vector({VECTOR_DIMENSIONS})"
    )

    # 3. Convertir les embeddings JSON existants → vector
    #    On ignore les lignes NULL (pas encore embeddées).
    #    Le cast PostgreSQL text → vector fonctionne si le texte est de la forme '[1.0, 2.0, ...]'.
    op.execute(
        f"""
        UPDATE chunks
        SET embedding_vec = embedding::vector
        WHERE embedding IS NOT NULL
        """
    )

    # 4. Supprimer l'ancienne colonne Text, renommer la nouvelle
    op.drop_column("chunks", "embedding")
    op.execute("ALTER TABLE chunks RENAME COLUMN embedding_vec TO embedding")

    # 5. Index HNSW pour la recherche cosine (approximative, très rapide)
    #    m=16 et ef_construction=64 sont les valeurs par défaut recommandées.
    #    À ajuster si le corpus devient très large (m=32 améliore le recall).
    op.execute(
        """
        CREATE INDEX ix_chunks_embedding_hnsw
        ON chunks USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
        """
    )


def downgrade() -> None:
    # Supprimer l'index HNSW
    op.execute("DROP INDEX IF EXISTS ix_chunks_embedding_hnsw")

    # Recréer la colonne Text avec le JSON
    op.execute("ALTER TABLE chunks ADD COLUMN embedding_text TEXT")
    op.execute(
        """
        UPDATE chunks
        SET embedding_text = embedding::text
        WHERE embedding IS NOT NULL
        """
    )
    op.execute("ALTER TABLE chunks DROP COLUMN embedding")
    op.execute("ALTER TABLE chunks RENAME COLUMN embedding_text TO embedding")
