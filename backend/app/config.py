"""Application configuration via pydantic-settings.

All values are overridable by environment variables (see .env.example). The
backend runs on SQLite by default so it can be verified in this environment;
switch to PostgreSQL by setting DATABASE_URL.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Precedent"
    database_url: str = "sqlite:///./precedent.db"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 12
    # Comma-separated list of allowed CORS origins (the Vite dev server).
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    uploads_dir: str = "uploads"

    # AI (optional). When llm_api_key / llm_base_url are empty, AI-assisted
    # features degrade gracefully and the deterministic rule engine is the
    # sole source of truth. Nothing is invented.
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    # Optional official product-image source (guarded; not required).
    image_source_api_url: str = ""
    image_source_api_key: str = ""

    # pgvector (optional, Postgres only).
    use_pgvector: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
