"""Application configuration via pydantic-settings.

Supports SQLite for fast portable testing and PostgreSQL 16 for production.
All settings configurable via environment variables or .env.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Precedent"
    app_env: str = "development"
    database_url: str = "sqlite:///./precedent.db"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 12

    # CORS origins
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    frontend_origin: str = "http://127.0.0.1:5173"
    uploads_dir: str = "uploads"
    max_upload_mb: int = 25

    # Jobs & Workers
    jobs_inline: bool = True  # In-process background tasks for fast responsive tests
    malware_scan: str = "off"  # "off" | "clamav"
    low_sample_threshold: int = 20
    allow_self_registration: bool = True
    seed_password: str = "DemoPass123!"
    storage_backend: str = "local"  # "local" | "s3"
    retrieval_mode: str = "hybrid"  # "hybrid" | "lexical_only"
    reranker_enabled: bool = False
    llm_enabled: bool = False
    sentinel_cron: str = "0 0 * * *"

    # AI & LLM settings (OpenAI-compatible)
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_daily_token_limit: int = 500000

    # OCR settings
    ocr_engine: str = "rapidocr"  # "rapidocr" | "tesseract" | "mock"
    ocr_langs: str = "en"

    # Optional image source API
    image_source_api_url: str = ""
    image_source_api_key: str = ""

    # Optional pgvector
    use_pgvector: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
