from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ClassroomGuard"
    app_env: str = "development"
    debug: bool = True

    database_url: str = "postgresql+asyncpg://classroomguard:classroomguard_dev@localhost:5432/classroomguard"

    jwt_secret: str = "classroomguard-dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    frontend_url: str = "http://localhost:5173"
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    storage_path: str = "./storage"

    use_redis: bool = True
    redis_url: str = "redis://localhost:6379/0"

    # Observability
    enable_tracing: bool = False
    otlp_endpoint: str = "http://localhost:4317"
    sentry_dsn: str = ""

    model_config = SettingsConfigDict(
        env_file="backend/.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
