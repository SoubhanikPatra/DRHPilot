"""
database/supabase.py — Supabase Python client factory.

Two clients:
- anon_client()        → uses anon key; respects RLS; for user-scoped reads
- service_role_client() → uses service role key; bypasses RLS; for ingestion / admin ops

Both are constructed on demand and cached per-process via lru_cache.
Never import these in auth middleware — use the JWT verification flow there instead.
"""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


@lru_cache(maxsize=1)
def anon_client() -> Client:
    """Supabase client with anon key — honours Row Level Security."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache(maxsize=1)
def service_role_client() -> Client:
    """Supabase client with service role key — bypasses Row Level Security.

    Use only for server-side operations (ingestion, admin tasks).
    Never expose this client or its key to the frontend.
    """
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
