@echo off
rem Starts the ClassroomGuard frontend (Vite dev server) on port 3000.
setlocal
cd /d "%~dp0\.."
if exist "node_modules" (
    call npm run dev
) else (
    echo ClassroomGuard frontend dependencies not installed.
    echo Run:  npm install
    echo.
    pause
)
