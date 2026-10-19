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

echo "==> Adding any new required settings to .env"
add_secret() {  # add_secret KEY BYTES - only when .env does not have the key yet
  if ! grep -q "^$1=" .env; then echo "$1=$(openssl rand -hex "$2")" >> .env; echo "    added $1"; fi
}
add_secret REDIS_PASSWORD 24
add_secret GRAFANA_ADMIN_PASSWORD 16
chmod 600 .env

echo "==> Rebuilding and restarting"
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null

echo "==> Status"
docker compose ps
