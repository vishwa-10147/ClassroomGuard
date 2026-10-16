# Troubleshooting

Run the commands below from the installation folder (`/opt/classroomguard` by default). Start
with the service status and logs:

```bash
sudo docker compose ps                     # every service should be Up / healthy
sudo docker compose logs --tail 100 backend
```

## Installation and start-up

| Symptom | Cause and fix |
|---|---|
| `docker compose` reports `required variable ... is missing a value` | A required setting is missing from `.env`. Compare with `.env.example`; re-running `sudo ./scripts/install.sh` adds missing secrets without changing existing ones |
| `redis` keeps restarting; its log says `set REDIS_PASSWORD in .env` | Add `REDIS_PASSWORD` (`openssl rand -hex 24`), or run `sudo ./scripts/update.sh`, which adds it |
| `grafana` keeps restarting; its log says `set GRAFANA_ADMIN_PASSWORD in .env` | Add `GRAFANA_ADMIN_PASSWORD`, or remove `monitoring` from `COMPOSE_PROFILES` |
| Backend exits with `JWT_SECRET must be set ...`, `AI_SERVICE_TOKEN must be set ...` or `ALLOWED_ORIGINS must contain explicit non-local origins` | Production and staging require strong secrets (32+ characters) and real HTTPS origins. Fix the value in `.env`, then `sudo docker compose up -d` |
| Backend unhealthy after editing `.env` | The database password in `.env` no longer matches the one the database was created with. Restore the original `POSTGRES_PASSWORD` |
| `/healthz` or `/health/ready` returns `503` | PostgreSQL or Redis is down or unreachable. Check `sudo docker compose ps` and the `postgres` and `redis` logs |
| Installer says the AI model is missing | Copy `exam_detector.pt` and `yolov8m-pose.pt` into `ai/models/`, then re-run the installer |
| `ports are not available` on 80 or 443 | Another web server is running. Stop it, or move ClassroomGuard to a dedicated server |

## Access and sign-in

| Symptom | Cause and fix |
|---|---|
| Browser certificate warning | Install the college certificate or trust the internal CA ([SETUP.md §3.1](../SETUP.md#31-https-certificate)) |
| Sign-in is refused with HTTP 429 (rate limited) | Five attempts per minute per client. Wait one minute |
| Live updates do not arrive (alerts need a reload) | The page address must be listed in `ALLOWED_ORIGINS` exactly (scheme, host and port), because the WebSocket checks the `Origin` header. Also check that any proxy in front forwards WebSocket upgrades on `/ws` |
| No password-reset email | Check `SMTP_*` in `.env` and `sudo docker compose logs backend | grep -i smtp`. With `SMTP_HOST` empty, no email is sent |

## Cameras and the AI engine

| Symptom | Cause and fix |
|---|---|
| Header shows **AI Offline** | `sudo docker compose logs ai`; `nvidia-smi` must list the GPU; the model files must be in `ai/models/` |
| AI log says the camera is unknown, or the camera stays offline | `backend_camera_id` in `ai/config.yaml` must equal the Camera ID in the web app exactly |
| Camera shows offline although the AI engine is running | The engine reports every 30 s and cameras go offline after 120 s without a report. Check the RTSP URL, camera credentials and the firewall to port 554 |
| Live view says "Add its stream URL" | Enter the camera's RTSP URL on the Cameras page. The AI engine works without it |
| Low frame rate | One RTX 4070-class GPU handles about four cameras. Reduce cameras per engine or add an AI machine ([DEPLOY_ONPREM.md §9](DEPLOY_ONPREM.md#9-operations)) |
| AI engine on a second machine cannot reach the server | `BACKEND_URL` must be the server's HTTPS address; with the internal CA set `REQUESTS_CA_BUNDLE` to its root certificate |
| Evidence images missing on a second AI machine | That machine's `./storage` must be the main server's `storage/` share |

## Evidence, recordings and integrations

| Symptom | Cause and fix |
|---|---|
| Evidence uploads fail with permission errors | `sudo chown -R 1000:1000 storage` (containers run as uid 1000) |
| Uploaded recordings are not analysed | Offline analysis is not connected in v1.0.0; the AI engine analyses live streams |
| Webhook save or delivery fails with "private or reserved network" | Webhooks must point to a public address (Slack, Teams or a public HTTPS endpoint); internal addresses are blocked |

## Development

| Symptom | Cause and fix |
|---|---|
| `npm ci` warns about the engine version | Use Node.js 22 (`nvm use` reads `.nvmrc`) |
| Backend tests fail with `401`/`429` on login | Start the API with `RATE_LIMIT_ENABLED=false` and seed the demo accounts (`python -m backend.seed_users`, `python -m backend.seed_data`) |
| `ModuleNotFoundError: No module named 'backend'` | Run the API and scripts from the repository root; run backend tests from `backend/` (see `backend/pytest.ini`) |
| End-to-end tests fail on the first run only | The Vite dev server compiles pages on first request. Re-run, or point `PLAYWRIGHT_BASE_URL` at a built stack |
| Port 3000 or 8000 already in use | Start Vite with `--port <n>` and the API with `--port <n>`, set `VITE_API_PROXY_TARGET`, and add the web origin to `ALLOWED_ORIGINS` |

Still stuck? Collect `sudo docker compose ps` and the relevant logs, remove any secrets, and open
an issue on the repository.
