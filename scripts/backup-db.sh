#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

pg_dump -h localhost -U classroomguard -d classroomguard -Fc -f "$BACKUP_DIR/classguard_${TIMESTAMP}.dump"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.dump" -mtime +7 -delete

echo "Backup saved: $BACKUP_DIR/classguard_${TIMESTAMP}.dump"
