# ClassroomGuard: on-premise installation guide

For the college IT department. This guide installs ClassroomGuard on a server inside the campus
network, serves it over HTTPS, connects the exam-hall cameras, and sets up backups and updates.
Typical installation time: about one hour, plus camera setup.

## 1. What gets installed

```
 Exam-hall IP cameras ──RTSP──▶ ┌─────────────── ClassroomGuard server (Docker) ───────────────┐
                                │  ai          GPU detection engine (phone / calculator)      │
 Staff browsers / mobile app    │  caddy       HTTPS on 443 (80 redirects)  ◀── only exposed   │
   ──HTTPS 443──────────────────▶  frontend    web app (nginx)                                 │
                                │  backend     API + migrations       celery worker / beat     │
                                │  postgres    database               redis                    │
                                └──────────────────────────────────────────────────────────────┘
```

All services run as Docker containers that restart automatically after a reboot. Only ports
80 and 443 are opened on the server.

## 2. Requirements

### Server

| | Minimum (web platform only) | Recommended (web + AI on one server) |
|---|---|---|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 32 GB |
| GPU | – | NVIDIA, 8 GB+ VRAM (RTX 3060/4060 or better, T4, A10, L4) |
| Disk | 100 GB SSD | 500 GB+ SSD (evidence frames and recordings) |
| OS | Ubuntu Server 22.04 or 24.04 LTS | Ubuntu Server 24.04 LTS |

One RTX 4070-class GPU handles about **4 cameras** at 10 frames per second (measured). For more
cameras, add GPUs or run additional AI servers (section 9).

### Software

```bash
# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sudo sh

# AI server only: NVIDIA driver (535+) and NVIDIA Container Toolkit
sudo ubuntu-drivers install
# then follow https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
sudo reboot
nvidia-smi                                   # must list the GPU
```

### Network

| From | To | Port | Purpose |
|---|---|---|---|
| Staff PCs / phones | Server | 443 (and 80 → redirect) | Web app and API |
| Server | Cameras / NVR | 554 (RTSP) | Video for the AI engine |
| Server | College mail server | 587 or 465 | Password-reset emails |
| Server | Internet (install/update only) | 443 | Docker images, Python and npm packages |

Create a DNS record (e.g. `classroomguard.college.edu`) pointing at the server, or use its IP.
Use a camera account that can only **view** streams.

## 3. Install

```bash
sudo mkdir -p /opt && cd /opt
sudo git clone https://github.com/vishwa-10147/ClassroomGuard.git classroomguard
cd classroomguard

# AI server only: put the model files in place (provided separately, not in git)
sudo cp /path/to/exam_detector.pt /path/to/yolov8m-pose.pt ai/models/

sudo ./scripts/install.sh
```

The installer:

1. checks Docker, Compose and (if present) GPU access;
2. asks for the address users will open and writes `/opt/classroomguard/.env` with random
   passwords and secrets for PostgreSQL, Redis, sign-in tokens, the AI engine and Grafana
   (`chmod 600`);
3. builds and starts all services behind HTTPS and waits until the API is healthy;
4. asks for the first **super admin** email and password (12+ characters).

Unattended alternative:

```bash
sudo SITE_ADDRESS=classroomguard.college.edu ADMIN_EMAIL=it@college.edu \
     ADMIN_PASSWORD='a-long-unique-password' ./scripts/install.sh
```

Open `https://<address>` and sign in.

## 4. HTTPS certificate

Choose one by setting `CADDY_TLS` in `.env`, then run `sudo docker compose up -d`:

| Option | `CADDY_TLS` | When |
|---|---|---|
| College certificate (recommended) | `/certs/fullchain.pem /certs/privkey.pem` | Copy the files into `deploy/certs/` |
| Internal CA (default) | `internal` | Quick start. Install `deploy/caddy/data/caddy/pki/authorities/local/root.crt` as a trusted root on staff PCs (for example by Group Policy) to remove browser warnings |
| Let's Encrypt | your email address | Only if the name is publicly resolvable and ports 80/443 are reachable from the internet |

## 5. Email

Required for "Forgot password" emails. Alerts reach staff in the web app, by push notification
and by webhook. Add to `.env`, then `sudo docker compose up -d`:

```bash
SMTP_HOST=smtp.college.edu        # or smtp.office365.com / smtp.gmail.com
SMTP_PORT=587                     # 465 with SMTP_SSL=true, SMTP_STARTTLS=false
SMTP_USERNAME=classroomguard@college.edu
SMTP_PASSWORD=...
SMTP_FROM=ClassroomGuard <classroomguard@college.edu>
```

Test it: on the sign-in page use **Forgot password?** with your admin email.

## 6. Connect the cameras

1. In the web app, **Classrooms → Add classroom** for each exam hall.
2. **Cameras → Add camera**: give each camera a short **Camera ID** (for example `306B-CAM1`),
   assign it to its classroom, and enter its RTSP URL to enable snapshots and live view.
3. On the AI server, list the same cameras in `ai/config.yaml`:

   ```yaml
   cameras:
     - id: 0
       name: "306-B front"
       backend_camera_id: "306B-CAM1"     # the Camera ID from step 2
       source: "rtsp://viewer:PASSWORD@10.0.5.31:554/Streaming/Channels/101"
       resolution: [2560, 1440]
       fps: 20
   ```

4. `sudo docker compose up -d ai`. The header in the web app shows **AI Online** within a
   minute; detections appear under **Detection Events** and **Evidence**.

