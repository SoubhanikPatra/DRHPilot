from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Single source of truth for backend environment configuration."""

    model_config = SettingsConfigDict(extra="ignore", env_file=None)

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    database_url: str
    gemini_api_key: str
    gemini_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "models/text-embedding-004"
    gemini_embedding_dimensions: int = 768
    allowed_origins: str = "http://localhost:5173"

    @field_validator("gemini_embedding_dimensions")
    @classmethod
    def validate_embedding_dimensions(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("gemini_embedding_dimensions must be greater than 0")
        return value

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load and cache validated backend settings."""

    return Settings()  # pyright: ignore[reportCallIssue]


settings = get_settings()
