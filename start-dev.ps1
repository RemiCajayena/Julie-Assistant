# Script para iniciar Julie Assistant en modo desarrollo
# Ejecutar: .\start-dev.ps1

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  🚀 JULIE ASSISTANT - DEVELOPMENT ENVIRONMENT" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Configuración
$ADB_PATH = "C:\Users\pc\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$SERVER_PATH = "C:\Users\pc\Desktop\Julie-Assistant\server"
$PORT = 3000

# 1. Verificar que adb existe
Write-Host "🔍 Verificando herramientas..." -ForegroundColor Yellow
if (-Not (Test-Path $ADB_PATH)) {
    Write-Host "❌ Error: adb no encontrado en $ADB_PATH" -ForegroundColor Red
    Write-Host "   Instala Android SDK o ajusta ADB_PATH en este script" -ForegroundColor Red
    exit 1
}
Write-Host "✅ adb encontrado" -ForegroundColor Green

# 2. Verificar que el directorio del servidor existe
if (-Not (Test-Path $SERVER_PATH)) {
    Write-Host "❌ Error: Directorio del servidor no encontrado: $SERVER_PATH" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Directorio del servidor encontrado" -ForegroundColor Green

# 3. Verificar que el emulador/dispositivo está conectado
Write-Host ""
Write-Host "📱 Verificando dispositivos Android..." -ForegroundColor Yellow
$devices = & $ADB_PATH devices | Select-Object -Skip 1 | Where-Object { $_ -match '\w' }

if ($devices.Count -eq 0) {
    Write-Host "❌ No se detectaron dispositivos o emuladores" -ForegroundColor Red
    Write-Host "   Por favor inicia un emulador o conecta un dispositivo" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dispositivo(s) detectado(s):" -ForegroundColor Green
$devices | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }

# 4. Verificar si el puerto está ocupado
Write-Host ""
Write-Host "🔌 Verificando puerto $PORT..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue

if ($portInUse) {
    Write-Host "⚠️  El puerto $PORT está en uso" -ForegroundColor Yellow
    Write-Host "   Proceso usando el puerto:" -ForegroundColor Yellow
    $process = Get-Process -Id $portInUse.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   PID: $($portInUse.OwningProcess) - $($process.ProcessName)" -ForegroundColor Gray
        
        $response = Read-Host "   ¿Deseas cerrar este proceso? (s/n)"
        if ($response -eq "s") {
            Stop-Process -Id $portInUse.OwningProcess -Force
            Write-Host "✅ Proceso cerrado" -ForegroundColor Green
            Start-Sleep -Seconds 2
        } else {
            Write-Host "❌ No se puede iniciar el servidor con el puerto ocupado" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "✅ Puerto $PORT está disponible" -ForegroundColor Green
}

# 5. Configurar adb reverse
Write-Host ""
Write-Host "🔗 Configurando adb reverse..." -ForegroundColor Yellow
try {
    & $ADB_PATH reverse tcp:$PORT tcp:$PORT 2>&1 | Out-Null
    Write-Host "✅ adb reverse configurado: tcp:$PORT -> tcp:$PORT" -ForegroundColor Green
    
    # Verificar
    Write-Host "   Verificando..." -ForegroundColor Gray
    $reverseList = & $ADB_PATH reverse --list
    if ($reverseList -match "tcp:$PORT") {
        Write-Host "   ✓ Configuración confirmada" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Advertencia: No se pudo configurar adb reverse" -ForegroundColor Yellow
    Write-Host "   El servidor seguirá funcionando pero la app podría no conectarse" -ForegroundColor Yellow
}

# 6. Mostrar resumen
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  ✅ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Resumen:" -ForegroundColor White
Write-Host "   • Dispositivo Android: Conectado" -ForegroundColor Green
Write-Host "   • Puerto $PORT`: Disponible" -ForegroundColor Green
Write-Host "   • adb reverse: Configurado" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Yellow
Write-Host "   Presiona Ctrl+C para detener el servidor" -ForegroundColor Gray
Write-Host ""

# 7. Iniciar el servidor
Set-Location $SERVER_PATH
npm start
