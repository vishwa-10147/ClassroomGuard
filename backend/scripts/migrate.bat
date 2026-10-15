@echo off
rem Apply database migrations (stamps pre-migration databases first).
cd /d "%~dp0\..\.."
python -m backend.scripts.migrate
