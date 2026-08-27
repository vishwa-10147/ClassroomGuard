@echo off
rem Starts the ClassroomGuard backend API (uvicorn) on port 8000.
rem Must run from the repo ROOT so the absolute `backend.app.*` imports resolve.
setlocal
cd /d "%~dp0\.."

if exist "backend\.venv\Scripts\python.exe" (
    backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
) else (
    echo ClassroomGuard backend venv not found.
    echo Run:  cd backend  ^&^&  python -m venv .venv
    echo then:  .venv\Scripts\python.exe -m pip install -r requirements-dev.txt
    echo.
    pause
)
