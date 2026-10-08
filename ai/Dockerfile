FROM nvidia/cuda:12.8.0-runtime-ubuntu22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        software-properties-common \
        curl \
        git \
        python3 \
        python3-venv \
        python3-dev \
        python3-pip \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3 1 \
    && rm -rf /var/lib/apt/lists/*

RUN python -m pip install --no-cache-dir pip setuptools wheel

WORKDIR /app

COPY ai/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ai/ /app/

RUN mkdir -p logs logs/snapshots storage/evidence storage/frames models

EXPOSE 8080

CMD ["python", "main.py", "--no-display"]
