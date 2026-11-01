"""Application configuration via pydantic-settings.

All values are overridable by environment variables (see .env.example). The
backend runs on SQLite by default so it can be verified in this environment;
switch to PostgreSQL by setting DATABASE_URL.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=())

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
    llm_timeout_seconds: int = 20
    llm_daily_call_limit: int = 500

    # A2 Evidence Intelligence. Embeddings are optional: with no model
    # available retrieval falls back to BM25 only, and the API says so.
    embedding_model: str = ""
    embedding_model_path: str = ""
    # Local multilingual ONNX sentence encoder (preferred). Empty = use the
    # bundled model under backend/models/ when it exists.
    embedding_onnx_path: str = ""
    embedding_tokenizer_path: str = ""
    retrieval_top_k: int = 5
    # Confidence below this becomes needs_human_review, never a violation.
    ai_confidence_threshold: float = 0.6

    # A1 VisualGuard.
    ocr_langs: str = "eng+hin+mar"
    ocr_engine: str = "tesseract"
    ocr_fallback_engine: str = "rapidocr"
    tesseract_cmd: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    tessdata_prefix: str = ""
    model_cache_dir: str = "./backend/models"
    max_upload_mb: int = 10
    # Minimum confidence before a logo match is treated as a fact. Below this
    # the verdict is 'unknown' -> Needs review, never a violation.
    logo_match_threshold: float = 0.62

    # A3 Sentinel.
    sentinel_cron: str = "02:00"
    sentinel_sla_days: int = 3
    # The in-process APScheduler daily sweep. Set to 0 on every worker but one
    # in a multi-worker deployment (the scan itself is idempotent either way).
    sentinel_scheduler_enabled: bool = True

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
