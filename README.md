# ClassroomGuard

**AI-assisted exam-hall monitoring.** ClassroomGuard watches classroom CCTV cameras, detects
students using a **mobile phone** or an unpermitted **calculator**, and alerts invigilators in
real time with an annotated evidence frame. Staff review and act on alerts from a web dashboard
or the mobile app.

[![CI](https://github.com/vishwa-10147/ClassroomGuard/actions/workflows/ci.yml/badge.svg)](https://github.com/vishwa-10147/ClassroomGuard/actions/workflows/ci.yml)

> **Installing it?** Start with **[SETUP.md](SETUP.md)**.
> IT departments: the full operations guide is [docs/DEPLOY_ONPREM.md](docs/DEPLOY_ONPREM.md).

---

## Contents

- [How it works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Detection accuracy](#detection-accuracy)
- [Quick start](#quick-start)
- [Testing and quality](#testing-and-quality)
- [Deployment](#deployment)
- [Security and privacy](#security-and-privacy)
- [Known limitations](#known-limitations)
- [Project structure](#project-structure)

## How it works

1. **Detect.** A detector trained for exam halls finds phones and calculators in each camera
   frame (1280 px, CUDA FP16). A pose model finds every student and their wrists.
2. **Associate.** Each object is assigned to the nearest student. An object within reach of a
   wrist is *in hand*; otherwise it is *at the desk*.
3. **Confirm.** The object must stay with that student for a set time (1 s for a phone, 1.5 s
   for a calculator), which filters out single-frame false alarms. Repeat alerts for the same
   student or desk are suppressed for 2 minutes.
4. **Alert.** The AI engine sends the detection to the API. It appears instantly on every open
   dashboard: **HIGH** for in-hand use, **MEDIUM** for possession, with the evidence frame.
   Invigilators acknowledge, resolve or escalate it to an incident.

## Features

| Area | Capabilities |
|---|---|
| **Detection** | Phone and calculator detection; per-student association; in-hand vs. at-desk severity; calculator rule switchable per exam |
| **Real-time monitoring** | Alerts, events, evidence and dashboard figures update live over WebSocket without reloading; in-app notifications; AI engine and camera status reported every 30 s |
| **Investigation** | Detection events with evidence frames; alerts (acknowledge / assign / resolve); incidents; recording upload with offline analysis |
| **Reporting** | Period and classroom summaries with daily breakdown; CSV and PDF export |
| **Administration** | Users and five built-in roles; permission matrix; audit log; system settings; webhooks (Slack, Microsoft Teams, custom) |
| **Accounts** | Email password reset; automatic session renewal; rate-limited sign-in |
| **Compliance** | Evidence retention enforced nightly from System Settings; consent records; personal data export and erasure |
| **Operations** | One-command installer, HTTPS, backups and restore, updates, health checks, optional Prometheus and Grafana |
| **Mobile** | Expo (React Native) app with alerts, cameras and push notifications |

## Architecture

```
 Exam-hall cameras (RTSP)
          │
          ▼
 ┌─────────────────┐  detections, heartbeat   ┌────────────────────────┐    ┌────────────┐
 │  AI engine      │ ───────────────────────▶ │  API (FastAPI)         │◀──▶│ PostgreSQL │
 │  YOLO detector  │  X-Service-Token         │  REST + WebSocket      │    └────────────┘
 │  + pose, CUDA   │                          │  Celery worker + beat  │◀──▶ Redis
 └─────────────────┘                          └───────────┬────────────┘
                                                          │ /api, /ws (live)
                                       HTTPS ┌────────────┴────────────┐
                              browsers ─────▶│ Caddy ─▶ web app (nginx)│   Mobile app
                                             └─────────────────────────┘
```

| Component | Technology |
|---|---|
| Web app | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Recharts; served by nginx |
| API | Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic 2, JWT |
| Background jobs | Celery worker and beat on Redis (alerts fan-out, webhooks, exports, retention, camera health) |
| AI engine | PyTorch (CUDA 12.6), Ultralytics YOLO26 detector + YOLOv8 pose, ByteTrack, OpenCV |
| Delivery | Docker Compose; Caddy for HTTPS on-premise; GitHub Actions CI and AWS deployment |

## Detection accuracy

Measured on held-out data the model never saw during training (thresholds fixed on validation
data beforehand). Full method and figures: [ai/README.md](ai/README.md).

| Test set | Class | Precision | Recall | F1 |
|---|---|---|---|---|
| All test images (387) | Mobile phone | 0.94 | 0.74 | 0.83 |
| All test images (387) | Calculator | 0.83 | 0.89 | 0.86 |
| Unseen CCTV classroom | Mobile phone | 0.93 | 0.43 | 0.59 |

These are per-frame figures. Because a phone has to persist for a second or more, a phone in use
is usually caught over several frames even when a single frame misses it. Precision is high, so
false accusations are rare, but **some phones will be missed**, particularly small ones at the
back of large halls.

## Quick start

On a Linux server with Docker (and, for the AI engine, an NVIDIA GPU):

```bash
git clone https://github.com/vishwa-10147/ClassroomGuard.git /opt/classroomguard
cd /opt/classroomguard
sudo cp /path/to/exam_detector.pt /path/to/yolov8m-pose.pt ai/models/   # model files, supplied separately
sudo ./scripts/install.sh
```

The installer generates secrets, starts every service behind HTTPS and creates the first
administrator. Then add classrooms and cameras as described in [SETUP.md](SETUP.md).

For local development, see [SETUP.md → Development setup](SETUP.md#5-development-setup).

## Testing and quality

| Suite | Scope | Result at release |
|---|---|---|
| Backend API (`backend/tests`) | 109 HTTP tests: authentication, RBAC, every resource, reports, password reset | All passing |
| AI rules (`ai/tests`) | Rules engine, object assignment, timing, de-duplication, false-positive filter | 11 passing |
| End-to-end (`e2e/`) | Sign-in, every page free of API errors and crashes, password reset, live WebSocket, **AI detection appearing live** | 7 passing |
| Web unit (`src/**/*.test.ts`) | Utilities | 4 passing |
| Static analysis | `ruff`, `mypy`, `tsc` (web and mobile) | Clean |

The full stack has also been verified from a clean clone with `scripts/install.sh`, with the
GPU AI engine processing real exam-hall recordings: detections, live alerts, evidence frames,
camera status, backup and restore, and email password reset. CI runs the automated suites on
every push.

## Deployment

| Target | Guide |
|---|---|
| **College server (on-premise)** | [SETUP.md](SETUP.md) and [docs/DEPLOY_ONPREM.md](docs/DEPLOY_ONPREM.md) |
| **AWS** | [docs/DEPLOY_AWS.md](docs/DEPLOY_AWS.md): EC2 GPU, RDS, ElastiCache, ECR, ALB with TLS, CloudWatch |
| **Additional AI machine** | `docker compose -f docker-compose.ai-host.yml up -d` ([details](docs/DEPLOY_ONPREM.md#9-operations)) |

Operations: `scripts/backup.sh`, `scripts/restore.sh`, `scripts/update.sh`.

## Security and privacy

- HTTPS only on-premise (Caddy); only ports 80 and 443 are exposed.
- Short-lived JWT access tokens with rotating, revocable refresh tokens stored hashed; sign-in and
  password reset are rate limited; reset links are single-use and stored hashed.
- Role-based access control on protected endpoints from one permission catalogue
  (`backend/app/core/permissions.py`); only super admins can create or promote super admins.
- The AI engine authenticates with a dedicated service token; live updates require a signed-in user.
- The API refuses to start in production with a weak `JWT_SECRET`; containers run as non-root.
- Evidence frames are deleted automatically after the retention period set in System Settings.

### Production hardening checklist

Before exposing an installation to real users:

1. Copy `.env.example` to `.env`, generate unique secrets, and keep the file outside source control.
   Production requires `JWT_SECRET`, `AI_SERVICE_TOKEN`, `POSTGRES_PASSWORD`, and `REDIS_PASSWORD`.
2. Set explicit HTTPS `FRONTEND_URL` and `ALLOWED_ORIGINS`; never use localhost origins in staging or
   production.
3. Use the readiness endpoint (`/health/ready`) for load-balancer and container health checks. It
   returns `503` when PostgreSQL or Redis is unavailable.
4. Put Prometheus and Grafana on an administration-only network, set a unique Grafana password, and
   do not expose their ports publicly.
5. Use organization-scoped accounts and verify cross-organization access with the backend test suite
   before importing existing data. Existing legacy rows with a null `organization_id` require a
   migration/ownership decision before production use.
6. Rotate any credentials that may have existed in local `.env` or backup files, and remove real
   student evidence from source trees and deployment archives.

ClassroomGuard processes video of students. Colleges should inform students and staff, set a
retention period that matches their examination rules, and treat every alert as a prompt for an
invigilator to check, never as proof on its own (see
[docs/DEPLOY_ONPREM.md → Privacy and policy](docs/DEPLOY_ONPREM.md#11-privacy-and-policy)).

## Known limitations

- **Accuracy:** some phones are missed (see [Detection accuracy](#detection-accuracy)). Calculator
  detection has been validated on photographs, not yet on CCTV footage.
- **Who is who:** detections are tied to a tracked person and a camera, not to a named student or
  seat. Invigilators are tracked like students.
- **Head-turn and looking-down cues** are implemented but disabled by default: on overhead cameras
  they fire on normal exam behaviour and need per-camera calibration.
- **Live video in the browser** requires the camera's RTSP URL to be entered on the Cameras page;
  the AI engine works without it.
- The best accuracy gain will come from retraining with labelled footage from the college's own
  halls ([ai/README.md → Improving the model](ai/README.md#improving-the-model)).

## Project structure

```
ClassroomGuard/
├── src/                        Web app (React + TypeScript)
├── backend/                    API, background jobs, migrations, tests
├── ai/                         AI engine, training, evaluation, rules tests
├── mobile/                     Expo mobile app
├── e2e/                        Playwright end-to-end tests
├── deploy/caddy/               HTTPS reverse-proxy configuration
├── scripts/                    install, backup, restore, update
├── docs/                       On-premise and AWS deployment guides
├── monitoring/                 Prometheus and Grafana configuration
├── docker-compose.yml          Full stack (profiles: ai, monitoring)
├── docker-compose.https.yml    On-premise HTTPS overlay
├── docker-compose.ai-host.yml  AI engine on a separate GPU machine
└── docker-compose.aws.yml      AWS overlay
```

## License

Private project. All rights reserved.
