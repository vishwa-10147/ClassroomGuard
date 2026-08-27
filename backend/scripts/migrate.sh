#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# Run pending migrations
echo "Running pending migrations..."
alembic upgrade head

echo "Migrations complete."
