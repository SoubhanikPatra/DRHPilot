from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import UUID, DateTime, ForeignKey, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .source_document import SourceDocument
    from .message_citation import MessageCitation


class DocumentChunk(Base):
    """Retrieval-ready passage with embedding and full-text search vector."""

    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_documents.id", ondelete="CASCADE"), nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # vector(768) for Gemini text-embedding-004
    embedding: Mapped[Any] = mapped_column(Vector(768), nullable=True)
    # generated tsvector — written explicitly in migration via op.execute()
    search_vector: Mapped[Any] = mapped_column(TSVECTOR, nullable=True)
    token_count: Mapped[int] = mapped_column(Integer, nullable=True)
    # stores ticker, company, filing_type, filing_date, year, page, section, offsets
    chunk_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    document: Mapped[SourceDocument] = relationship(back_populates="chunks")
    citations: Mapped[list[MessageCitation]] = relationship(back_populates="chunk")

    __table_args__ = (
        # HNSW and GIN indexes are created explicitly in the Alembic migration
        Index("ix_document_chunks_document_id", "document_id"),
    )
