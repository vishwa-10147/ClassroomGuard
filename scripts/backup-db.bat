@echo off
setlocal

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set TIMESTAMP=%dt:~0,8%_%dt:~8,6%
set BACKUP_DIR=backups

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -h localhost -U classroomguard -d classroomguard -Fc -f "%BACKUP_DIR%\classguard_%TIMESTAMP%.dump"

echo Backup saved: %BACKUP_DIR%\classguard_%TIMESTAMP%.dump
