# 🚚 Script de Exportación - Julie Assistant
# Prepara el proyecto para migrar a otro PC
# Uso: .\export-project.ps1

Write-Host ""
Write-Host "📦 EXPORTANDO PROYECTO JULIE ASSISTANT" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

$ErrorActionPreference = "Continue"

# Verificar que estamos en la raíz del proyecto
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Ejecuta este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Crear carpeta de backup
$backupFolder = "..\Julie-Backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "📁 Creando carpeta de backup: $backupFolder" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null

# 1. Backup de archivos sensibles
Write-Host ""
Write-Host "💾 Paso 1: Backup de archivos sensibles..." -ForegroundColor Cyan

$filesToBackup = @(
    @{Path=".env"; Desc="Variables de entorno (API keys)"},
    @{Path="google-services.json"; Desc="Firebase config"},
    @{Path="server\database.db"; Desc="Base de datos"},
    @{Path="config\api.ts"; Desc="Configuración API"}
)

foreach ($file in $filesToBackup) {
    if (Test-Path $file.Path) {
        Copy-Item $file.Path "$backupFolder\$(Split-Path $file.Path -Leaf)"
        Write-Host "  ✅ $($file.Desc)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $($file.Desc) - No encontrado" -ForegroundColor Yellow
    }
}

# 2. Limpiar archivos regenerables
Write-Host ""
Write-Host "🧹 Paso 2: Limpiando archivos regenerables..." -ForegroundColor Cyan

$foldersToClean = @(
    @{Path="node_modules"; Desc="Dependencias frontend"},
    @{Path="server\node_modules"; Desc="Dependencias backend"},
    @{Path=".expo"; Desc="Cache de Expo"},
    @{Path=".expo-shared"; Desc="Cache compartido Expo"},
    @{Path=".metro"; Desc="Cache de Metro Bundler"},
    @{Path="android\.gradle"; Desc="Cache de Gradle"},
    @{Path="android\app\build"; Desc="Build de Android"},
    @{Path="android\build"; Desc="Build de Gradle"}
)

foreach ($folder in $foldersToClean) {
    if (Test-Path $folder.Path) {
        Write-Host "  🗑️  Eliminando $($folder.Desc)..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $folder.Path -ErrorAction SilentlyContinue
        if (!(Test-Path $folder.Path)) {
            Write-Host "    ✅ Eliminado" -ForegroundColor Green
        }
    }
}

# Limpiar archivos log
Write-Host "  🗑️  Eliminando archivos .log..." -ForegroundColor Yellow
Remove-Item -Force *.log -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force server\*.log -ErrorAction SilentlyContinue

# 3. Verificar Git
Write-Host ""
Write-Host "🔍 Paso 3: Verificando Git..." -ForegroundColor Cyan

