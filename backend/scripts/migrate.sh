#!/bin/bash
# Apply database migrations (stamps pre-migration databases first). Run from anywhere.
set -e
cd "$(dirname "$0")/../.."
python -m backend.scripts.migrate
