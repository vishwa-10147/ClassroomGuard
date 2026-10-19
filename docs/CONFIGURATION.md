# Configuration

ClassroomGuard is configured in three places:

| Where | What | Applied by |
|---|---|---|
| `.env` in the repository root | Server settings: secrets, addresses, email, database, Compose files | `sudo docker compose up -d` |
| `ai/config.yaml` on each AI machine | Cameras, models, thresholds and exam rules | `sudo docker compose up -d ai` (restart the AI engine) |
| **System Settings** in the web app | Organisation name and evidence retention period | Saved immediately |

Start from [`.env.example`](../.env.example). `scripts/install.sh` writes `.env` with random
secrets and `chmod 600`. Never commit `.env` or paste its values into tickets, chats or
documentation.

## Server environment variables

### Required

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Password of the bundled PostgreSQL database |
| `REDIS_PASSWORD` | Password of the bundled Redis. The Redis container refuses to start without it. Not needed when `REDIS_URL` points to a managed Redis |
| `JWT_SECRET` | Signs access tokens. At least 32 random characters in `production` and `staging` |
| `AI_SERVICE_TOKEN` | Shared secret the AI engines send as `X-Service-Token`. At least 32 characters in `production` and `staging`; must be identical on every AI host |

Generate values with `openssl rand -hex 32`.

### Application

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `production` (Compose), `development` (bare API) | One of `development`, `test`, `staging`, `production`. Staging and production enforce the secret, origin and debug checks, and hide `/docs` and `/openapi.json` |
| `SITE_ADDRESS` | – | Host name or IP users open; used by the HTTPS overlay (Caddy) |
| `CADDY_TLS` | `internal` | `internal` (Caddy's own CA), `/certs/fullchain.pem /certs/privkey.pem` (college certificate in `deploy/certs/`) or an email address (Let's Encrypt) |
| `FRONTEND_URL` | `http://localhost:3000` | Public URL of the web app, used in password-reset links |
| `ALLOWED_ORIGINS` | `["http://localhost:3000"]` | JSON list of browser origins allowed by CORS and the WebSocket origin check. Staging and production reject `*` and localhost origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` (Compose) | Access-token lifetime; the web app renews it automatically |
| `FRONTEND_PORT` | `3000` | Host port for the web app when the HTTPS overlay is not used |
| `BACKEND_PORT` | `8000` | Host port of the API, bound to `127.0.0.1` only |
| `FORWARDED_ALLOW_IPS` | Private ranges | Proxies whose `X-Forwarded-*` headers the API trusts |
| `RATE_LIMIT_ENABLED` | `true` | Set `false` only for automated test runs |
| `ALLOW_SELF_REGISTRATION` | `false` | Enables public `POST /api/v1/auth/register`, which creates a new organisation. Keep `false` for college installs |
| `TZ` | – | Container time zone, for example `Asia/Kolkata` |

### Email

Used for password-reset emails. Leave `SMTP_HOST` empty to disable sending (the API then only
logs that a reset was requested).

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | empty | Mail server, for example `smtp.college.edu` |
| `SMTP_PORT` | `587` | `587` with STARTTLS or `465` with SSL |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | empty | Account credentials |
| `SMTP_FROM` | `ClassroomGuard <no-reply@localhost>` | Sender shown to recipients |
| `SMTP_STARTTLS` | `true` | Set `false` together with `SMTP_SSL=true` for port 465 |
| `SMTP_SSL` | `false` | Implicit TLS |

### Database and Redis

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_DB` | `classroomguard` | Bundled database user and name |
| `DATABASE_URL` | Built from the values above | Set to use an external PostgreSQL, for example `postgresql+asyncpg://user:password@db-host:5432/classroomguard` |
| `REDIS_URL` | `redis://:${REDIS_PASSWORD}@redis:6379/0` | Set to use an external Redis; `rediss://` for TLS |
| `USE_REDIS` | `true` | `false` stops the API from using Redis: the response cache and WebSocket fan-out then stay in-process (single API process only) |
| `STORAGE_PATH` | `/app/storage` | Evidence frames and recordings inside the containers; `./storage` on the host |

### Docker Compose

| Variable | Description |
|---|---|
| `COMPOSE_FILE` | Files Compose loads, for example `docker-compose.yml:docker-compose.https.yml` |
| `COMPOSE_PATH_SEPARATOR` | Set `:` so the same `COMPOSE_FILE` works on Linux and Windows |
| `COMPOSE_PROFILES` | `ai` to run the AI engine on this machine; `monitoring` for Prometheus and Grafana |
| `IMAGE_PREFIX`, `IMAGE_TAG` | Registry images to run instead of building locally (AWS) |

