# 🔍 Script de Verificación de Setup
# Ejecutar después de mover el proyecto a nuevo PC

Write-Host "`n🔍 VERIFICANDO CONFIGURACIÓN DEL PROYECTO JULIE ASSISTANT`n" -ForegroundColor Cyan

$issues = @()
$warnings = @()

# 1. Node.js
Write-Host "📦 Node.js:" -ForegroundColor Yellow -NoNewline
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host " ✅ $nodeVersion" -ForegroundColor Green
} else {
    Write-Host " ❌ NO INSTALADO" -ForegroundColor Red
    $issues += "Node.js no está instalado. Descarga de: https://nodejs.org/"
}

# 2. npm
Write-Host "📦 npm:" -ForegroundColor Yellow -NoNewline
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Host " ✅ v$npmVersion" -ForegroundColor Green
} else {
    Write-Host " ❌ NO INSTALADO" -ForegroundColor Red
    $issues += "npm no está instalado (viene con Node.js)"
}

# 3. Java (para Android)
Write-Host "☕ Java JDK:" -ForegroundColor Yellow -NoNewline
if (Get-Command java -ErrorAction SilentlyContinue) {
    $javaVersion = java -version 2>&1 | Select-String "version" | Select-Object -First 1
    Write-Host " ✅ INSTALADO" -ForegroundColor Green
} else {
    Write-Host " ❌ NO INSTALADO" -ForegroundColor Red
    $issues += "Java JDK no encontrado (necesario para Android Studio)"
}

# 4. ANDROID_HOME
Write-Host "🤖 ANDROID_HOME:" -ForegroundColor Yellow -NoNewline
if ($env:ANDROID_HOME) {
    Write-Host " ✅ $env:ANDROID_HOME" -ForegroundColor Green
    
    # Verificar que la carpeta existe
    if (Test-Path $env:ANDROID_HOME) {
        Write-Host "   └─ Directorio existe ✅" -ForegroundColor Gray
    } else {
        Write-Host "   └─ ⚠️ Directorio no existe" -ForegroundColor Yellow
        $warnings += "ANDROID_HOME apunta a un directorio que no existe"
    }
} else {
    Write-Host " ❌ NO CONFIGURADO" -ForegroundColor Red
    $issues += "Variable ANDROID_HOME no está configurada"
}

# 5. ANDROID_SDK_ROOT
Write-Host "🤖 ANDROID_SDK_ROOT:" -ForegroundColor Yellow -NoNewline
if ($env:ANDROID_SDK_ROOT) {
    Write-Host " ✅ CONFIGURADO" -ForegroundColor Green
} else {
    Write-Host " ⚠️ NO CONFIGURADO" -ForegroundColor Yellow
    $warnings += "ANDROID_SDK_ROOT no está configurado (opcional pero recomendado)"
}

# 6. adb
Write-Host "🔧 ADB:" -ForegroundColor Yellow -NoNewline
if (Get-Command adb -ErrorAction SilentlyContinue) {
    $adbVersion = adb version 2>&1 | Select-String "Version" | Select-Object -First 1
    Write-Host " ✅ INSTALADO" -ForegroundColor Green
    
    # Verificar dispositivos conectados
    $devices = adb devices | Select-String "device$"
    if ($devices) {
        Write-Host "   └─ Dispositivos conectados: $($devices.Count)" -ForegroundColor Gray
    }
} else {
    Write-Host " ❌ NO EN PATH" -ForegroundColor Red
    $issues += "ADB no está en el PATH. Verifica ANDROID_HOME y reinicia terminal"
}

# 7. emulator
Write-Host "📱 Emulator:" -ForegroundColor Yellow -NoNewline
if (Get-Command emulator -ErrorAction SilentlyContinue) {
    Write-Host " ✅ INSTALADO" -ForegroundColor Green
    
    # Listar AVDs disponibles
    try {
        $avds = & emulator -list-avds 2>$null
        if ($avds) {
            Write-Host "   └─ AVDs disponibles: $($avds.Count)" -ForegroundColor Gray
        }
    } catch {
        # Ignorar errores
    }
} else {
    Write-Host " ❌ NO EN PATH" -ForegroundColor Red
    $issues += "Emulator no está en el PATH. Verifica ANDROID_HOME y reinicia terminal"
}

# 8. node_modules (raíz)
Write-Host "📚 node_modules (app):" -ForegroundColor Yellow -NoNewline
if (Test-Path "node_modules") {
    $packageCount = (Get-ChildItem "node_modules" -Directory).Count
    Write-Host " ✅ INSTALADO ($packageCount paquetes)" -ForegroundColor Green
} else {
    Write-Host " ❌ NO INSTALADO" -ForegroundColor Red
    $issues += "Ejecutar: npm install"
}

# 9. node_modules (servidor)
Write-Host "📚 node_modules (server):" -ForegroundColor Yellow -NoNewline
if (Test-Path "server/node_modules") {
    Write-Host " ✅ INSTALADO" -ForegroundColor Green
} else {
    Write-Host " ❌ NO INSTALADO" -ForegroundColor Red
    $issues += "Ejecutar: cd server; npm install"
}

