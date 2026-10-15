# syntax=docker/dockerfile:1
# ClassroomGuard API. Build context: backend/  (docker build -f backend/Dockerfile backend)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/storage /app/logs && \
    chown -R appuser:appuser /app

COPY requirements.txt /app/backend/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r /app/backend/requirements.txt

COPY --chown=appuser:appuser . /app/backend/

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]

# Migrate first (fails the container if the schema cannot be brought up to date), then serve.
# One worker: live alerts are pushed from in-process WebSocket connections.
# --proxy-headers: the API sits behind nginx / an AWS load balancer.
CMD ["sh", "-c", "python -m backend.scripts.migrate && exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
