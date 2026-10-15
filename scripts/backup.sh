#!/usr/bin/env bash
# Back up the database and evidence files. Run nightly from cron:
#   0 2 * * * /opt/classroomguard/scripts/backup.sh >> /var/log/classroomguard-backup.log 2>&1
#
# BACKUP_DIR (default ./backups) and KEEP_DAYS (default 14) can be overridden. Copy the backup
# folder to another machine or network share - a backup on the same disk is not a backup.
set -euo pipefail
cd "$(dirname "$0")/.."

DEST="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
TS="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$DEST"

echo "[$(date)] Backing up database"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DEST/db_$TS.dump.tmp"
mv "$DEST/db_$TS.dump.tmp" "$DEST/db_$TS.dump"

echo "[$(date)] Backing up evidence and recordings"
# The AI keeps writing evidence while we read; GNU tar exits 1 for "file changed" - that is fine
tar --warning=no-file-changed -czf "$DEST/storage_$TS.tar.gz" storage || [ $? -eq 1 ]

find "$DEST" -name 'db_*.dump' -mtime +"$KEEP_DAYS" -delete
find "$DEST" -name 'storage_*.tar.gz' -mtime +"$KEEP_DAYS" -delete
echo "[$(date)] Backup complete: $DEST/db_$TS.dump, $DEST/storage_$TS.tar.gz"
