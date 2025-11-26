@echo off
REM Script para truncar la base de datos SQLite de Julie Assistant
echo.
echo ========================================
echo   LIMPIANDO BASE DE DATOS
echo ========================================
echo.

set DB_PATH=%~dp0server\julie.db

if exist "%DB_PATH%" (
    del "%DB_PATH%"
    echo [OK] Base de datos eliminada: %DB_PATH%
    echo.
    echo La base de datos se recreara vacia cuando
    echo el servidor se inicie de nuevo.
    echo.
    echo Tablas que se limpiaran:
    echo   - medications (medicamentos)
    echo   - reminders (recordatorios)
    echo   - device_tokens (tokens FCM)
    echo   - tutor (informacion del tutor)
    echo   - users (usuarios)
    echo   - reminder_history (historial)
    echo.
) else (
    echo [INFO] No se encontro la base de datos: %DB_PATH%
    echo La base de datos se creara cuando el servidor inicie.
    echo.
)