### AI host (separate GPU machine)

Used by `docker-compose.ai-host.yml`:

| Variable | Description |
|---|---|
| `BACKEND_URL` | Address of the main server, for example `https://classroomguard.college.edu` |
| `AI_SERVICE_TOKEN` | Same value as on the main server |
| `AI_ENGINE_NAME` | Name shown for this engine in `/api/v1/status` |
| `REQUESTS_CA_BUNDLE` | Path to the main server's root certificate when it uses Caddy's internal CA |

### Monitoring and AWS

| Variable | Description |
|---|---|
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password. Grafana refuses to start without it when the `monitoring` profile is enabled |
| `GRAFANA_ADMIN_USER` | Grafana admin user (default `admin`) |
| `AWS_REGION`, `CLOUDWATCH_LOG_GROUP` | AWS overlay: CloudWatch Logs settings ([DEPLOY_AWS.md](DEPLOY_AWS.md)) |

### Observability

Both integrations are off by default. With the variables unset, the API behaves exactly as
before and does not import either library.

| Variable | Description |
|---|---|
| `SENTRY_DSN` | Sentry project DSN. When set, the API reports unhandled errors to Sentry, tagged with `APP_ENV` as the environment, and samples 10% of requests for performance traces |
| `ENABLE_TRACING` | `true` to export OpenTelemetry traces for every API request (service name `classroomguard-api`). Default `false` |
| `OTLP_ENDPOINT` | OTLP gRPC collector address used when `ENABLE_TRACING=true` (default `http://localhost:4317`). Inside Docker, point it at a collector on the Compose network, not `localhost` |

The `sentry-sdk` and `opentelemetry-*` packages are already in `backend/requirements.txt`. If
initialisation fails (for example, a missing package), the API logs a warning and starts
without that integration. Neither setting changes `/metrics`.

## AI engine (`ai/config.yaml`)

The Docker `ai` service mounts `ai/config.yaml`. `config_exam.yaml` and `config_classroom.yaml`
are ready-made variants for running the engine outside Docker.

### Cameras

```yaml
cameras:
  - id: 0
    name: "306-B front"
    backend_camera_id: "306B-CAM1"      # Camera ID entered on the Cameras page
    source: "rtsp://<user>:<password>@<camera-ip>:554/Streaming/Channels/101"
    resolution: [2560, 1440]
    fps: 20
```

`source` also accepts a video file path or a webcam index for testing. Use a camera account that
can only view streams.

### Models

| Key | Default | Description |
|---|---|---|
| `models.detection.weights` | `models/exam_detector.pt` | Phone and calculator detector |
| `models.detection.class_confidence` | phone `0.34`, calculator `0.59` | Per-class thresholds chosen on validation data (`models/exam_detector.eval.json`) |
| `models.detection.input_size` | `1280` | Inference resolution; smaller is faster but misses small phones |
| `models.detection.quantize` | `16` | FP16 on CUDA |
| `models.pose.weights` | `models/yolov8m-pose.pt` | Person and wrist keypoints |

### Exam rules and alerts

| Key | Default | Description |
|---|---|---|
| `cheating_rules.phone_usage.alert_after_seconds` | `1.0` | How long a phone must stay with a person before an alert |
| `cheating_rules.calculator_usage.allowed` | `false` | Set `true` for exams where calculators are permitted |
| `cheating_rules.calculator_usage.alert_after_seconds` | `1.5` | Persistence before a calculator alert |
| `cheating_rules.posture.enabled` | `false` | Head-turn and looking-down cues; enable only after per-camera calibration |
| `alerts.object_cooldown` | `120` | Seconds before the same person or desk can raise another phone or calculator alert |
| `alerts.cooldown` | `10` | Seconds between alerts of the same type for one person (other rules) |

More detail on the pipeline and thresholds: [ai/README.md](../ai/README.md).

## Mobile app (`mobile/.env`)

| Variable | Example |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://classroomguard.college.edu/api/v1` |
| `EXPO_PUBLIC_WS_URL` | `wss://classroomguard.college.edu/ws` |

Push notifications additionally need an Expo (EAS) project ID in `mobile/app.json`
(add `expo.extra.eas.projectId`).

## Web app (development only)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `http://localhost:8000` | API address the Vite dev server proxies `/api` and `/ws` to |

The production build calls `/api` and `/ws` on its own origin, so it needs no configuration.

## System Settings (web app)

| Setting | Effect |
|---|---|
| General → System name | Display name |
| General → Data Retention Period | Evidence frames older than this are deleted every night (02:00 and 03:00 jobs) |
