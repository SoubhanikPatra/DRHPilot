from __future__ import annotations

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make `app` importable when running from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.config import settings  # noqa: E402

# Import Base *and* all models so SQLAlchemy's mapper is aware of every table.
# The models/__init__.py already imports all six model classes; this single
# import is enough to populate Base.metadata.
from app.database.models import (  # noqa: E402, F401
    Base,
    ChatMessage,
    ChatThread,
    DocumentChunk,
    MessageCitation,
    Profile,
    SourceDocument,
)

# ---------------------------------------------------------------------------
# Alembic config object
# ---------------------------------------------------------------------------
config = context.config

# Override sqlalchemy.url from settings so credentials never live in .ini.
# The .env DATABASE_URL may use the bare "postgresql://" scheme; psycopg3
# requires "postgresql+psycopg://".  Fix it here transparently.
_db_url: str = settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+psycopg://", 1)
config.set_main_option("sqlalchemy.url", _db_url)

# Apply logging config from alembic.ini (if a file is present)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata object that autogenerate inspects
target_metadata = Base.metadata


# ---------------------------------------------------------------------------
# Migration runners
# ---------------------------------------------------------------------------

def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (emits SQL to stdout)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # never pool — migrations are one-shot
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
