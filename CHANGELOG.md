# Changelog

All notable changes to ClassroomGuard are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-16

First production release, intended for a supervised pilot in college exam halls.

### Added

- **Exam-hall detector:** YOLO26s fine-tuned for mobile phones and calculators, with per-class
  thresholds chosen on validation data and evaluation on held-out and unseen CCTV footage.
- **Cheating rules:** each object is assigned to a tracked person, with in-hand (HIGH) and
  at-desk (MEDIUM) severity, time-based confirmation, a 2-minute de-duplication window and a
  switchable calculator rule.
- **Real-time alerts:** detections create alerts that appear at once in the web app over
  WebSocket, with mobile push notifications and webhooks (Slack, Microsoft Teams, custom).
- **Status reporting:** AI engine heartbeats with per-camera status and frame rate. Cameras are
  marked offline automatically.
- **Web app on live data:** dashboard, live monitoring, classrooms, cameras, detection events
  with evidence frames, alerts, incidents, reports (CSV and PDF), users, roles, audit log and
  system settings.
- **On-premise deployment:** one-command installer, HTTPS through Caddy (internal CA, college
  certificate or Let's Encrypt), backup, restore and update scripts.
- **AWS deployment:** EC2, RDS, ElastiCache, ECR and ALB, with a GitHub Actions deploy workflow.
- **Accounts:** email password reset with single-use links; rotating refresh tokens.
- **Compliance:** nightly evidence retention, consent records, personal-data export and erasure
  endpoints.
- **Real-time scaling:** WebSocket broadcasts over Redis pub/sub, scoped to the organisation.
- **Tooling:** ESLint for the web app; Node.js 22 and Python 3.12 pinned in `.nvmrc` and
  `.python-version`.
- **Tests:** backend API (122), AI rules (11), web unit (4) and Playwright end-to-end (7),
  including a live AI-detection test.
- **Documentation:** README, setup guide, architecture, configuration, API reference,
  deployment guides, troubleshooting, contributing and security policy.

### Security

- Public sign-up disabled by default (`ALLOW_SELF_REGISTRATION`).
- Removed a two-factor stub that accepted a fixed code.
- Push-token registration requires a signed-in user.
- Redis requires a password. Grafana requires an admin password.
- Production and staging refuse weak `JWT_SECRET` and `AI_SERVICE_TOKEN` values and localhost
  origins.
- WebSocket connections require an active user and an allowed `Origin`.
- CORS no longer allows credentials, and allowed headers are explicit.
- Upload file names are checked for path traversal, and invalid byte ranges return `416`.
- Webhook URLs to private, loopback and link-local networks are rejected.
- Refresh tokens stop working for disabled users.

### Changed

- `/healthz` and the backend container health check use the readiness endpoint, which returns
  `503` when PostgreSQL or Redis is unavailable.
- Token lifetimes follow `ACCESS_TOKEN_EXPIRE_MINUTES` and `refresh_token_expire_days`.
- CI runs on Python 3.12 and Node.js 22, matching the container images.

### Known limitations

See [README → Known limitations](README.md#known-limitations).

[1.0.0]: https://github.com/vishwa-10147/ClassroomGuard/releases/tag/v1.0.0