# 10. .env
Write-Host "🔐 .env:" -ForegroundColor Yellow -NoNewline
if (Test-Path ".env") {
    Write-Host " ✅ EXISTE" -ForegroundColor Green
    
    # Verificar keys importantes
    $envContent = Get-Content ".env" -Raw
    $hasOpenAI = $envContent -match "EXPO_PUBLIC_OPENAI_API_KEY"
    $hasNews = $envContent -match "EXPO_PUBLIC_NEWS_API_KEY"
    $hasGoogle = $envContent -match "GOOGLE_CLOUD_API_KEY"
    
    if ($hasOpenAI) { Write-Host "   ├─ OpenAI API Key ✅" -ForegroundColor Gray } 
    else { $warnings += ".env falta EXPO_PUBLIC_OPENAI_API_KEY" }
    
    if ($hasNews) { Write-Host "   ├─ News API Key ✅" -ForegroundColor Gray }
    else { $warnings += ".env falta EXPO_PUBLIC_NEWS_API_KEY" }
    
    if ($hasGoogle) { Write-Host "   └─ Google Cloud API Key ✅" -ForegroundColor Gray }
    else { $warnings += ".env falta GOOGLE_CLOUD_API_KEY" }
} else {
    Write-Host " ❌ FALTA" -ForegroundColor Red
    $issues += "Archivo .env no existe. Cópialo del PC anterior"
}

# 11. google-services.json
Write-Host "🔥 google-services.json:" -ForegroundColor Yellow -NoNewline
if (Test-Path "android/app/google-services.json") {
    Write-Host " ✅ EXISTE" -ForegroundColor Green
} else {
    Write-Host " ❌ FALTA" -ForegroundColor Red
    $issues += "Archivo google-services.json no existe en android/app/"
}

# 12. android/
Write-Host "🤖 android/:" -ForegroundColor Yellow -NoNewline
if (Test-Path "android") {
    Write-Host " ✅ EXISTE" -ForegroundColor Green
    
    # Verificar si está limpio
    if (Test-Path "android/build") {
        Write-Host "   └─ ⚠️ Contiene carpeta build (considerar limpiar)" -ForegroundColor Yellow
    }
} else {
    Write-Host " ⚠️ NO EXISTE" -ForegroundColor Yellow
    $warnings += "Carpeta android/ no existe. Ejecutar: npx expo prebuild"
}

# 13. package.json
Write-Host "📄 package.json:" -ForegroundColor Yellow -NoNewline
if (Test-Path "package.json") {
    Write-Host " ✅ EXISTE" -ForegroundColor Green
} else {
    Write-Host " ❌ FALTA" -ForegroundColor Red
    $issues += "package.json no existe. ¿Estás en el directorio correcto?"
}

# 14. IP del servidor
Write-Host "🌐 API URL:" -ForegroundColor Yellow -NoNewline
if (Test-Path "config/api.ts") {
    $apiContent = Get-Content "config/api.ts" -Raw
    if ($apiContent -match "API_URL.*'(.+)'") {
        $apiUrl = $matches[1]
        Write-Host " $apiUrl" -ForegroundColor Green
        
        # Verificar si es localhost (probablemente necesita cambio)
        if ($apiUrl -match "localhost|127.0.0.1") {
            Write-Host "   └─ ⚠️ Usando localhost (cambiar a IP de red para dispositivos)" -ForegroundColor Yellow
            $warnings += "API_URL usa localhost. Cambiar a IP local si usas dispositivo físico"
        }
    }
} else {
    Write-Host " ⚠️ config/api.ts no encontrado" -ForegroundColor Yellow
}

# 15. Expo CLI
Write-Host "🎯 Expo CLI:" -ForegroundColor Yellow -NoNewline
if (Get-Command npx -ErrorAction SilentlyContinue) {
    Write-Host " ✅ DISPONIBLE (vía npx)" -ForegroundColor Green
} else {
    Write-Host " ⚠️ npx no disponible" -ForegroundColor Yellow
}

# RESUMEN
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan

if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "`n✅ TODO PERFECTO! El proyecto está listo para usar.`n" -ForegroundColor Green
    Write-Host "Siguiente paso:" -ForegroundColor Cyan
    Write-Host "  npx expo run:android`n" -ForegroundColor White
} else {
    if ($issues.Count -gt 0) {
        Write-Host "`n❌ PROBLEMAS CRÍTICOS ($($issues.Count)):" -ForegroundColor Red
        foreach ($issue in $issues) {
            Write-Host "  • $issue" -ForegroundColor Red
        }
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "`n⚠️ ADVERTENCIAS ($($warnings.Count)):" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  • $warning" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n📖 Consulta MIGRATION_GUIDE.md para soluciones`n" -ForegroundColor Cyan
}

Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

# Guardar reporte
$reportPath = "setup-report-$(Get-Date -Format 'yyyy-MM-dd-HHmm').txt"
$report = @"
REPORTE DE VERIFICACIÓN - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
================================================================

PROBLEMAS CRÍTICOS: $($issues.Count)
$($issues | ForEach-Object { "  • $_" } | Out-String)

ADVERTENCIAS: $($warnings.Count)
$($warnings | ForEach-Object { "  • $_" } | Out-String)

================================================================
"@

$report | Out-File $reportPath -Encoding UTF8
Write-Host "💾 Reporte guardado en: $reportPath`n" -ForegroundColor Gray
