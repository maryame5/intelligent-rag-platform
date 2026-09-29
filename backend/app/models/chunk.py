import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.base import Base
from app.db.types import GUID


# Vecteur pgvector natif : stockage binaire compact, supporte les index HNSW/IVFFlat.
# La dimension exacte (384) est définie et gérée au niveau DDL/migration PostgreSQL (0011).
# Au niveau ORM, Vector() sans dimension explicite permet la sérialisation fluide
# quel que soit le dialecte (PostgreSQL en prod, SQLite en test).
class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    document_id = Column(GUID(), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page = Column(Integer, nullable=True)
    section = Column(String, nullable=True)
    embedding = Column(Vector, nullable=True)
    embedding_model = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
