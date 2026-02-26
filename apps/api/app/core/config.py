from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Logan Virtual"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_TIMEZONE: str = "America/Santiago"

    # Database
    DATABASE_URL: str = "postgresql://logan:logan_dev_2024@postgres:5432/logan_virtual"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Email / SMTP
    SMTP_HOST: str = "mailpit"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "no-reply@logan.cl"
    SMTP_FROM_NAME: str = "Logan Virtual"

    # Storage
    STORAGE_BACKEND: str = "local"  # "local" or "s3"
    STORAGE_LOCAL_PATH: str = "/app/storage"
    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_ENDPOINT_URL: str = ""  # For MinIO compatibility

    # AI
    AI_PROVIDER: str = "mock"
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    KIMI_API_KEY: str = ""
    KIMI_MODEL: str = "moonshot-v1-8k"
    GEMINI_API_KEY: str = ""
    BRAVE_SEARCH_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    # Agent Runtime
    ANTHROPIC_OPUS_MODEL: str = "claude-opus-4-20250514"
    ANTHROPIC_SONNET_MODEL: str = "claude-sonnet-4-20250514"
    AGENT_MAX_TOOL_ITERATIONS: int = 10
    AGENT_MAX_RETRIES: int = 3
    AGENT_ESCALATION_THRESHOLD: int = 3
    AGENT_RUNTIME_TIMEOUT: int = 120  # seconds
    AGENT_MAX_TOOL_RESULT_CHARS: int = 4000

    # Scraper
    SCRAPER_USER_AGENT: str = "LoganVirtual/1.0"
    SCRAPER_RATE_LIMIT_SECONDS: float = 1.0
    SCRAPER_MODE: str = "mock"

    # CORS
    CORS_ORIGINS: str = ""

    # Sentry (error tracking)
    SENTRY_DSN: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
