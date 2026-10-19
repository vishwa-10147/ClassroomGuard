# API reference

The ClassroomGuard API is a JSON REST API under `/api/v1`, plus a WebSocket at `/ws` for live
updates. In production it is reached through the web server on the same origin as the web app
(`https://<server>/api/v1/...`). The API port itself is bound to `127.0.0.1` on the server.

When `APP_ENV` is `development` or `test`, interactive documentation is served by the API at
`/docs` and the OpenAPI schema at `/openapi.json`. Both are disabled in staging and production.

## Conventions

| Topic | Convention |
|---|---|
| Format | JSON request and response bodies. Many responses use camelCase field names; request bodies accept camelCase or snake_case where noted in the OpenAPI schema |
| Identifiers | String IDs (UUIDs, or codes such as `cam-001` for seeded cameras) |
| Pagination | List endpoints take `page` (from 1) and `page_size` (default 50, maximum 200). Paginated responses contain `data`, `total`, `page`, `pageSize` and `totalPages` |
| Errors | Standard HTTP status codes with `{"detail": "..."}`. `401` missing or invalid credentials, `403` missing permission, `404` not found, `409` conflict, `422` validation error, `429` rate limited |
| Rate limits | 60 requests per minute per user by default; sign-in, forgot-password and reset-password 5 per minute per client |
| Time | ISO 8601 timestamps in UTC |

## Authentication

### Staff users

```http
POST /api/v1/auth/login
Content-Type: application/json

{"email": "<email>", "password": "<password>"}
```

The response contains `access_token`, `refresh_token`, `token_type` (`bearer`), `expires_in`
(seconds, from `ACCESS_TOKEN_EXPIRE_MINUTES`) and the `user`. Send the access token on every
request:

```http
Authorization: Bearer <access_token>
```

Before the access token expires, exchange the refresh token for a new pair with
`POST /api/v1/auth/refresh` (`{"refresh_token": "..."}`). Refresh tokens rotate: each one can be
used once and is revoked on `POST /api/v1/auth/logout`. Refresh tokens expire after
`refresh_token_expire_days` (7 by default) and stop working when the user is disabled.

Accounts are created by administrators (`POST /api/v1/users`). `POST /api/v1/auth/register`
returns `403` unless `ALLOW_SELF_REGISTRATION=true`.

### Password reset

1. `POST /api/v1/auth/forgot-password` with `{"email": "..."}` always returns the same neutral
   message and, if the account exists and SMTP is configured, emails a single-use link.
2. `POST /api/v1/auth/reset-password` with the token from the link and `new_password`
   (8–128 characters).

### AI engine

AI engines authenticate with the shared secret from `AI_SERVICE_TOKEN`:

```http
X-Service-Token: <AI_SERVICE_TOKEN>
```

The service token is accepted only on the routes marked "or AI service token" below. An empty
`AI_SERVICE_TOKEN` disables service-token authentication.

## Authorisation

Each route requires a named permission. Roles map to permissions in
`backend/app/core/permissions.py`:

| Role | Permissions |
|---|---|
| `super_admin` | All permissions |
| `admin` | Users (read, write), organisations (read, manage), cameras and classrooms (read, write), alerts (read, write, manage), incidents (read, write), recordings (read, write, delete), events, reports (read, write), search, settings (read), audit log (read), webhooks (view, manage) |
| `security` | Cameras, classrooms, alerts (read, write, manage), incidents (read, write), recordings (read, write), events, reports, search (read), webhooks (view) |
| `faculty` | Cameras, classrooms, alerts (read, manage), incidents, recordings, events, reports, search (read), webhooks (view) |
| `viewer` | Cameras, classrooms, alerts, incidents, events, reports, search (read), webhooks (view) |

Custom roles can be created on the Roles page (`roles:write`). Data is scoped to the signed-in
user's organisation.

## AI ingestion

### Detection event

```http
POST /api/v1/events
X-Service-Token: <AI_SERVICE_TOKEN>
Content-Type: application/json

{
  "eventType": "PHONE_USAGE",
  "severity": "high",
  "cameraId": "306B-CAM1",
  "trackerId": 14,
  "confidence": 0.82,
  "metadata": {"message": "Phone in hand", "evidence_path": "<path to the evidence frame>"}
}
```

