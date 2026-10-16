# Security policy

ClassroomGuard processes video of students and holds staff accounts, so security reports are
taken seriously.

## Supported versions

| Version | Supported |
|---|---|
| 1.0.x | Yes |
| Earlier development snapshots | No |

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Report it privately through GitHub's
[private vulnerability reporting](https://github.com/vishwa-10147/ClassroomGuard/security/advisories/new)
on this repository. Include:

- the affected version or commit;
- steps to reproduce, or a proof of concept;
- the impact you expect (for example data exposure or privilege escalation).

Never include real student images, personal data, passwords or tokens in a report. Use test data
instead.

You can expect an acknowledgement within 7 days. After a fix is released, the issue will be
disclosed in the [changelog](CHANGELOG.md), with credit if you would like it.

## Security model in brief

| Area | Protection |
|---|---|
| Transport | HTTPS (Caddy on-premise, ALB on AWS); only ports 80 and 443 exposed |
| Authentication | bcrypt password hashes; short-lived JWT access tokens; rotating refresh tokens stored hashed; rate-limited sign-in and password reset |
| Authorisation | Named permissions on every protected route; role mapping in `backend/app/core/permissions.py`; data scoped to the user's organisation |
| AI engine | Separate service token (`X-Service-Token`), accepted only on ingestion routes |
| Configuration | The API refuses to start in production with weak secrets, debug mode or localhost origins |
| Containers | Non-root users; the API, database, Redis and metrics are not published outside the Docker network |
| Data | Evidence deleted automatically after the configured retention period |

Details: [docs/ARCHITECTURE.md → Security model](docs/ARCHITECTURE.md#security-model).

## Hardening a deployment

Follow the checklists in [docs/DEPLOY_ONPREM.md → Security checklist](docs/DEPLOY_ONPREM.md#10-security-checklist)
and [README → Production hardening checklist](README.md#production-hardening-checklist). In short:

- keep `.env` private (`chmod 600`), never commit it, and rotate any secret that may have leaked;
- install a trusted certificate;
- give every staff member their own account with the least role they need;
- never run the demo seed scripts on a production server;
- keep cameras on a separate network with view-only accounts;
- back up nightly, copy the backups off the server, and test a restore.