if (Test-Path ".git") {
    Write-Host "  ✅ Repositorio Git encontrado" -ForegroundColor Green
    
    # Verificar cambios sin commit
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "  ⚠️  Hay cambios sin commit:" -ForegroundColor Yellow
        Write-Host "$gitStatus" -ForegroundColor Gray
        
        $commitNow = Read-Host "  ¿Quieres commitear ahora? (s/n)"
        if ($commitNow -eq "s") {
            $commitMsg = Read-Host "  Mensaje de commit"
            git add .
            git commit -m "$commitMsg"
            
            $pushNow = Read-Host "  ¿Hacer push a GitHub? (s/n)"
            if ($pushNow -eq "s") {
                git push origin main
                Write-Host "    ✅ Push completado" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "  ✅ Todo commiteado" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠️  No es un repositorio Git" -ForegroundColor Yellow
    Write-Host "  Se creará archivo ZIP en su lugar" -ForegroundColor Yellow
}

# 4. Crear ZIP del proyecto limpio
Write-Host ""
Write-Host "📦 Paso 4: Creando archivo ZIP..." -ForegroundColor Cyan

$zipName = "..\Julie-Assistant-Clean-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
Write-Host "  Comprimiendo proyecto..." -ForegroundColor Yellow

# Excluir carpetas innecesarias
$excludePatterns = @(
    "node_modules",
    ".expo",
    ".git",
    "android\.gradle",
    "android\build",
    "android\app\build",
    ".metro",
    "*.log"
)

# Comprimir (sin las carpetas excluidas)
try {
    Compress-Archive -Path * -DestinationPath $zipName -Force
    Write-Host "  ✅ ZIP creado: $zipName" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Error creando ZIP: $_" -ForegroundColor Red
}

# 5. Crear archivo de instrucciones
Write-Host ""
Write-Host "📝 Paso 5: Creando instrucciones..." -ForegroundColor Cyan

$instructions = @"
🚚 INSTRUCCIONES DE MIGRACIÓN - JULIE ASSISTANT
================================================

📅 Exportado: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
💻 Desde: $env:COMPUTERNAME

📦 ARCHIVOS CREADOS:
-------------------
1. Backup: $backupFolder
   - Contiene: .env, google-services.json, database.db, config/api.ts
   
2. ZIP: $zipName
   - Contiene el proyecto limpio (sin node_modules ni builds)

🖥️ EN EL NUEVO PC:
------------------

PRERREQUISITOS:
1. Node.js v18+ instalado
2. Android Studio con SDK configurado
3. Variables de entorno ANDROID_HOME configuradas

PASOS:
1. Descomprimir el ZIP en la ubicación deseada
2. Copiar archivos desde la carpeta Backup:
   - .env → raíz del proyecto
   - google-services.json → raíz del proyecto
   - database.db → server/
   
3. Obtener IP local del nuevo PC:
   ipconfig
   
4. Actualizar config/api.ts con la nueva IP:
   export const API_URL = 'http://NUEVA_IP:3000';
   
5. Instalar dependencias:
   npm install
   cd server && npm install && cd ..
   
6. Regenerar archivos nativos:
   npx expo prebuild --clean
   
7. Primera build:
   npx expo run:android

⏱️ Tiempo estimado: 15-20 minutos

🆘 SI HAY PROBLEMAS:
-------------------
1. Limpiar cache:
   npm cache clean --force
   Remove-Item -Recurse -Force node_modules
   npm install

2. Regenerar Android:
   npx expo prebuild --clean

3. Consultar GUIA_MIGRACION.md para más detalles

✅ VERIFICACIONES:
-----------------
- [ ] .env restaurado con API keys
- [ ] google-services.json en raíz
- [ ] IP actualizada en config/api.ts
- [ ] npm install completado
- [ ] npx expo prebuild ejecutado
- [ ] Build exitoso

📞 ARCHIVOS DE REFERENCIA:
-------------------------
- GUIA_MIGRACION.md - Guía completa
- DEMO_SETUP.md - Setup para demo
- DEMO_SCRIPT.md - Script de presentación

¡Buena suerte con la migración! 🚀
"@

$instructions | Out-File "$backupFolder\INSTRUCCIONES.txt" -Encoding UTF8
Write-Host "  ✅ Instrucciones guardadas en: $backupFolder\INSTRUCCIONES.txt" -ForegroundColor Green

# 6. Resumen final
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "✅ EXPORTACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Archivos creados:" -ForegroundColor Cyan
Write-Host "  1. Backup: $backupFolder" -ForegroundColor White
Write-Host "  2. ZIP: $zipName" -ForegroundColor White
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Copiar el ZIP al nuevo PC" -ForegroundColor White
Write-Host "  2. Copiar la carpeta Backup al nuevo PC" -ForegroundColor White
Write-Host "  3. En el nuevo PC, ejecutar import-project.ps1" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Si usas Git, solo necesitas el Backup (no el ZIP)" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Ver GUIA_MIGRACION.md para más detalles" -ForegroundColor Yellow
Write-Host ""

# Abrir carpeta de backup
$openFolder = Read-Host "¿Abrir carpeta de backup? (s/n)"
if ($openFolder -eq "s") {
    explorer.exe $backupFolder
}

Write-Host "✅ Listo para migrar!" -ForegroundColor Green
Write-Host ""