This is the shape the AI engine sends (`ai/src/alert_system.py`). `classroomId`, `seatId`,
`boundingBox` (`{"x", "y", "w", "h"}` in pixels) and `recordingId` are optional. `seatId` is
filled in when the detection falls in a seat zone drawn on the camera. `cameraId` is the camera's ID or its Camera ID code. The classroom is taken from the camera when
`classroomId` is omitted. The API stores the event and broadcasts a `detection` message. For
severities `critical`, `high` and `medium` it also creates an alert, broadcasts an `alert`
message, sends push notifications and triggers `alert.created` webhooks.

Events with a `recordingId` come from analysing an uploaded recording: they are stored, linked to
the recording and counted on it, but raise no alert and no live `detection` message, because
nothing is happening in the room now. `metadata.video_time_s` gives the position in the video.

### Recording analysis jobs

`recording_worker.py` processes uploaded recordings through these service-token endpoints:

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/recordings/claim` | Hands out the oldest queued recording and marks it `processing`: `{id, name, filename, cameraId, cameraCode, zones}`. `204` when nothing is queued |
| GET | `/api/v1/recordings/{id}/source` | The video file, for workers that do not share the storage folder |
| POST | `/api/v1/recordings/{id}/progress` | `{currentFrame, totalFrames, duration, phase, detectionCount}`. Answers `{"cancelled": true}` once staff cancel the job |
| POST | `/api/v1/recordings/{id}/complete` | `{state: "completed" \| "failed", detectionCount, errorMessage}` |

Progress is broadcast to the web app as `recording` WebSocket messages.

### Heartbeat

```http
POST /api/v1/ai/heartbeat
X-Service-Token: <AI_SERVICE_TOKEN>

{"engine": "ai-block-b", "cameras": 2, "fps": 18.5,
 "camera_status": [{"id": "306B-CAM1", "online": true, "fps": 10}]}
```

Sent every 30 seconds. It updates each listed camera's status and frame rate. Engines that
reported recently are listed by the public `GET /api/v1/status` under `aiEngines`.

## WebSocket

Connect to `wss://<server>/ws?token=<access_token>`. The connection is closed with code `1008`
when the token is invalid, the user is inactive, or the `Origin` header is not in
`ALLOWED_ORIGINS`.

| Direction | Message |
|---|---|
| Server → client | `{"type": "alert", "payload": {...}}` when an alert is created |
| Server → client | `{"type": "detection", "payload": {...}}` for every detection event from a live camera |
| Server → client | `{"type": "recording", "payload": {"id", "status", "progress", "phase", "detectionCount", "eventCount"}}` while an uploaded recording is analysed |
| Client → server | `{"type": "ping", "timestamp": <n>}`, answered with `{"type": "pong", ...}` |
| Client → server | `{"type": "subscribe", "channel": "alerts"}`, answered with `{"type": "subscribed", ...}` |

Messages are delivered only to connections of the same organisation.

## Health and monitoring

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness; the process is running |
| `GET /health/ready` | Readiness; `200` when PostgreSQL and Redis respond, otherwise `503` |
| `GET /health/detailed` | Component details |
| `GET /healthz` (web server) | Proxies `/health/ready`, for load balancers |
| `GET /metrics` | Prometheus metrics; reachable only inside the Docker network |

## Endpoint reference

Generated from the application's route table for v1.0.1 (107 routes plus `/`). "Access"
is the permission the caller needs.

### Authentication

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/auth/register` | Public; disabled unless `ALLOW_SELF_REGISTRATION=true` |
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/refresh` | Public |
| POST | `/api/v1/auth/logout` | Signed-in user |
| GET | `/api/v1/auth/me` | Signed-in user |
| POST | `/api/v1/auth/forgot-password` | Public |
| POST | `/api/v1/auth/reset-password` | Public |

### Users

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/users` | `users:read` |
| GET | `/api/v1/users/{user_id}` | `users:read` |
| POST | `/api/v1/users` | `users:write` |
| PATCH | `/api/v1/users/{user_id}` | `users:write` |
| PUT | `/api/v1/users/{user_id}` | `users:write` |
| POST | `/api/v1/users/{user_id}/disable` | `users:write` |
| DELETE | `/api/v1/users/{user_id}` | `users:delete` |

### Roles and permissions

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/roles` | `roles:read` |
| GET | `/api/v1/roles/permissions` | `roles:read` |
| GET | `/api/v1/roles/{role_id}` | `roles:read` |
| POST | `/api/v1/roles` | `roles:write` |
| PATCH | `/api/v1/roles/{role_id}` | `roles:write` |
| DELETE | `/api/v1/roles/{role_id}` | `roles:delete` |

