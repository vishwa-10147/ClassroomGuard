# ClassroomGuard setup guide

This guide takes ClassroomGuard from a fresh server to a working exam-hall monitoring system.
It covers installation, first-time configuration, verification and local development.
For day-to-day operations (backups, updates, troubleshooting, security checklist), see
[docs/DEPLOY_ONPREM.md](docs/DEPLOY_ONPREM.md).

| Step | Who | Time |
|---|---|---|
| [1. Prepare the server](#1-prepare-the-server) | IT | 30 min |
| [2. Install ClassroomGuard](#2-install-classroomguard) | IT | 15 min |
| [3. Configure the system](#3-configure-the-system) | IT + examination cell | 20 min per hall |
| [4. Verify the installation](#4-verify-the-installation) | IT | 10 min |
| [5. Development setup](#5-development-setup) | Developers | 15 min |

---

## 1. Prepare the server

### Hardware

| | Web platform only | Web platform + AI engine |
|---|---|---|
| CPU / RAM | 4 cores / 8 GB | 8 cores / 32 GB |
| GPU | – | NVIDIA with 8 GB+ VRAM (one RTX 4070-class GPU handles ~4 cameras) |
| Disk | 100 GB SSD | 500 GB+ SSD |
| OS | Ubuntu Server 22.04 or 24.04 LTS | Ubuntu Server 24.04 LTS |

### Software

```bash
# Docker Engine and the Compose plugin
curl -fsSL https://get.docker.com | sudo sh

# GPU server only: NVIDIA driver, then the NVIDIA Container Toolkit
sudo ubuntu-drivers install
#   https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
sudo reboot
nvidia-smi                       # must list the GPU
```

### Network

- Open ports **80** and **443** to staff PCs; nothing else needs to be reachable.
- The server must reach the cameras on **554/RTSP** and the mail server on **587** or **465**.
- Create a DNS name such as `classroomguard.college.edu` for the server (an IP address also works).

---

## 2. Install ClassroomGuard

```bash
sudo git clone https://github.com/vishwa-10147/ClassroomGuard.git /opt/classroomguard
cd /opt/classroomguard

# GPU server: copy the two model files (supplied separately, not stored in git)
sudo cp /path/to/exam_detector.pt /path/to/yolov8m-pose.pt ai/models/

sudo ./scripts/install.sh
```

The installer asks for the address users will open and the first administrator's email and
password (12+ characters). It then:

- writes `/opt/classroomguard/.env` with random secrets for the database, Redis, sign-in
  tokens, the AI engine and Grafana (readable by root only);
- builds and starts every service behind HTTPS, including the AI engine when a GPU is available;
- waits until the system is healthy and creates the administrator account.

Unattended installation:

```bash
sudo SITE_ADDRESS=classroomguard.college.edu ADMIN_EMAIL=it@college.edu \
     ADMIN_PASSWORD='a-long-unique-password' ./scripts/install.sh
```

Open `https://<your address>` and sign in.

---

## 3. Configure the system

### 3.1 HTTPS certificate

By default the server uses its own certificate authority, which browsers warn about. Choose one:

| Option | Setting in `.env` |
|---|---|
| College certificate (recommended) | Copy files to `deploy/certs/`, set `CADDY_TLS=/certs/fullchain.pem /certs/privkey.pem` |
| Internal CA | Keep `CADDY_TLS=internal` and install `deploy/caddy/data/caddy/pki/authorities/local/root.crt` as a trusted root on staff PCs |
| Let's Encrypt | `CADDY_TLS=you@college.edu` (public DNS name and open ports 80/443 required) |

Apply changes with `sudo docker compose up -d`.

### 3.2 Email

Needed for **Forgot password** emails (alerts are delivered in the app, by push notification
and by webhook, not by email). Add to `.env`, then `sudo docker compose up -d`:

```bash
SMTP_HOST=smtp.college.edu
SMTP_PORT=587
SMTP_USERNAME=classroomguard@college.edu
SMTP_PASSWORD=<password>
SMTP_FROM=ClassroomGuard <classroomguard@college.edu>
```

### 3.3 Classrooms and cameras

1. **Classrooms → Add classroom**: one entry per exam hall (name, building, floor, room, seats).
2. **Cameras → Add camera**: give each camera a short **Camera ID** (for example `306B-CAM1`),
   select its classroom and, to watch video in the browser, enter its RTSP URL.
3. Tell the AI engine about each camera in `ai/config.yaml`:

   ```yaml
   cameras:
     - id: 0
       name: "306-B front"
       backend_camera_id: "306B-CAM1"      # must match the Camera ID from step 2
       source: "rtsp://viewer:PASSWORD@10.0.5.31:554/Streaming/Channels/101"
       resolution: [2560, 1440]
       fps: 20
   ```

4. Restart the AI engine: `sudo docker compose up -d ai`.

Within a minute the header shows **AI Online** and each camera turns **online** on the Cameras
page. Use a camera account that can only view streams.

### 3.4 Exam rules

In `ai/config.yaml` (restart the AI engine after editing):

| Setting | Default | Meaning |
|---|---|---|
| `cheating_rules.calculator_usage.allowed` | `false` | Set `true` for exams where calculators are permitted |
| `cheating_rules.phone_usage.alert_after_seconds` | `1.0` | How long a phone must stay with a student before an alert |
| `alerts.object_cooldown` | `120` | Seconds before the same student or desk can raise another phone/calculator alert |

### 3.5 Staff accounts and retention

- **Users → Add user** for each staff member, with the least role they need (see the role table
  in [docs/DEPLOY_ONPREM.md](docs/DEPLOY_ONPREM.md#7-users-and-roles)).
- **System Settings → General → Data Retention Period** controls how long evidence frames are
  kept; older frames are deleted automatically every night.

### 3.6 Backups

```bash
sudo crontab -e
0 2 * * * /opt/classroomguard/scripts/backup.sh >> /var/log/classroomguard-backup.log 2>&1
```

Copy the `backups/` folder to another machine or network share regularly.

---

## 4. Verify the installation

Run through this checklist before the first live exam.

| Check | How | Expected |
|---|---|---|
| All services running | `sudo docker compose ps` | Every service `Up`, health `healthy` |
| HTTPS | Open `https://<address>` | Sign-in page, no certificate warning |
| AI engine | Header in the web app | **AI Online** |
| Cameras | Cameras page | Each camera **online** with a frame rate |
| Detection | Hold a phone in view of a camera for 2–3 seconds | An alert appears on the Dashboard and Alerts page within seconds, with an evidence frame under Evidence |
| Email | Sign-in page → Forgot password | Reset email arrives |
| Reports | Reports → Generate → PDF | PDF opens with the period's figures |
| Backup | `sudo ./scripts/backup.sh` | `db_*.dump` and `storage_*.tar.gz` created in `backups/` |

Run a supervised pilot exam with invigilators checking every alert before relying on the system.

---

## 5. Development setup

Requirements: Python 3.12 (`.python-version`), Node.js 22 (`.nvmrc`), Docker. A CUDA GPU is
needed only for the AI engine.

```bash
git clone https://github.com/vishwa-10147/ClassroomGuard.git && cd ClassroomGuard
cp .env.example .env            # set POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SECRET, AI_SERVICE_TOKEN; APP_ENV=development

# Database and Redis
docker compose up -d postgres redis

# API on http://localhost:8000 (run from the repository root)
python -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements-dev.txt          # Windows: backend\.venv\Scripts\pip
export DATABASE_URL=postgresql+asyncpg://classroomguard:<POSTGRES_PASSWORD>@localhost:5432/classroomguard
export REDIS_URL=redis://:<REDIS_PASSWORD>@localhost:6379/0
export APP_ENV=development
backend/.venv/bin/python -m backend.scripts.migrate
backend/.venv/bin/python -m backend.seed_users                         # demo accounts (development only)
backend/.venv/bin/python -m backend.seed_data                          # demo data (development only)
backend/.venv/bin/uvicorn backend.app.main:app --reload --port 8000

# Web app on http://localhost:3000 (proxies /api and /ws to :8000)
npm install
npm run dev
```

On Windows (PowerShell), set variables with `$env:DATABASE_URL = "..."` and use
`backend\.venv\Scripts\python`. `start.cmd` starts the API and web app and opens the browser.
If ports 3000 or 8000 are taken, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md#development).

PostgreSQL is published on `127.0.0.1:5432`. Redis is not published by default; for development,
create `docker-compose.override.yml` (ignored by the production setup, which sets `COMPOSE_FILE`)
before starting the containers:

```yaml
services:
  redis:
    ports:
      - "127.0.0.1:6379:6379"
```

Demo accounts created by `seed_users` (never run this on a production server):

| Role | Email | Password |
|---|---|---|
| Super admin | `admin@classguard.dev` | `Admin@12345` |
| Admin | `admin.admin@classguard.dev` | `Admin@12345` |
| Faculty | `faculty@classguard.dev` | `Faculty@12345` |
| Security | `security@classguard.dev` | `Security@12345` |
| Viewer | `viewer@classguard.dev` | `Viewer@12345` |

AI engine and model training: [ai/README.md](ai/README.md). Mobile app: copy
`mobile/.env.example` to `mobile/.env`, set the server address, then `cd mobile && npm install && npx expo start`.

### Running the tests

```bash
# Backend (API running with RATE_LIMIT_ENABLED=false and the demo seed data)
cd backend && TEST_BASE_URL=http://localhost:8000 python -m pytest tests/ && cd ..

# AI rules
cd ai && python -m pytest tests/ && cd ..

# Web lint, unit tests and type checks
npm run lint && npx jest src && npx tsc --noEmit

# End to end against a running stack (add E2E_AI_TOKEN and E2E_CAMERA_ID for the live-alert test)
PLAYWRIGHT_BASE_URL=https://classroomguard.college.edu E2E_IGNORE_HTTPS_ERRORS=1 \
E2E_EMAIL=<admin email> E2E_PASSWORD=<password> npx playwright test
```

---

## Getting help

| Topic | Document |
|---|---|
| Operations, security checklist, troubleshooting | [docs/DEPLOY_ONPREM.md](docs/DEPLOY_ONPREM.md) |
| AWS deployment | [docs/DEPLOY_AWS.md](docs/DEPLOY_AWS.md) |
| AI engine, accuracy, retraining | [ai/README.md](ai/README.md) |
| All configuration variables | [docs/CONFIGURATION.md](docs/CONFIGURATION.md) |
| Architecture and API | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/API.md](docs/API.md) |
| Problems | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) |
