# Script PowerShell para resetear Julie Assistant
# Uso: .\reset-app.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     RESET JULIE ASSISTANT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Reseteando la aplicacion..." -ForegroundColor Yellow
Write-Host ""

$adbPath = "C:\Users\pc\AppData\Local\Android\Sdk\platform-tools\adb.exe"

try {
    $result = & $adbPath shell pm clear com.julieassistant 2>&1
    
    if ($result -match "Success") {
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "       RESET COMPLETADO!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "La app se reseteo correctamente." -ForegroundColor Green
        Write-Host "Abre la app en el emulador para empezar desde cero." -ForegroundColor White
    } else {
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "       ERROR" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Resultado: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "       ERROR" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica que:" -ForegroundColor Yellow
    Write-Host "1. El emulador este corriendo" -ForegroundColor White
    Write-Host "2. ADB este disponible en: $adbPath" -ForegroundColor White
}

Write-Host ""
Write-Host "Presiona Enter para continuar..." -ForegroundColor Gray
Read-Host