### Organisations

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/organizations` | `organizations:create` |
| GET | `/api/v1/organizations/{org_id}` | `organizations:read` |
| PATCH | `/api/v1/organizations/{org_id}` | `organizations:manage` |
| GET | `/api/v1/organizations/{org_id}/stats` | `organizations:read` |
| POST | `/api/v1/organizations/{org_id}/invite` | `organizations:manage` |

### Classrooms

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/classrooms` | `classrooms:read` |
| GET | `/api/v1/classrooms/{classroom_id}` | `classrooms:read` |
| POST | `/api/v1/classrooms` | `classrooms:write` |
| PATCH | `/api/v1/classrooms/{classroom_id}` | `classrooms:write` |
| GET | `/api/v1/classrooms/{classroom_id}/layout` | `classrooms:read` |
| DELETE | `/api/v1/classrooms/{classroom_id}` | `classrooms:delete` |

### Cameras

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/cameras` | `cameras:read` |
| GET | `/api/v1/cameras/{camera_id}` | `cameras:read` or AI service token (which may also use the Camera ID code) |
| POST | `/api/v1/cameras` | `cameras:write` |
| PATCH | `/api/v1/cameras/{camera_id}` | `cameras:write`. Accepts `zones` (see below) |
| POST | `/api/v1/cameras/{camera_id}/test` | `cameras:write` |
| GET | `/api/v1/cameras/{camera_id}/stream` | `cameras:read` |
| GET | `/api/v1/cameras/{camera_id}/snapshot` | `cameras:read` |
| DELETE | `/api/v1/cameras/{camera_id}` | `cameras:delete` |

Camera `zones` are rectangles on the camera view in 0-1 fractions of the image:
`{"id", "type": "seat" | "ignore", "label", "x", "y", "w", "h"}`. Seat labels must be unique on a
camera. Detections in a seat zone carry its label as `seatId`; people and objects in an ignore zone
(the invigilator's desk, an aisle) are never flagged.

### Detection events

`GET /api/v1/events` filters: `classroom_id`, `camera_id`, `type`, `severity`, `since`,
`recording_id`, `source=live|recording`, and `q` (searches type, seat, camera and room).

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/events` | `alerts:write` or AI service token |
| GET | `/api/v1/events` | `events:read` |
| GET | `/api/v1/events/recent` | `events:read` |
| GET | `/api/v1/events/{event_id}` | `events:read` |

### Alerts

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/alerts` | `alerts:write` or AI service token |
| GET | `/api/v1/alerts` | `alerts:read` |
| GET | `/api/v1/alerts/count` | `alerts:read` |
| GET | `/api/v1/alerts/{alert_id}` | `alerts:read` |
| POST | `/api/v1/alerts/{alert_id}/acknowledge` | `alerts:manage` |
| POST | `/api/v1/alerts/{alert_id}/resolve` | `alerts:manage` |
| POST | `/api/v1/alerts/{alert_id}/assign` | `alerts:manage` |

### Dashboard

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/dashboard/stats` | `alerts:read` |

Counts for the caller's organisation, used by the mobile Dashboard tab:

```json
{
  "total_cameras": 4,
  "active_cameras": 3,
  "total_classrooms": 2,
  "active_alerts": 5,
  "total_alerts_today": 12
}
```

`active_cameras` counts cameras whose status is `online`. `total_alerts_today` counts alerts
created since 00:00 UTC.

### Incidents

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/incidents` | `incidents:read`. Filters: `status`, `severity`, `classroom_id`, `q` |
| GET | `/api/v1/incidents/assignees` | `incidents:write`. Staff an incident can be assigned to |
| GET | `/api/v1/incidents/{incident_id}` | `incidents:read` |
| POST | `/api/v1/incidents` | `incidents:write`. With `alertId`, the alert's room, camera and detection are attached |
| PATCH | `/api/v1/incidents/{incident_id}` | `incidents:write`. `title`, `description`, `severity`, `status`, `assignedTo` |
| POST | `/api/v1/incidents/{incident_id}/notes` | `incidents:write`. `{"text"}`; author and time come from the session |
| DELETE | `/api/v1/incidents/{incident_id}` | `incidents:write` |

Incidents, recordings and their files are only visible to the organisation they belong to.

### Evidence

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/evidence/frames` | `recordings:read` |
| GET | `/api/v1/evidence/alerts` | `recordings:read` |
| GET | `/api/v1/evidence/frames/{filename}` | `recordings:read` |

