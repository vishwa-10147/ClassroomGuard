#!/usr/bin/env bash
# Restore a backup made by scripts/backup.sh. REPLACES the current database and evidence.
#
#   ./scripts/restore.sh backups/db_20261015_020000.dump [backups/storage_20261015_020000.tar.gz]
set -euo pipefail
cd "$(dirname "$0")/.."

DB_DUMP="${1:-}"
STORAGE_ARCHIVE="${2:-}"
[ -f "$DB_DUMP" ] || { echo "Usage: $0 <db_*.dump> [storage_*.tar.gz]"; exit 1; }

read -rp "This replaces the current data with $DB_DUMP. Type RESTORE to continue: " CONFIRM
[ "$CONFIRM" = "RESTORE" ] || { echo "Cancelled."; exit 1; }

echo "Stopping application services"
docker compose stop backend celery-worker celery-beat

echo "Restoring database"
docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < "$DB_DUMP"

if [ -n "$STORAGE_ARCHIVE" ]; then
  echo "Restoring evidence and recordings"
  rm -rf storage
  tar -xzf "$STORAGE_ARCHIVE"
  chown -R 1000:1000 storage 2>/dev/null || true
fi

echo "Starting application services"
docker compose start backend celery-worker celery-beat
echo "Restore complete."
