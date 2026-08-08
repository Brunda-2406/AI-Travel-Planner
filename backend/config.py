import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    APP_ENV: str = "development"
    SECRET_KEY: str = "super-secret-travel-key-fallback"
    DEBUG: bool = True

    # Database Settings
    DATABASE_URL: str = "sqlite:///./travel_planner.db"

    # Redis Settings
    REDIS_URL: Optional[str] = None

    # Ollama Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen3:8b"
    USE_OLLAMA: bool = True

    # Geoapify Settings
    GEOAPIFY_API_KEY: str = ""

    # Weather Settings
    WEATHER_API_KEY: str = ""
    WEATHER_API_BASE_URL: str = "https://api.openweathermap.org/data/2.5"

    # Auth Settings
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    # Export Settings
    PDF_EXPORT_DIR: str = "./exports"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 30

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
