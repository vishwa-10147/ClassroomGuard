import logging

logger = logging.getLogger(__name__)


def setup_sentry(dsn: str | None = None, environment: str = "production", traces_sample_rate: float = 0.1) -> None:
    if not dsn:
        logger.info("Sentry DSN not configured — error tracking disabled")
        return
    try:
        import sentry_sdk

        sentry_sdk.init(dsn=dsn, environment=environment, traces_sample_rate=traces_sample_rate)
        logger.info("Sentry error tracking initialised (environment=%s)", environment)
    except ImportError:
        logger.warning("sentry-sdk not installed — error tracking disabled")
