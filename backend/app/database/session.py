"""
database/session.py — async SQLAlchemy engine and session factory.

Usage in FastAPI routes::

    from app.database.session import get_db
    from sqlalchemy.ext.asyncio import AsyncSession
    from fastapi import Depends

    @router.get("/")
    async def handler(db: AsyncSession = Depends(get_db)):
        ...
"""
from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

# Convert postgresql:// → postgresql+psycopg:// for async psycopg3 driver
_url = settings.database_url.replace(
    "postgresql://", "postgresql+psycopg://", 1
).replace(
    "postgres://", "postgresql+psycopg://", 1
)

_engine = create_async_engine(
    _url,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

_SessionFactory = async_sessionmaker(
    _engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields an async DB session, always closed after request."""
    async with _SessionFactory() as session:
        yield session
