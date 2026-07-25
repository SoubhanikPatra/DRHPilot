from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from supabase import Client, create_client


@dataclass(frozen=True)
class SupabaseConfig:
    """Settings required to build Supabase clients."""

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str


def get_supabase_config() -> SupabaseConfig:
    """Load validated Supabase settings from app.config.settings."""

    # Import lazily so module import does not hard-fail in tooling contexts.
    from app.config import settings

    return SupabaseConfig(
        supabase_url=settings.supabase_url,
        supabase_anon_key=settings.supabase_anon_key,
        supabase_service_role_key=settings.supabase_service_role_key,
    )


def get_user_client(access_token: str, *, config: SupabaseConfig | None = None) -> Client:
    """Create a Supabase client scoped to a signed-in user JWT.

    Queries from this client are evaluated under RLS using the provided
    user access token. The caller is expected to pass a validated Supabase JWT.
    """

    if not access_token:
        raise ValueError("access_token is required")

    cfg = config or get_supabase_config()
    client = create_client(cfg.supabase_url, cfg.supabase_anon_key)
    client.postgrest.auth(access_token)
    return client


@lru_cache(maxsize=1)
def get_service_role_client(*, config: SupabaseConfig | None = None) -> Client:
    """Return a cached Supabase client authenticated with service-role key.

    This bypasses RLS and should only be used for backend-only privileged work.
    """

    cfg = config or get_supabase_config()
    return create_client(cfg.supabase_url, cfg.supabase_service_role_key)
