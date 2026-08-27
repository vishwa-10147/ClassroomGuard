import logging
from functools import wraps
from typing import Any, Callable, TypeVar

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])

_tracer_provider: TracerProvider | None = None


def setup_tracing(
    app: Any,
    service_name: str = "classguard-backend",
    otlp_endpoint: str = "http://localhost:4317",
) -> None:
    global _tracer_provider
    try:
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        resource = Resource.create({"service.name": service_name})
        provider = TracerProvider(resource=resource)
        exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        _tracer_provider = provider

        FastAPIInstrumentor.instrument_app(app)
        logger.info("OpenTelemetry tracing initialised (endpoint=%s)", otlp_endpoint)
    except Exception:
        logger.warning("OpenTelemetry tracing setup skipped — dependencies missing", exc_info=True)


def shutdown_tracing() -> None:
    if _tracer_provider is not None:
        try:
            _tracer_provider.shutdown()
        except Exception:
            logger.debug("TracerProvider shutdown failed", exc_info=True)


def traced(name: str | None = None) -> Callable[[F], F]:
    """Decorator that wraps a function call in an OpenTelemetry span."""

    def decorator(fn: F) -> F:
        @wraps(fn)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            tracer = trace.get_tracer(__name__)
            with tracer.start_as_current_span(name or fn.__name__):
                return await fn(*args, **kwargs)

        @wraps(fn)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            tracer = trace.get_tracer(__name__)
            with tracer.start_as_current_span(name or fn.__name__):
                return fn(*args, **kwargs)

        import asyncio
        if asyncio.iscoroutinefunction(fn):
            return async_wrapper  # type: ignore[return-value]
        return sync_wrapper  # type: ignore[return-value]

    return decorator
