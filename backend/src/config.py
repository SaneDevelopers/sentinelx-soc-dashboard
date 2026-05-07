from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SentinelX API"
    database_url: str = Field(default="sqlite:///./sentinelx.db", alias="DATABASE_URL")
    ingest_api_key: str = Field(default="snx_demo_key", alias="INGEST_API_KEY")
    alert_score_threshold: float = Field(default=0.7, alias="ALERT_SCORE_THRESHOLD")
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")

    @property
    def allowed_origins(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
