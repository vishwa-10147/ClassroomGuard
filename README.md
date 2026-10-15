# ClassroomGuard

AI-assisted exam-hall monitoring. ClassroomGuard watches classroom CCTV cameras, detects
students using a **mobile phone** or an unpermitted **calculator**, and raises an alert with an
annotated evidence frame that invigilators review in a web dashboard or the mobile app.

[![CI](https://github.com/vishwa-10147/ClassroomGuard/actions/workflows/ci.yml/badge.svg)](https://github.com/vishwa-10147/ClassroomGuard/actions/workflows/ci.yml)

---

## Contents

- [How it works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Quick start (Docker)](#quick-start-docker)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Project structure](#project-structure)

## How it works

1. **Detect.** A YOLO model trained for exam halls finds phones and calculators in each frame
   (1280 px input, CUDA FP16). A pose model finds every student and their wrists.
2. **Associate.** Each object is assigned to the nearest student; an object within reach of a
   wrist is *in hand*, otherwise it is *at the desk*.
3. **Confirm.** The object must stay with that student for a configurable time (1 s for a
   phone, 1.5 s for a calculator) before it counts, which filters single-frame false alarms.
4. **Alert.** The AI engine sends the event to the API (HIGH for in-hand use, MEDIUM for
   possession) with an evidence frame. Invigilators acknowledge, assign and resolve it, and can
   escalate it to an incident.

Model, data and evaluation details: [ai/README.md](ai/README.md).

## Features

| Area | What you get |
|---|---|
| Detection | Phone and calculator detection, per-student association, in-hand vs. at-desk severity, head-turn and looking-down cues |
| Monitoring | Live camera views, real-time alerts over WebSocket, classroom seat maps |
| Investigation | Detection events, alerts with evidence frames, incidents, recordings with offline video analysis |
| Reporting | Daily / weekly / per-classroom reports with CSV and PDF export |
| Administration | Users, five built-in roles (super admin, admin, faculty, security, viewer), audit log, settings, webhooks (Slack / Teams / custom) |
| Compliance | Data-retention policies enforced daily, consent records, user data export and erasure |
| Mobile | Expo (React Native) app with alerts, cameras and push notifications |

## Architecture

```
 CCTV cameras (RTSP)
        │
        ▼
 ┌──────────────┐  events + evidence   ┌───────────────────────┐   ┌──────────────┐
 │  AI engine   │ ───────────────────▶ │  API (FastAPI)        │◀─▶│ PostgreSQL   │
 │  YOLO + pose │  X-Service-Token     │  REST + WebSocket     │   └──────────────┘
 │  CUDA / FP16 │                      │  Celery worker + beat │◀─▶ Redis
 └──────────────┘                      └───────────┬───────────┘
                                                   │ /api, /ws
                                      ┌────────────┴────────────┐
                                      │ Web app (React, nginx)  │   Mobile app (Expo)
                                      └─────────────────────────┘
```

| Component | Stack |
|---|---|
| Web app | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Recharts; served by nginx |
| API | Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic 2, JWT auth, slowapi rate limiting |
| Background jobs | Celery worker + Celery beat on Redis (webhooks, exports, retention, cleanup) |
| AI engine | PyTorch (CUDA 12.6), Ultralytics YOLO26 detector + YOLOv8 pose, ByteTrack, OpenCV |
| Mobile | Expo / React Native |
| Ops | Docker Compose, GitHub Actions (CI + AWS deploy), Prometheus + Grafana, CloudWatch on AWS |

## Quick start (Docker)

Requirements: Docker with Compose v2. For the AI engine, an NVIDIA GPU with a recent driver and
the NVIDIA Container Toolkit (Docker Desktop with WSL 2 on Windows).

```bash
cp .env.example .env
# set POSTGRES_PASSWORD, JWT_SECRET and AI_SERVICE_TOKEN (openssl rand -hex 32)

docker compose up -d --build                                # web platform
docker compose exec backend python -m backend.create_admin  # first admin account (prompts)
```

Open <http://localhost:3000> and sign in.

To run the AI engine, place the model weights in `ai/models/` (see
[ai/README.md](ai/README.md#models)), set the camera sources in `ai/config.yaml`, then:

```bash
docker compose --profile ai up -d --build ai
```

Optional monitoring (Prometheus on :9090, Grafana on :3001, localhost only):

```bash
docker compose --profile monitoring up -d
```

Database migrations run automatically when the API container starts.

## Local development

```bash
# Infrastructure
docker compose up -d postgres redis

# API on :8000 (auto-reload)
python -m venv backend/.venv && backend/.venv/Scripts/pip install -r backend/requirements-dev.txt   # Linux/macOS: backend/.venv/bin/
python -m backend.scripts.migrate
python -m backend.seed_users && python -m backend.seed_data      # demo accounts + sample data
uvicorn backend.app.main:app --reload --port 8000

# Web app on :3000 (proxies /api and /ws to :8000)
npm install
npm run dev
```

On Windows, `start.cmd` does the API and web app steps for you and opens the browser.

Demo accounts created by `seed_users` (development only):

| Role | Email | Password |
|---|---|---|
| Super admin | `admin@classguard.dev` | `Admin@12345` |
| Admin | `admin.admin@classguard.dev` | `Admin@12345` |
| Faculty | `faculty@classguard.dev` | `Faculty@12345` |
| Security | `security@classguard.dev` | `Security@12345` |
| Viewer | `viewer@classguard.dev` | `Viewer@12345` |

## Configuration

All services read settings from environment variables (`.env` for Docker Compose). See
[.env.example](.env.example) for the full list.

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | yes (local DB) | Password for the bundled PostgreSQL |
| `JWT_SECRET` | yes | Token signing key, 32+ random characters (enforced when `APP_ENV=production`) |
| `AI_SERVICE_TOKEN` | yes | Shared secret the AI engine uses to submit events |
| `ALLOWED_ORIGINS` | – | JSON list of browser origins allowed by CORS |
| `DATABASE_URL`, `REDIS_URL` | – | External PostgreSQL / Redis (e.g. RDS and ElastiCache) |
| `FRONTEND_PORT` | – | Host port for the web app (default 3000) |

AI behaviour (cameras, thresholds, rule timings, whether calculators are allowed) lives in
`ai/config_exam.yaml` and `ai/config.yaml`.

## Testing

| Suite | Command | Covers |
|---|---|---|
| Backend API | `TEST_BASE_URL=http://localhost:8000 pytest backend/tests` | 105 HTTP tests: auth, RBAC, every resource |
| AI rules | `pytest ai/tests` | Cheating rules, object assignment, timing, false-positive filter |
| Model | `python ai/scripts/evaluate_exam_detector.py` | Precision / recall on held-out data |
| Web unit | `npx jest src` | Formatters and utilities |
| End to end | `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test` | Login, every page without API errors, live socket |
| Static | `ruff check backend`, `mypy backend/app`, `npx tsc --noEmit` | Lint and types |

The backend HTTP tests log in many times per minute; run the API with `RATE_LIMIT_ENABLED=false`
for test runs. CI runs all of the above on every push.

## Deployment

- **AWS:** step-by-step guide in [docs/DEPLOY_AWS.md](docs/DEPLOY_AWS.md) (EC2 GPU instance, RDS,
  ElastiCache, ECR, ALB with TLS, CloudWatch). Pushes to `main` deploy automatically once the
  repository variables are set.
- **Single server:** `docker compose up -d` behind any TLS-terminating reverse proxy.

## Security

- JWT access tokens plus rotating, revocable refresh tokens (stored hashed); login is
  rate-limited to 5 attempts per minute.
- Role-based access control enforced on every endpoint from one permission catalogue
  (`backend/app/core/permissions.py`); only super admins can create or promote super admins.
- The AI engine authenticates with a dedicated service token; the live-alert WebSocket requires
  a valid access token.
- The API refuses to start in production with a default or short `JWT_SECRET` and hides the
  interactive API docs.
- Containers run as non-root users; the API is reachable only through nginx in production.
- Camera stream URLs (which often embed credentials) are never returned in error messages.

Report security issues privately to the maintainers rather than in public issues.

## Project structure

```
ClassroomGuard/
├── src/                     Web app (React + TypeScript)
├── backend/                 API, background jobs, migrations, tests
│   ├── app/api/             Route handlers
│   ├── app/core/            Config, security, permissions, Celery, WebSocket
│   ├── app/models/          SQLAlchemy models
│   ├── alembic/             Database migrations
│   └── tests/               API test suite
├── ai/                      AI engine
│   ├── src/                 Detector, pose, tracker, rules, alerts
│   ├── scripts/             Dataset build, evaluation, video review
│   ├── training/            Model training
│   └── tests/               Rules unit tests
├── mobile/                  Expo mobile app
├── e2e/                     Playwright end-to-end tests
├── monitoring/              Prometheus and Grafana configuration
├── docs/                    Deployment guides
├── docker-compose.yml       Full stack (profiles: ai, monitoring)
└── docker-compose.aws.yml   AWS overlay (RDS, ElastiCache, ECR, CloudWatch)
```

## License

Private project. All rights reserved.
