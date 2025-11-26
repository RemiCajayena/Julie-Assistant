# Script de Inicio Rapido - Demo Julie Assistant
# Ejecutar: .\start-demo.ps1

Write-Host "INICIANDO DEMO - JULIE ASSISTANT" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# 1. Verificar que el servidor no este corriendo
Write-Host "Paso 1: Verificando servidor..." -ForegroundColor Cyan
$serverProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($serverProcess) {
    Write-Host "Servidor Node.js ya esta corriendo" -ForegroundColor Yellow
    $response = Read-Host "Quieres reiniciarlo? (s/n)"
    if ($response -eq "s") {
        Stop-Process -Name "node" -Force
        Start-Sleep -Seconds 2
    }
}

# 2. Crear datos de prueba
Write-Host "Paso 2: Creando datos de prueba..." -ForegroundColor Cyan
if (Test-Path "server\createDemoData.js") {
    Write-Host "Ejecutando createDemoData.js..." -ForegroundColor Yellow
    Set-Location server
    node createDemoData.js
    Set-Location ..
    Write-Host "Datos de prueba creados exitosamente" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: createDemoData.js no encontrado" -ForegroundColor Yellow
}
Write-Host ""

# 3. Iniciar servidor backend en nueva ventana
Write-Host "Paso 3: Iniciando servidor backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; Write-Host 'SERVIDOR BACKEND ACTIVO' -ForegroundColor Green; node index.js"
Start-Sleep -Seconds 3

# 4. Preguntar si quiere usar emulador
Write-Host "Paso 4: Configuracion de dispositivos..." -ForegroundColor Cyan
Write-Host "Vas a usar emulador para la demo? (s/n)" -ForegroundColor Yellow
$useEmulator = Read-Host
if ($useEmulator -eq "s") {
    $emulatorProcess = Get-Process -Name "qemu-system-x86_64" -ErrorAction SilentlyContinue
    if ($emulatorProcess) {
        Write-Host "Emulador ya esta corriendo" -ForegroundColor Green
    } else {
        Write-Host "Iniciando emulador (esto puede tomar 1-2 minutos)..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "& 'C:\Users\pc\AppData\Local\Android\Sdk\emulator\emulator.exe' -avd Medium_Phone_API_36.1; Write-Host 'EMULADOR LISTO' -ForegroundColor Green"
        Write-Host "Esperando que el emulador inicie..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
} else {
    Write-Host "Usando solo dispositivo fisico para la demo" -ForegroundColor Green
}
Write-Host ""

# 5. Verificar dispositivos conectados
Write-Host "Paso 5: Verificando dispositivos Android..." -ForegroundColor Cyan
$devices = & adb devices
Write-Host $devices
$deviceCount = ($devices | Select-String "device$" | Measure-Object).Count

if ($deviceCount -ge 1) {
    Write-Host "Detectado(s) $deviceCount dispositivo(s)" -ForegroundColor Green
} else {
    Write-Host "No se detectaron dispositivos" -ForegroundColor Red
    Write-Host "Conecta tu telefono por USB con depuracion USB activada" -ForegroundColor Yellow
    Read-Host "Presiona Enter cuando este conectado"
}

# 6. Mostrar IP local para configuracion
Write-Host ""
Write-Host "Paso 6: Configuracion de Red" -ForegroundColor Cyan
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"} | Select-Object -First 1).IPAddress
Write-Host "IP Local del servidor: $localIP" -ForegroundColor Yellow
Write-Host "Verifica que API_URL en config/api.ts sea: http://${localIP}:3000" -ForegroundColor Yellow

# 7. Opciones de instalacion
Write-Host ""
Write-Host "Paso 7: Instalacion de App" -ForegroundColor Cyan
Write-Host "Necesitas instalar/actualizar la app? (s/n)" -ForegroundColor Yellow
$needsInstall = Read-Host

if ($needsInstall -eq "s") {
    Write-Host "Instalando app en dispositivo..." -ForegroundColor Cyan
    Write-Host "Si tienes multiples dispositivos, selecciona el correcto" -ForegroundColor Yellow
    npx expo run:android
} else {
    Write-Host "Saltando instalacion" -ForegroundColor Green
}

# 8. Resumen final
Write-Host ""
Write-Host "=================================" -ForegroundColor Green
Write-Host "DEMO LISTA PARA INICIAR" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Checklist:" -ForegroundColor Cyan
Write-Host "- Servidor backend corriendo en puerto 3000" -ForegroundColor White
Write-Host "- Dispositivo fisico conectado y listo" -ForegroundColor White
Write-Host "- Datos de prueba cargados en la base de datos" -ForegroundColor White
Write-Host ""
Write-Host "Para la presentacion:" -ForegroundColor Cyan
Write-Host "1. Abre la app en tu dispositivo fisico" -ForegroundColor White
Write-Host "2. Muestra las funcionalidades clave:" -ForegroundColor White
Write-Host "   - Conversacion con Julie (voz y texto)" -ForegroundColor White
Write-Host "   - Consultar medicamentos" -ForegroundColor White
Write-Host "   - Consultar clima" -ForegroundColor White
Write-Host "   - Ver citas medicas" -ForegroundColor White
Write-Host "   - Activacion por voz 'Hey Julie'" -ForegroundColor White
Write-Host "3. Usa el panel web (server/demo-control.html) para forzar recordatorios" -ForegroundColor White
Write-Host ""
Write-Host "Usuarios de prueba creados:" -ForegroundColor Yellow
Write-Host "- Paciente: elder_demo_001" -ForegroundColor White
Write-Host "- Tutor: tutor_demo_001" -ForegroundColor White
Write-Host ""
Write-Host "Ver guia completa: DEMO_SCRIPT.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Buena suerte en la presentacion!" -ForegroundColor Green
Write-Host ""
