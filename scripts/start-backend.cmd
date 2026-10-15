@echo off
rem Starts the ClassroomGuard API (uvicorn, auto-reload) on port 8000 for local development.
rem Needs PostgreSQL + Redis:  docker compose up -d postgres redis
rem Runs from the repo ROOT so the absolute `backend.app.*` imports resolve.
setlocal
cd /d "%~dp0\.."

if not exist "backend\.venv\Scripts\python.exe" (
    echo Creating backend virtual environment ^(first run only^)...
    py -3.12 -m venv backend\.venv || goto :fail
    backend\.venv\Scripts\python.exe -m pip install --quiet -r backend\requirements-dev.txt || goto :fail
)

if not defined APP_ENV set "APP_ENV=development"
if not defined DATABASE_URL set "DATABASE_URL=postgresql+asyncpg://classroomguard:classroomguard_dev@localhost:5432/classroomguard"

backend\.venv\Scripts\python.exe -m backend.scripts.migrate || goto :fail
backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
goto :eof

:fail
echo.
echo Backend failed to start. Is PostgreSQL running?  docker compose up -d postgres redis
pause
exit /b 1
