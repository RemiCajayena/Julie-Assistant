# 🎭 Script de Inicio Rápido - Demo Julie Assistant
# Ejecutar: .\start-demo-fixed.ps1

Write-Host "🚀 INICIANDO DEMO - JULIE ASSISTANT" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# 1. Verificar que el servidor no esté corriendo
Write-Host "📡 Paso 1: Verificando servidor..." -ForegroundColor Cyan
$serverProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($serverProcess) {
    Write-Host "⚠️  Servidor Node.js ya está corriendo" -ForegroundColor Yellow
    $response = Read-Host "¿Quieres reiniciarlo? (s/n)"
    if ($response -eq "s") {
        Stop-Process -Name "node" -Force
        Start-Sleep -Seconds 2
    }
}

# 2. Iniciar servidor backend en nueva ventana
Write-Host "🔧 Paso 2: Iniciando servidor backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; Write-Host '🔥 SERVIDOR BACKEND ACTIVO' -ForegroundColor Green; node index.js"
Start-Sleep -Seconds 3

# 3. Verificar que el emulador no esté corriendo
Write-Host "📱 Paso 3: Verificando emulador..." -ForegroundColor Cyan
$emulatorProcess = Get-Process -Name "qemu-system-x86_64" -ErrorAction SilentlyContinue
if ($emulatorProcess) {
    Write-Host "✅ Emulador ya está corriendo" -ForegroundColor Green
} else {
    Write-Host "🔄 Iniciando emulador (esto puede tomar 1-2 minutos)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& 'C:\Users\pc\AppData\Local\Android\Sdk\emulator\emulator.exe' -avd Medium_Phone_API_36.1; Write-Host '📱 EMULADOR LISTO' -ForegroundColor Green"
    Write-Host "⏳ Esperando que el emulador inicie..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}

# 4. Verificar dispositivos conectados
Write-Host "📲 Paso 4: Verificando dispositivos Android..." -ForegroundColor Cyan
$devices = & adb devices
Write-Host $devices
$deviceCount = ($devices | Select-String "device$" | Measure-Object).Count

if ($deviceCount -ge 2) {
    Write-Host "✅ Detectados $deviceCount dispositivos (perfecto para demo)" -ForegroundColor Green
} elseif ($deviceCount -eq 1) {
    Write-Host "⚠️  Solo 1 dispositivo detectado. Conecta tu teléfono físico por USB" -ForegroundColor Yellow
    Read-Host "Presiona Enter cuando esté conectado"
} else {
    Write-Host "❌ No se detectaron dispositivos" -ForegroundColor Red
    Write-Host "Soluciones:" -ForegroundColor Yellow
    Write-Host "1. Conecta tu teléfono por USB con depuración activada" -ForegroundColor White
    Write-Host "2. Espera a que el emulador termine de iniciar" -ForegroundColor White
    Read-Host "Presiona Enter cuando estén listos"
}

# 5. Mostrar IP local para configuración
Write-Host ""
Write-Host "🌐 Paso 5: Configuración de Red" -ForegroundColor Cyan
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"} | Select-Object -First 1).IPAddress
Write-Host "IP Local del servidor: $localIP" -ForegroundColor Yellow
Write-Host "Verifica que API_URL en config/api.ts sea: http://${localIP}:3000" -ForegroundColor Yellow

# 6. Opciones de instalación
Write-Host ""
Write-Host "📦 Paso 6: Instalación de App" -ForegroundColor Cyan
Write-Host "Opciones:" -ForegroundColor White
Write-Host "1. Instalar en EMULADOR (Tutor)" -ForegroundColor White
Write-Host "2. Instalar en DISPOSITIVO FÍSICO (Adulto Mayor)" -ForegroundColor White
Write-Host "3. Instalar en AMBOS" -ForegroundColor White
Write-Host "4. SALTAR (ya están instaladas)" -ForegroundColor White
$installOption = Read-Host "Selecciona opción (1-4)"

switch ($installOption) {
    "1" {
        Write-Host "📱 Instalando en emulador..." -ForegroundColor Cyan
        Write-Host "Cuando pregunte, selecciona el emulador" -ForegroundColor Yellow
        npx expo run:android
    }
    "2" {
        Write-Host "📱 Instalando en dispositivo físico..." -ForegroundColor Cyan
        Write-Host "Cuando pregunte, selecciona tu dispositivo" -ForegroundColor Yellow
        npx expo run:android
    }
    "3" {
        Write-Host "📱 Instala primero en emulador, luego ejecuta el comando de nuevo para físico" -ForegroundColor Yellow
        npx expo run:android
    }
    "4" {
        Write-Host "⏭️  Saltando instalación" -ForegroundColor Yellow
    }
}

# 7. Resumen final
Write-Host ""
Write-Host "=================================" -ForegroundColor Green
Write-Host "✅ DEMO LISTA PARA INICIAR" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Checklist:" -ForegroundColor Cyan
Write-Host "✅ Servidor backend corriendo en puerto 3000" -ForegroundColor White
Write-Host "✅ Emulador iniciado (dispositivo tutor)" -ForegroundColor White
Write-Host "⚠️  Dispositivo físico conectado?" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎬 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. En EMULADOR: Abre la app → Registra como 'Tutor'" -ForegroundColor White
Write-Host "2. En FÍSICO: Abre la app → Registra como 'Adulto Mayor'" -ForegroundColor White
Write-Host "3. Configura medicamentos en dispositivo tutor" -ForegroundColor White
Write-Host "4. ¡Empieza la demo!" -ForegroundColor White
Write-Host ""
Write-Host "📖 Ver guía completa: DEMO_SCRIPT.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎤 ¡Buena suerte en la presentación!" -ForegroundColor Green
Write-Host ""
