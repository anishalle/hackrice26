from pathlib import Path
from typing import Literal

from pydantic import HttpUrl, PostgresDsn, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "HackRice 26"
    API_V1_STR: str = "/api/v1"
    FRONTEND_HOST: str = "http://localhost:3000"
    FASTAPI_ENV: Literal["development", "staging", "production"] = "development"
    SENTRY_DSN: HttpUrl | None = None
    DATABASE_URL: PostgresDsn | None = None
    DATABASE_ECHO: bool = False
    EMBEDDING_DIMENSIONS: int = 1536
    BROWSER_USE_API_KEY: SecretStr | None = None
    BROWSER_USE_API_BASE_URL: HttpUrl = "https://api.browser-use.com/api/v2"
    ELEVENLABS_API_KEY: SecretStr | None = None
    ELEVENLABS_API_BASE_URL: HttpUrl = "https://api.elevenlabs.io/v1"
    ELEVENLABS_TTS_MODEL_ID: str = "eleven_multilingual_v2"
    VOICE_SAMPLE_MAX_BYTES: int = 10_000_000
    VOICE_SAMPLE_ENCRYPTION_KEY: SecretStr | None = None

    @field_validator("EMBEDDING_DIMENSIONS")
    @classmethod
    def embedding_dimensions_must_be_positive(cls, value: int) -> int:
        if value < 1:
            raise ValueError("EMBEDDING_DIMENSIONS must be positive")
        return value

    @field_validator("VOICE_SAMPLE_MAX_BYTES")
    @classmethod
    def voice_sample_max_bytes_must_be_positive(cls, value: int) -> int:
        if value < 1:
            raise ValueError("VOICE_SAMPLE_MAX_BYTES must be positive")
        return value


settings = Settings()


def sqlalchemy_database_url() -> str:
    """Convert provider PostgreSQL URLs to the installed Psycopg 3 dialect."""
    if settings.DATABASE_URL is None:
        raise RuntimeError("DATABASE_URL is required for database-backed routes")

    url = str(settings.DATABASE_URL)
    if url.startswith("postgres://"):
        url = f"postgresql://{url.removeprefix('postgres://')}"
    if url.startswith("postgresql://"):
        return f"postgresql+psycopg://{url.removeprefix('postgresql://')}"
    return url
