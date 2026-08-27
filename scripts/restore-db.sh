#!/bin/bash
set -e

BACKUP_FILE=$1
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.dump>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File not found: $BACKUP_FILE"
  exit 1
fi

pg_restore -h localhost -U classroomguard -d classroomguard --clean --if-exists "$BACKUP_FILE"

echo "Restore complete from: $BACKUP_FILE"
