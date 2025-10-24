@echo off
REM Script para truncar la base de datos SQLite de Julie Assistant
set DB_PATH=%~dp0server\julie.db

if exist "%DB_PATH%" (
    del "%DB_PATH%"
    echo [OK] Base de datos eliminada: %DB_PATH%
) else (
    echo [INFO] No se encontro la base de datos: %DB_PATH%
)
