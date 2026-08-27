@echo off
cd /d "%~dp0\.."

echo Running pending migrations...
alembic upgrade head

echo Migrations complete.
