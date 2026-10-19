from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_JWT_SECRET = "classroomguard-dev-secret-change-in-prod"


class Settings(BaseSettings):
    app_name: str = "ClassroomGuard"
    app_env: str = "development"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://classroomguard:classroomguard_dev@localhost:5432/classroomguard"

    jwt_secret: str = _DEV_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Shared secret the AI pipeline sends as X-Service-Token to ingest detection events.
    # Empty disables service-token auth.
    ai_service_token: str = ""

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    frontend_url: str = "http://localhost:3000"  # base URL used in password-reset links
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    storage_path: str = "./storage"

    # Outgoing email (password resets, alert emails). Empty SMTP_HOST = log only, nothing sent.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "ClassroomGuard <no-reply@localhost>"
    smtp_starttls: bool = True  # port 587; set false and SMTP_SSL=true for port 465
    smtp_ssl: bool = False

    # Public sign-up (creates a new organisation with an admin). Off for college installs:
    # accounts are created by administrators.
    allow_self_registration: bool = False

    # Set true for Celery workers (no connection pooling across event loops)
    db_null_pool: bool = False

    # Disable only for automated test runs that log in many times per minute
    rate_limit_enabled: bool = True

    use_redis: bool = True
    redis_url: str = "redis://localhost:6379/0"

    # Observability
    enable_tracing: bool = False
    otlp_endpoint: str = "http://localhost:4317"
    sentry_dsn: str = ""

    @model_validator(mode="after")
    def _require_production_secrets(self) -> "Settings":
        self.app_env = self.app_env.lower().strip()
        if self.app_env not in {"development", "test", "staging", "production"}:
            raise ValueError("APP_ENV must be one of development, test, staging, or production")
        if self.app_env in {"staging", "production"}:
            if self.jwt_secret == _DEV_JWT_SECRET or len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be set to a random value of at least 32 characters in production")
            if len(self.ai_service_token) < 32:
                raise ValueError("AI_SERVICE_TOKEN must be set to a random value of at least 32 characters in production")
            if self.debug:
                raise ValueError("DEBUG must be false in production")
            if not self.allowed_origins or any(
                origin == "*" or origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1")
                for origin in self.allowed_origins
            ):
                raise ValueError("ALLOWED_ORIGINS must contain explicit non-local origins in production")
        return self

    model_config = SettingsConfigDict(
        env_file="backend/.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
