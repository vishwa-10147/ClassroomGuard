#!/bin/sh
# Records the product walkthrough video: demo/output/ClassroomGuard-demo.mp4
#
# Needs: PostgreSQL reachable as DEMO_DATABASE_URL's server (a separate demo database is
# dropped and recreated), Python with backend/requirements.txt, Node with `npm ci` done,
# Playwright's Chromium (or PW_CHROMIUM=/path/to/chrome) and ffmpeg with libx264.
#
#   sh demo/run.sh                 # full speed (about 4 minutes of video)
#   DEMO_PACE=0.3 sh demo/run.sh   # quick dry run
set -eu
cd "$(dirname "$0")/.."

PYTHON=${PYTHON:-python3}
OUT=demo/output
DB_ADMIN_URL=${DEMO_DB_ADMIN_URL:-postgresql://classroomguard:classroomguard_dev@localhost:5432/postgres}
export DATABASE_URL=${DEMO_DATABASE_URL:-postgresql+asyncpg://classroomguard:classroomguard_dev@localhost:5432/classroomguard_demo}
export JWT_SECRET=demo-only-secret-0123456789abcdef0123456789
export AI_SERVICE_TOKEN=demo-ai-service-token-0123456789abcdef
export USE_REDIS=false RATE_LIMIT_ENABLED=false APP_ENV=development
export STORAGE_PATH="$PWD/$OUT/storage"
export DEMO_STORAGE="$STORAGE_PATH"

rm -rf "$OUT"
mkdir -p "$STORAGE_PATH"

echo "== fresh demo database"
psql "$DB_ADMIN_URL" -q -c "DROP DATABASE IF EXISTS classroomguard_demo WITH (FORCE)" -c "CREATE DATABASE classroomguard_demo"
$PYTHON -m backend.scripts.migrate > /dev/null
$PYTHON -m backend.seed_users > /dev/null
$PYTHON demo/seed_demo.py

echo "== starting API and web app"
$PYTHON -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 > "$OUT/api.log" 2>&1 &
API_PID=$!
npx vite --port 3000 --strictPort > "$OUT/web.log" 2>&1 &
WEB_PID=$!
trap 'kill $API_PID $WEB_PID 2>/dev/null || true' EXIT
for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:8000/health && break; sleep 1; done
for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3000 && break; sleep 1; done

echo "== recording"
node demo/record-demo.mjs

echo "== encoding MP4"
ffmpeg -y -loglevel error -i "$OUT/ClassroomGuard-demo.webm" -c:v libx264 -preset slow -crf 22 \
  -pix_fmt yuv420p -movflags +faststart "$OUT/ClassroomGuard-demo.mp4"
ls -lh "$OUT/ClassroomGuard-demo.mp4"
