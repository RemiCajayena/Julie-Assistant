@echo off
REM Script mejorado para gestionar Julie Assistant
REM Incluye opciones: limpiar datos, reinstalar, ver logs

SET ADB_PATH=C:\Users\pc\AppData\Local\Android\Sdk\platform-tools\adb.exe
SET PACKAGE_NAME=com.julieassistant
SET DEVICE_ID=

:MENU
cls
echo.
echo ========================================
echo   JULIE ASSISTANT - MENU PRINCIPAL
echo ========================================
echo.

REM Mostrar dispositivos conectados
echo Dispositivos conectados:
%ADB_PATH% devices -l | findstr /V "List of devices"
echo.

echo Selecciona una opcion:
echo.
echo [1] Limpiar datos (Reset completo - Vuelve a PIN setup)
echo [2] Reinstalar app (Necesario para nuevos permisos)
echo [3] Solo recargar (Sin perder datos)
echo [4] Ver logs en tiempo real
echo [5] Forzar cierre de la app
echo [6] Cambiar dispositivo
echo [7] Salir
echo.

choice /C 1234567 /N /M "Opcion (1-7): "

IF ERRORLEVEL 7 GOTO END
IF ERRORLEVEL 6 GOTO SELECT_DEVICE
IF ERRORLEVEL 5 GOTO FORCE_STOP
IF ERRORLEVEL 4 GOTO LOGS
IF ERRORLEVEL 3 GOTO RELOAD
IF ERRORLEVEL 2 GOTO REINSTALL
IF ERRORLEVEL 1 GOTO CLEAR

:SELECT_DEVICE
cls
echo.
echo ========================================
echo   SELECCIONAR DISPOSITIVO
echo ========================================
echo.
echo Dispositivos disponibles:
echo.
%ADB_PATH% devices -l
echo.
echo Ingresa el ID del dispositivo a usar
echo (copia el ID exacto de la lista anterior)
echo Ejemplos: emulator-5554, RF8N70XXXXX
echo.
echo Deja en blanco para usar el unico dispositivo (si solo hay uno)
echo.
set /p DEVICE_ID="ID del dispositivo: "
echo.
IF DEFINED DEVICE_ID (
    echo [OK] Usando dispositivo: %DEVICE_ID%
) ELSE (
    echo [INFO] Se usara el dispositivo predeterminado
)
echo.
pause
GOTO MENU

:CLEAR
echo.
echo ========================================
echo   LIMPIANDO DATOS DE LA APP
echo ========================================
echo.
REM Truncar base de datos antes de limpiar datos
call truncate-db.bat
IF DEFINED DEVICE_ID (
    %ADB_PATH% -s %DEVICE_ID% shell pm clear %PACKAGE_NAME%
) ELSE (
    %ADB_PATH% shell pm clear %PACKAGE_NAME%
)
IF %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Datos limpiados exitosamente!
    echo.
    echo La app volvera al setup inicial (PIN setup)
    echo Presiona cualquier tecla para volver al menu...
) ELSE (
    echo.
    echo [ERROR] No se pudo limpiar los datos.
    echo Verifica que el dispositivo este conectado.
    echo.
    pause
)
pause > nul
GOTO MENU

:REINSTALL
echo.
echo ========================================
echo   REINSTALANDO APP
echo ========================================
echo.
echo [1/2] Desinstalando app actual...
IF DEFINED DEVICE_ID (
    %ADB_PATH% -s %DEVICE_ID% uninstall %PACKAGE_NAME%
) ELSE (
    %ADB_PATH% uninstall %PACKAGE_NAME%
)
IF %ERRORLEVEL% EQU 0 (
    echo [OK] App desinstalada!
    echo.
    echo [2/2] IMPORTANTE:
    echo     Ve a la terminal de Expo y presiona 'a'
    echo     Esto reinstalara la app con los nuevos permisos.
    echo.
    pause
) ELSE (
    echo [ERROR] No se pudo desinstalar.
    echo Verifica que el dispositivo este conectado.
    echo.
    pause
)
GOTO MENU

:RELOAD
echo.
echo ========================================
echo   RECARGAR APP
echo ========================================
echo.
echo Para recargar sin perder datos:
echo.
echo Metodo 1: En la terminal de Expo presiona 'r'
echo Metodo 2: Sacude el dispositivo y selecciona "Reload"
echo Metodo 3: Presiona dos veces R en el teclado
echo.
pause
GOTO MENU

:LOGS
echo.
echo ========================================
echo   LOGS EN TIEMPO REAL
echo ========================================
echo.
echo Mostrando logs de React Native (Ctrl+C para salir)
echo.
timeout /t 2 /nobreak > nul
IF DEFINED DEVICE_ID (
    %ADB_PATH% -s %DEVICE_ID% logcat -s ReactNativeJS:V -s Expo:V
) ELSE (
    %ADB_PATH% logcat -s ReactNativeJS:V -s Expo:V
)
GOTO MENU

:FORCE_STOP
echo.
echo ========================================
echo   FORZAR CIERRE
echo ========================================
echo.
IF DEFINED DEVICE_ID (
    %ADB_PATH% -s %DEVICE_ID% shell am force-stop %PACKAGE_NAME%
) ELSE (
    %ADB_PATH% shell am force-stop %PACKAGE_NAME%
)
IF %ERRORLEVEL% EQU 0 (
    echo [OK] App cerrada forzosamente!
    echo Abrela de nuevo desde el dispositivo.
) ELSE (
    echo [ERROR] No se pudo cerrar la app.
)
echo.
pause
GOTO MENU

:END
echo.
echo Saliendo...
exit
