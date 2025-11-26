# 📥 Script de Importación - Julie Assistant
# Configura el proyecto en un PC nuevo
# Uso: .\import-project.ps1

Write-Host ""
Write-Host "📥 IMPORTANDO PROYECTO JULIE ASSISTANT" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

$ErrorActionPreference = "Continue"

# Verificar que estamos en la raíz del proyecto
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Ejecuta este script desde la raíz del proyecto" -ForegroundColor Red
    Write-Host "   (la carpeta que contiene package.json)" -ForegroundColor Yellow
    exit 1
}

# 1. Verificar prerrequisitos
Write-Host "🔍 Paso 1: Verificando prerrequisitos..." -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Node.js
try {
    $nodeVersion = node --version
    Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
    
    $major = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($major -lt 18) {
        Write-Host "    ⚠️  Se recomienda Node.js v18 o superior" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Node.js no instalado" -ForegroundColor Red
    $allGood = $false
}

# npm
try {
    $npmVersion = npm --version
    Write-Host "  ✅ npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ npm no instalado" -ForegroundColor Red
    $allGood = $false
}

# Java (JDK)
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "  ✅ Java: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Java no encontrado (necesario para Android)" -ForegroundColor Yellow
}

# Android Home
if ($env:ANDROID_HOME) {
    Write-Host "  ✅ ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  ANDROID_HOME no configurado" -ForegroundColor Yellow
    Write-Host "     Configúralo en Variables de Entorno" -ForegroundColor Gray
}

if (!$allGood) {
    Write-Host ""
    Write-Host "❌ Faltan prerrequisitos. Instala lo necesario y vuelve a ejecutar." -ForegroundColor Red
    exit 1
}

# 2. Buscar carpeta de backup
Write-Host ""
Write-Host "📂 Paso 2: Buscando archivos de backup..." -ForegroundColor Cyan

$backupFolder = $null
$backupFolders = Get-ChildItem -Path ".." -Filter "Julie-Backup-*" -Directory | Sort-Object LastWriteTime -Descending

if ($backupFolders.Count -gt 0) {
    Write-Host "  Backups encontrados:" -ForegroundColor Yellow
    for ($i = 0; $i -lt [Math]::Min(5, $backupFolders.Count); $i++) {
        Write-Host "    $($i+1). $($backupFolders[$i].Name) - $($backupFolders[$i].LastWriteTime)" -ForegroundColor Gray
    }
    
    $selection = Read-Host "  ¿Usar backup #1 (más reciente)? (s/n/número)"
    
    if ($selection -eq "s" -or $selection -eq "") {
        $backupFolder = $backupFolders[0].FullName
    } elseif ($selection -match '^\d+$') {
        $idx = [int]$selection - 1
        if ($idx -ge 0 -and $idx -lt $backupFolders.Count) {
            $backupFolder = $backupFolders[$idx].FullName
        }
    }
}

if (!$backupFolder) {
    Write-Host "  ⚠️  No se encontró carpeta de backup" -ForegroundColor Yellow
    $manualPath = Read-Host "  Ruta a la carpeta de backup (Enter para omitir)"
    if ($manualPath -and (Test-Path $manualPath)) {
        $backupFolder = $manualPath
    }
}

# 3. Restaurar archivos sensibles
Write-Host ""
Write-Host "💾 Paso 3: Restaurando archivos sensibles..." -ForegroundColor Cyan