Exam rules (phone always prohibited; calculator only when `calculator_usage.allowed: false`) and
timings are in `ai/config.yaml`; see [ai/README.md](../ai/README.md).

## 7. Users and roles

Create staff accounts under **Users**. Built-in roles:

| Role | Typical user | Can |
|---|---|---|
| Super admin | IT administrator | Everything, including settings, roles and deleting data |
| Admin | Examination cell | Manage users (not super admins), cameras, classrooms, alerts, reports |
| Security | Security staff | View cameras, handle alerts and incidents |
| Faculty | Invigilators | View cameras, events and alerts; acknowledge alerts |
| Viewer | Management | Read-only dashboards and reports |

## 8. Backups, restore and updates

```bash
sudo ./scripts/backup.sh                         # database + evidence → ./backups (keeps 14 days)
sudo crontab -e                                   # nightly at 02:00:
0 2 * * * /opt/classroomguard/scripts/backup.sh >> /var/log/classroomguard-backup.log 2>&1
```

Copy `backups/` to another machine or network share every day; a backup on the same disk does
not protect against disk failure. Restore (replaces current data, asks for confirmation):

```bash
sudo ./scripts/restore.sh backups/db_YYYYMMDD_HHMMSS.dump backups/storage_YYYYMMDD_HHMMSS.tar.gz
```

Update to a new release (takes a backup first, adds any secrets the new release requires to
`.env`, and database migrations run automatically):

```bash
sudo ./scripts/update.sh            # or: sudo ./scripts/update.sh v1.1.0
```

## 9. Operations

| Task | Command (in `/opt/classroomguard`) |
|---|---|
| Status of all services | `sudo docker compose ps` |
| Logs | `sudo docker compose logs -f backend` (or `ai`, `caddy`, `frontend`) |
| Health (database, Redis) | `curl -k https://localhost/healthz` (200 when PostgreSQL and Redis respond, 503 otherwise) |
| AI engines online | `curl -k https://localhost/api/v1/status` |
| Restart everything | `sudo docker compose restart` |
| Stop / start | `sudo docker compose down` / `sudo docker compose up -d` |
| GPU usage | `nvidia-smi` |
| Change a setting | edit `.env`, then `sudo docker compose up -d` |

**More cameras / a separate AI server:** on the GPU machine install Docker + the NVIDIA toolkit,
clone the repository, copy the models into `ai/models/`, list that machine's cameras in
`ai/config.yaml`, and create `.env`:

```bash
BACKEND_URL=https://classroomguard.college.edu
AI_SERVICE_TOKEN=<same value as on the main server>
AI_ENGINE_NAME=ai-block-b
# only if the main server uses the internal CA (copy its root.crt to deploy/certs/):
REQUESTS_CA_BUNDLE=/certs/root.crt
```

Mount the main server's `storage/` folder on this machine at `./storage` (NFS or SMB share) so
evidence frames appear in the web app, then start the engine:

```bash
sudo docker compose -f docker-compose.ai-host.yml up -d --build
```

Each engine appears in `curl -k https://<server>/api/v1/status` under `aiEngines`.

## 10. Security checklist

- [ ] `.env` is readable only by root (`chmod 600`); it holds all passwords and secrets
- [ ] Only ports 80/443 are reachable on the server (`sudo ufw allow 80,443/tcp && sudo ufw enable`, keeping SSH open)
- [ ] A trusted certificate is installed (college certificate or internal CA distributed to staff PCs)
- [ ] The first super admin uses a strong unique password; staff get individual accounts, no shared logins
- [ ] Demo data scripts (`seed_users`, `seed_data`) are **not** run on this server
- [ ] Cameras use a view-only account; the camera VLAN is not reachable from student networks
- [ ] Nightly backups run and are copied off the server; a restore has been tested once
- [ ] Ubuntu security updates enabled (`unattended-upgrades`)
- [ ] `ALLOWED_ORIGINS` and `FRONTEND_URL` contain only the real HTTPS address
- [ ] Monitoring (if enabled) stays on localhost or an administration network, with a unique `GRAFANA_ADMIN_PASSWORD`

## 11. Privacy and policy

ClassroomGuard processes video of students. Before going live, the college should:

- inform students and staff in writing that exam halls are monitored by AI-assisted CCTV,
  what is recorded, why, and for how long (Digital Personal Data Protection Act, 2023);
- set the evidence retention period under **System Settings** to the shortest period your
  examination rules require (it is enforced automatically every night);
- treat every alert as a **prompt for an invigilator to check**, never as proof on its own:
  the model can miss phones and can raise false alarms (accuracy figures in `ai/README.md`);
- restrict evidence access to the roles that need it.

## 12. Troubleshooting

The most common problems are below. The full list is in
[TROUBLESHOOTING.md](TROUBLESHOOTING.md).

| Symptom | Check |
|---|---|
| Browser certificate warning | Section 4: install the college certificate or trust the internal CA |
| `docker compose` says a variable is required | A required value is missing in `.env` (compare with `.env.example`) |
| API not healthy after install | `sudo docker compose logs backend` (database password mismatch after editing `.env` is the usual cause) |
| AI shows Offline | `sudo docker compose logs ai`; `nvidia-smi`; model files present in `ai/models/` |
| "Unknown camera" in AI logs | `backend_camera_id` in `ai/config.yaml` must equal the Camera ID in the web app |
| Camera snapshot unavailable | RTSP URL, camera credentials, firewall to port 554 |
| No reset emails | `SMTP_*` values in `.env`; `sudo docker compose logs backend \| grep -i smtp` |
| Evidence uploads fail | `sudo chown -R 1000:1000 storage` |