### Recordings

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/recordings` | `recordings:read` |
| POST | `/api/v1/recordings` | `recordings:write`. Multipart: `file` (MP4, AVI, MOV, MKV, up to 500 MB), `cameraId`, optional `name`, `analyze` (default true) |
| GET | `/api/v1/recordings/{recording_id}` | `recordings:read` |
| GET | `/api/v1/recordings/{recording_id}/file` | `recordings:read`. Plays with Range requests; `?download=true` downloads; accepts `?token=` |
| POST | `/api/v1/recordings/{recording_id}/process` | `recordings:write`. Queues (or re-queues) analysis |
| POST | `/api/v1/recordings/{recording_id}/cancel` | `recordings:write` |
| DELETE | `/api/v1/recordings/{recording_id}` | `recordings:delete`. Also deletes the file and its detections |

### Uploads

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/uploads/video` | `recordings:write`. Stores a file without creating a recording; the web app uses `POST /api/v1/recordings` |
| GET | `/api/v1/uploads/video/{filename}` | `recordings:read`, own organisation's recordings only |
| GET | `/api/v1/uploads/{filename}` | `recordings:read`, own organisation's recordings only |

### Reports

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/reports/generate` | `reports:read` |
| GET | `/api/v1/reports/export/csv` | `reports:read` |
| GET | `/api/v1/reports/export/json` | `reports:read` |

### Search

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/search` | `search:read` |

### Push notifications

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/notifications/register` | Signed-in user |
| GET | `/api/v1/notifications/tokens` | Signed-in user |
| DELETE | `/api/v1/notifications/tokens/{token_id}` | Signed-in user |

### Webhooks

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/webhooks` | `webhooks:manage` |
| GET | `/api/v1/webhooks` | `webhooks:view` |
| GET | `/api/v1/webhooks/count` | `webhooks:view` |
| GET | `/api/v1/webhooks/{webhook_id}` | `webhooks:view` |
| PUT | `/api/v1/webhooks/{webhook_id}` | `webhooks:manage` |
| DELETE | `/api/v1/webhooks/{webhook_id}` | `webhooks:manage` |
| POST | `/api/v1/webhooks/{webhook_id}/test` | `webhooks:manage` |
| GET | `/api/v1/webhooks/{webhook_id}/deliveries` | `webhooks:view` |

### System settings

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/settings` | `settings:read` |
| GET | `/api/v1/settings/{key}` | `settings:read` |
| PUT | `/api/v1/settings` | `settings:write` |

### System

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/system/health` | `settings:read` |

### Audit log

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/audit-logs` | `audit_logs:read` |
| GET | `/api/v1/audit-logs/count` | `audit_logs:read` |
| POST | `/api/v1/audit-logs` | `audit_logs:write` |

### Compliance

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/compliance/data-request` | `audit_logs:read` |
| GET | `/api/v1/compliance/data-request/{request_id}/status` | `audit_logs:read` |
| POST | `/api/v1/compliance/consent` | Signed-in user |
| GET | `/api/v1/compliance/consent` | `audit_logs:read` |
| DELETE | `/api/v1/compliance/user-data/{user_id}` | `users:delete` |
| GET | `/api/v1/compliance/audit-trail` | `audit_logs:read` |
| GET | `/api/v1/compliance/data-summary/{org_id}` | `settings:read` |
| GET | `/api/v1/compliance/retention-policies` | `settings:read` |
| PUT | `/api/v1/compliance/retention-policies/{policy_id}` | `settings:write` |
| GET | `/api/v1/compliance/retention-check` | `settings:read` |
| POST | `/api/v1/compliance/retention-enforce` | `settings:write` |

### AI engine

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/ai/heartbeat` | `alerts:write` or AI service token |

### Status

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/status` | Public |

### WebSocket

| Method | Path | Access |
|---|---|---|
| WS | `/ws` | Access token in `?token=` |
| POST | `/api/v1/ws/broadcast` | `alerts:write` or AI service token |

### Health

| Method | Path | Access |
|---|---|---|
| GET | `/health` | Public |
| GET | `/health/ready` | Public |
| GET | `/health/detailed` | Public |