if ($backupFolder) {
    Write-Host "  Usando backup: $backupFolder" -ForegroundColor Gray
    
    $filesToRestore = @(
        @{Source=".env"; Dest=".env"; Desc="Variables de entorno"},
        @{Source="google-services.json"; Dest="google-services.json"; Desc="Firebase config"},
        @{Source="database.db"; Dest="server\database.db"; Desc="Base de datos"},
        @{Source="api.ts"; Dest="config\api.ts"; Desc="Configuración API"}
    )
    
    foreach ($file in $filesToRestore) {
        $sourcePath = Join-Path $backupFolder $file.Source
        if (Test-Path $sourcePath) {
            # Crear directorio si no existe
            $destDir = Split-Path $file.Dest -Parent
            if ($destDir -and !(Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            
            Copy-Item $sourcePath $file.Dest -Force
            Write-Host "  ✅ $($file.Desc)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $($file.Desc) - No encontrado en backup" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ⚠️  Sin backup, deberás configurar manualmente:" -ForegroundColor Yellow
    Write-Host "    - .env (API keys)" -ForegroundColor Gray
    Write-Host "    - google-services.json" -ForegroundColor Gray
    Write-Host "    - config/api.ts (IP del servidor)" -ForegroundColor Gray
}

# 4. Obtener IP local
Write-Host ""
Write-Host "🌐 Paso 4: Configurando red..." -ForegroundColor Cyan

try {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -like "192.168.*"})[0].IPAddress
    
    if ($localIP) {
        Write-Host "  📡 IP local detectada: $localIP" -ForegroundColor Green
        
        $updateIP = Read-Host "  ¿Actualizar config/api.ts con esta IP? (s/n)"
        if ($updateIP -eq "s") {
            if (Test-Path "config\api.ts") {
                $apiContent = Get-Content "config\api.ts" -Raw
                $apiContent = $apiContent -replace "http://\d+\.\d+\.\d+\.\d+:3000", "http://$localIP:3000"
                $apiContent | Set-Content "config\api.ts" -NoNewline
                Write-Host "    ✅ IP actualizada en config/api.ts" -ForegroundColor Green
            } else {
                Write-Host "    ⚠️  config/api.ts no encontrado" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  ⚠️  No se pudo detectar IP automáticamente" -ForegroundColor Yellow
        Write-Host "     Usa: ipconfig para obtenerla manualmente" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  Error detectando IP" -ForegroundColor Yellow
}

# 5. Instalar dependencias
Write-Host ""
Write-Host "📦 Paso 5: Instalando dependencias..." -ForegroundColor Cyan
Write-Host "  (Esto tomará 5-10 minutos)" -ForegroundColor Gray
Write-Host ""

# Frontend
Write-Host "  📱 Instalando dependencias frontend..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ Frontend instalado" -ForegroundColor Green
} else {
    Write-Host "    ❌ Error instalando frontend" -ForegroundColor Red
    Write-Host "       Intenta: npm cache clean --force && npm install" -ForegroundColor Gray
}

# Backend
Write-Host ""
Write-Host "  🖥️  Instalando dependencias backend..." -ForegroundColor Yellow
Set-Location server
npm install
Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ Backend instalado" -ForegroundColor Green
} else {
    Write-Host "    ❌ Error instalando backend" -ForegroundColor Red
}

# 6. Prebuild Android
Write-Host ""
Write-Host "🤖 Paso 6: Generando archivos nativos de Android..." -ForegroundColor Cyan
Write-Host "  (Esto tomará 3-5 minutos)" -ForegroundColor Gray
Write-Host ""

$doPrebuild = Read-Host "  ¿Ejecutar prebuild ahora? (s/n)"
if ($doPrebuild -eq "s") {
    npx expo prebuild --clean
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Prebuild completado" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Error en prebuild" -ForegroundColor Red
        Write-Host "     Puedes ejecutarlo más tarde: npx expo prebuild --clean" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⏭️  Saltado. Ejecuta más tarde: npx expo prebuild --clean" -ForegroundColor Yellow
}

# 7. Verificaciones finales
Write-Host ""
Write-Host "✅ Paso 7: Verificaciones finales..." -ForegroundColor Cyan

$checks = @(
    @{Path=".env"; Desc="Variables de entorno"},
    @{Path="google-services.json"; Desc="Firebase config"},
    @{Path="node_modules"; Desc="Dependencias frontend"},
    @{Path="server\node_modules"; Desc="Dependencias backend"},
    @{Path="android\app\build.gradle"; Desc="Archivos Android"}
)

Write-Host ""
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "  ✅ $($check.Desc)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Desc)" -ForegroundColor Red
    }
}

# 8. Resumen y próximos pasos
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "🎉 IMPORTACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Verificar configuración:" -ForegroundColor Yellow
Write-Host "   - Revisar .env (API keys)" -ForegroundColor White
Write-Host "   - Verificar config/api.ts (IP correcta)" -ForegroundColor White
Write-Host ""
Write-Host "2. Primera ejecución:" -ForegroundColor Yellow
Write-Host "   # Terminal 1 - Backend:" -ForegroundColor White
Write-Host "   cd server" -ForegroundColor Gray
Write-Host "   node index.js" -ForegroundColor Gray
Write-Host ""
Write-Host "   # Terminal 2 - Frontend:" -ForegroundColor White
Write-Host "   npx expo start" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Build Android (opcional):" -ForegroundColor Yellow
Write-Host "   npx expo run:android" -ForegroundColor Gray
Write-Host ""

Write-Host "📖 ARCHIVOS DE REFERENCIA:" -ForegroundColor Cyan
Write-Host "  - GUIA_MIGRACION.md - Guía completa" -ForegroundColor White
Write-Host "  - DEMO_SETUP.md - Setup del demo" -ForegroundColor White
Write-Host "  - README.md - Documentación general" -ForegroundColor White
Write-Host ""

Write-Host "🆘 SI HAY PROBLEMAS:" -ForegroundColor Yellow
Write-Host "  1. Limpiar cache: npm cache clean --force" -ForegroundColor White
Write-Host "  2. Reinstalar: Remove-Item -Recurse node_modules; npm install" -ForegroundColor White
Write-Host "  3. Consultar GUIA_MIGRACION.md" -ForegroundColor White
Write-Host ""

Write-Host "✨ ¡Listo para desarrollar!" -ForegroundColor Green
Write-Host ""

# Preguntar si quiere iniciar el servidor ahora
$startNow = Read-Host "¿Iniciar el servidor backend ahora? (s/n)"
if ($startNow -eq "s") {
    Write-Host ""
    Write-Host "🚀 Iniciando servidor..." -ForegroundColor Cyan
    Write-Host "   (Ctrl+C para detener)" -ForegroundColor Gray
    Write-Host ""
    Set-Location server
    node index.js
}
