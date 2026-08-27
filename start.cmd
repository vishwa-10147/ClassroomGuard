@echo off
setlocal
title ClassroomGuard - Start
cd /d "%~dp0"

rem ===================================================================
rem  ClassroomGuard "Start" button
rem  Boots the backend API + frontend, then opens the web app in your
rem  browser. Double-click this file (or pin a shortcut to it).
rem
rem    Frontend (web app) -> http://localhost:3000
rem    Backend  (API)     -> http://localhost:8000
rem ===================================================================

set "BACKEND_PORT=8000"
set "FRONTEND_PORT=3000"
set "WAIT_MAX=90"
set "LOG_DIR=%~dp0logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo.
echo ============================================
echo   ClassroomGuard - Starting...
echo ============================================
echo.

rem ---- 1. Backend API ----
call :is_listening %BACKEND_PORT%
if "%errorlevel%"=="0" (
    echo [OK] Backend already running on port %BACKEND_PORT%.
) else (
    echo [..] Starting backend API on port %BACKEND_PORT%...
    start "ClassroomGuard - Backend API" /min cmd /k "call ""%~dp0scripts\start-backend.cmd"" > ""%LOG_DIR%\backend.log"" 2>&1"
    call :wait_port %BACKEND_PORT%
)

rem ---- 2. Frontend ----
call :is_listening %FRONTEND_PORT%
if "%errorlevel%"=="0" (
    echo [OK] Frontend already running on port %FRONTEND_PORT%.
) else (
    echo [..] Starting frontend on port %FRONTEND_PORT%...
    start "ClassroomGuard - Frontend" /min cmd /k "call ""%~dp0scripts\start-frontend.cmd"" > ""%LOG_DIR%\frontend.log"" 2>&1"
    call :wait_port %FRONTEND_PORT%
)

rem ---- 3. Open the web app ----
echo.
echo ============================================
echo   Opening the ClassroomGuard web app...
echo ============================================
start "" "http://localhost:%FRONTEND_PORT%"

echo.
echo   Running:
echo     - Web app     : http://localhost:%FRONTEND_PORT%
echo     - API docs    : http://localhost:%BACKEND_PORT%/docs
echo     - Frontend log: %LOG_DIR%\frontend.log
echo     - Backend log : %LOG_DIR%\backend.log
echo.
echo   To stop, close the two "ClassroomGuard" windows that opened.
echo   This window can be closed now.
echo.
pause
exit /b 0

rem ---- check if a port is already listening ----
:is_listening
set "P=%~1"
for /f "tokens=*" %%A in ('netstat -ano ^| findstr /R ":%P% .*LISTENING"') do (
    exit /b 0
)
exit /b 1

rem ---- wait until a port accepts connections (bounded) ----
:wait_port
set "P=%~1"
set /a C=0
:wait_loop
call :is_listening %P%
if "%errorlevel%"=="0" (
    echo [OK] Port %P% is ready.
    exit /b 0
)
set /a C+=1
if %C% geq %WAIT_MAX% (
    echo [WARN] Port %P% did not become ready in %WAIT_MAX%s.
    exit /b 1
)
>nul ping -n 2 127.0.0.1
goto :wait_loop
