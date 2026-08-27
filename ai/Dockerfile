FROM nvidia/cuda:12.8.0-runtime-ubuntu22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        software-properties-common \
        curl \
        git \
    && add-apt-repository ppa:deadsnakes/ppa && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        python3.13 \
        python3.13-venv \
        python3.13-dev \
        python3-pip \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.13 1 && \
    update-alternatives --install /usr/bin/python python /usr/bin/python3.13 1 && \
    rm -rf /var/lib/apt/lists/*

RUN python -m pip install --break-system-packages --no-cache-dir pip setuptools wheel

WORKDIR /app

COPY ai/requirements.txt /app/requirements.txt
RUN pip install --break-system-packages --no-cache-dir -r requirements.txt

COPY ai/ /app/

RUN mkdir -p logs logs/snapshots storage/evidence storage/frames models

EXPOSE 8080

CMD ["python", "main.py", "--no-display"]
