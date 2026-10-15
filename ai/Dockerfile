# syntax=docker/dockerfile:1
# ClassroomGuard AI engine (GPU). Build context: ai/  (docker build -f ai/Dockerfile ai)
#
# PyTorch wheels ship their own CUDA runtime, so a slim Python base is enough; the host
# needs only the NVIDIA driver + NVIDIA Container Toolkit (run with --gpus all, or the
# compose `deploy.resources.reservations.devices` block). Without a GPU it falls back to CPU.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility,video \
    YOLO_CONFIG_DIR=/home/appuser/.config/Ultralytics

RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglib2.0-0 ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN useradd -m -u 1000 appuser

# CUDA 12.6 PyTorch build (runs on NVIDIA driver >= 525: T4, A10G, L4, RTX 30/40)
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126

COPY requirements.txt /app/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY --chown=appuser:appuser . /app/
RUN mkdir -p logs/snapshots storage/evidence storage/frames models && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8080/api/stats')"]

CMD ["python", "main.py", "--no-display", "--config", "config.yaml"]
