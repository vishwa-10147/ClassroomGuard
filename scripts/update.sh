#!/usr/bin/env bash
# Update to the latest release: back up, pull the code, rebuild and restart.
# Database migrations run automatically when the API container starts.
#
#   sudo ./scripts/update.sh            # latest main
#   sudo ./scripts/update.sh v1.2.0     # a specific tag
set -euo pipefail
cd "$(dirname "$0")/.."

REF="${1:-main}"

echo "==> Backing up before the update"
./scripts/backup.sh

echo "==> Fetching $REF"
git fetch --tags origin
git checkout "$REF"
[ "$REF" = "main" ] && git pull --ff-only origin main

echo "==> Rebuilding and restarting"
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null

echo "==> Status"
docker compose ps
