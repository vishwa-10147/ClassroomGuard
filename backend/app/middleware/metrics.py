import time

from backend.app.core.metrics import REQUEST_COUNT, REQUEST_LATENCY
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

_EXCLUDED_PATHS = frozenset({"/health", "/health/ready", "/health/detailed", "/metrics"})


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path
        if path in _EXCLUDED_PATHS:
            return await call_next(request)

        method = request.method
        start = time.perf_counter()

        response = await call_next(request)

        elapsed = time.perf_counter() - start
        status = str(response.status_code)
        endpoint = path
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
        REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(elapsed)

        return response
