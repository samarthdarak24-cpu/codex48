"""Application configuration via pydantic-settings.

Supports SQLite for fast portable testing and PostgreSQL 16 for production.
All settings configurable via environment variables or .env.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=())

    app_name: str = "Precedent"
    app_env: str = "development"
    database_url: str = "sqlite:///./precedent.db"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 12

    # Comma-separated list of allowed CORS origins (the Vite dev server).
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    frontend_origin: str = "http://127.0.0.1:5173"
    uploads_dir: str = "uploads"
    max_upload_mb: int = 25

    # Jobs & Workers
    jobs_inline: bool = True  # In-process background tasks for fast responsive tests
    malware_scan: str = "off"  # "off" | "clamav"
    low_sample_threshold: int = 20
    allow_self_registration: bool = True
    seed_password: str = "precedent"
    storage_backend: str = "local"  # "local" | "s3"
    retrieval_mode: str = "hybrid"  # "hybrid" | "lexical_only"
    reranker_enabled: bool = False
    llm_enabled: bool = False

    # AI & LLM settings (OpenAI-compatible)
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_timeout_seconds: int = 20
    llm_daily_call_limit: int = 500
    llm_daily_token_limit: int = 500000

    # A2 Evidence Intelligence retrieval
    embedding_model: str = ""
    embedding_model_path: str = ""
    embedding_onnx_path: str = ""
    embedding_tokenizer_path: str = ""
    retrieval_top_k: int = 5
    ai_confidence_threshold: float = 0.6

    # A1 VisualGuard
    ocr_langs: str = "eng+hin+mar"
    ocr_engine: str = "tesseract"
    ocr_fallback_engine: str = "rapidocr"
    tesseract_cmd: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    tessdata_prefix: str = ""
    model_cache_dir: str = "./backend/models"
    logo_match_threshold: float = 0.62

    # A3 Sentinel
    sentinel_cron: str = "02:00"
    sentinel_sla_days: int = 3
    sentinel_scheduler_enabled: bool = True

    # Optional official product-image source
    image_source_api_url: str = ""
    image_source_api_key: str = ""

    # pgvector (optional, Postgres only)
    use_pgvector: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
