# 📦 Guía de Migración a Otro PC - Julie Assistant

## ⚠️ PROBLEMAS COMUNES Y CÓMO EVITARLOS

### Los 3 Errores Más Frecuentes:
1. ❌ Copiar `node_modules` (NUNCA lo hagas)
2. ❌ Olvidar configurar variables de entorno
3. ❌ No limpiar cache de Android

---

## 🎯 MÉTODO CORRECTO (Paso a Paso)

### PASO 1: Preparar en el PC Actual

#### 1.1 Crear archivo de migración
```powershell
# En el directorio del proyecto
# Excluir carpetas que NO deben copiarse
```

Crea `.migration-ignore` (similar a .gitignore):
```
node_modules/
.expo/
android/.gradle/
android/app/build/
android/build/
server/node_modules/
server/uploads/
*.log
.DS_Store
```

#### 1.2 Documentar configuración actual
```powershell
# Guardar versiones instaladas
node --version > VERSION_INFO.txt
npm --version >> VERSION_INFO.txt
java -version 2>&1 | Select-String "version" >> VERSION_INFO.txt
```

#### 1.3 Crear lista de dependencias globales
```powershell
# Listar paquetes globales de npm
npm list -g --depth=0 > GLOBAL_PACKAGES.txt
```

#### 1.4 Backup de archivos críticos
Asegúrate de que estos archivos estén incluidos:
- ✅ `.env` (¡MUY IMPORTANTE!)
- ✅ `google-services.json`
- ✅ `server/database.db` (si quieres conservar datos)
- ✅ Credenciales de Firebase (si están locales)

---

### PASO 2: Comprimir el Proyecto

#### Opción A: Con Git (RECOMENDADO)
```powershell
# Si usas GitHub
git add .
git commit -m "Pre-migration backup"
git push

# En el nuevo PC solo:
git clone https://github.com/RemiCajayena/Julie-Assistant.git
```

#### Opción B: Con ZIP (sin Git)
```powershell
# Usar 7-Zip o WinRAR excluyendo carpetas pesadas
# EXCLUIR manualmente:
# - node_modules/
# - .expo/
# - android/.gradle/
# - android/app/build/
# - server/node_modules/
```

#### Opción C: Script PowerShell para copiar limpio
```powershell
# Guardar como: export-project.ps1

$source = "C:\Users\pc\Desktop\Julie-Assistant"
$destination = "D:\Julie-Assistant-Clean"

# Carpetas a excluir
$exclude = @(
    "node_modules",
    ".expo",
    "build",
    ".gradle",
    "uploads",
    "*.log"
)

# Copiar excluyendo carpetas pesadas
robocopy $source $destination /E /XD $exclude /XF "*.log"

Write-Host "✅ Proyecto exportado a: $destination"
Write-Host "📦 Tamaño: " (Get-ChildItem $destination -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB "MB"
```

---

### PASO 3: Configurar en el Nuevo PC

#### 3.1 Instalar Prerequisites
```powershell
# 1. Node.js (MISMA VERSIÓN o compatible)
# Descargar de: https://nodejs.org/
# Verificar: node --version

# 2. Git (opcional pero recomendado)
# Descargar de: https://git-scm.com/

# 3. Android Studio
# Descargar de: https://developer.android.com/studio
# IMPORTANTE: Durante instalación incluir:
#   - Android SDK
#   - Android SDK Platform
#   - Android Virtual Device
```

#### 3.2 Configurar Variables de Entorno

**ANDROID_HOME:**
```powershell
# En PowerShell como Administrador
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\[TU_USUARIO]\AppData\Local\Android\Sdk', 'User')
[System.Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', 'C:\Users\[TU_USUARIO]\AppData\Local\Android\Sdk', 'User')

# Agregar al PATH
$androidPaths = @(
    "$env:ANDROID_HOME\emulator",
    "$env:ANDROID_HOME\platform-tools",
    "$env:ANDROID_HOME\tools",
    "$env:ANDROID_HOME\tools\bin"
)

foreach ($path in $androidPaths) {
    $currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    if ($currentPath -notlike "*$path*") {
        [System.Environment]::SetEnvironmentVariable('Path', "$currentPath;$path", 'User')
    }
}

# REINICIAR PowerShell después de esto
```

**Verificar:**
```powershell
adb version
emulator -version
```

#### 3.3 Instalar Dependencias

```powershell
# En el directorio del proyecto

# 1. Instalar dependencias principales
npm install

# 2. Instalar dependencias del servidor
cd server
npm install
cd ..

# 3. Limpiar cache (MUY IMPORTANTE)
npx expo start -c
# O manualmente:
Remove-Item -Recurse -Force node_modules/.cache
Remove-Item -Recurse -Force .expo
npm cache clean --force
```

#### 3.4 Verificar archivo .env

```powershell
# Verificar que existe
Test-Path .env

# Verificar contenido (sin mostrar keys)
Get-Content .env | ForEach-Object { $_.Split('=')[0] }
```

Debe contener:
```env
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
EXPO_PUBLIC_NEWS_API_KEY=...
GOOGLE_CLOUD_API_KEY=...
```

#### 3.5 Regenerar configuración nativa

```powershell
# IMPORTANTE: Esto regenera carpetas android/ios
npx expo prebuild --clean

# Si da errores, forzar:
Remove-Item -Recurse -Force android, ios
npx expo prebuild
```

---

### PASO 4: Probar la Instalación

#### 4.1 Test del servidor
```powershell
cd server
node index.js

# En otra terminal:
curl http://localhost:3000/health
```

#### 4.2 Test de la app
```powershell
# Verificar que detecta dispositivos
adb devices

# Compilar e instalar
npx expo run:android

# Si falla, limpiar y reintentar:
cd android
.\gradlew clean
cd ..
npx expo run:android
```

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### ❌ Error: "ANDROID_HOME not set"
```powershell
# Verificar
echo $env:ANDROID_HOME

# Si está vacío, configurar de nuevo (ver 3.2)
# Asegúrate de REINICIAR PowerShell/VSCode
```

### ❌ Error: "Unable to resolve module"
```powershell
# Limpiar todo
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npx expo start -c
```

### ❌ Error: "Gradle build failed"
```powershell
cd android
.\gradlew clean

# Limpiar cache de Gradle
Remove-Item -Recurse -Force ~/.gradle/caches

cd ..
npx expo run:android
```

### ❌ Error: "Metro bundler can't find module"
```powershell
# Limpiar cache de Metro
npx expo start -c

# O manualmente:
watchman watch-del-all  # Si tienes watchman
npm start -- --reset-cache
```

### ❌ Error: "IP del servidor incorrecta"
```powershell
# Obtener nueva IP del nuevo PC
ipconfig

# Actualizar en config/api.ts
# Cambiar: export const API_URL = 'http://NUEVA_IP:3000';

# Recompilar app
npx expo run:android
```

### ❌ Error: "Firebase no funciona"
```powershell
# Verificar que google-services.json existe en:
# android/app/google-services.json

# Si no está, copiarlo del PC anterior
# Luego regenerar:
npx expo prebuild --clean
```

---

## 📋 CHECKLIST DE MIGRACIÓN

### Antes de copiar:
- [ ] Proyecto funcionando en PC actual
- [ ] `.env` con todas las keys
- [ ] `google-services.json` presente
- [ ] Código committed a Git (si usas)
- [ ] Documentar versión de Node.js

### Durante la copia:
- [ ] NO copiar `node_modules/`
- [ ] NO copiar `.expo/`
- [ ] NO copiar `android/build/`
- [ ] NO copiar `android/.gradle/`
- [ ] SÍ copiar `.env`
- [ ] SÍ copiar `google-services.json`

### En el nuevo PC:
- [ ] Node.js instalado (misma versión)
- [ ] Android Studio instalado
- [ ] ANDROID_HOME configurado
- [ ] PATH actualizado con SDK tools
- [ ] PowerShell/Terminal reiniciado
- [ ] `npm install` ejecutado
- [ ] `npx expo prebuild --clean` ejecutado
- [ ] IP del servidor actualizada
- [ ] Emulador funciona
- [ ] `adb devices` muestra dispositivos
- [ ] App compila sin errores

---

## 🎯 SCRIPT AUTOMÁTICO DE VERIFICACIÓN

Guarda como `verify-setup.ps1`:

```powershell
Write-Host "`n🔍 VERIFICANDO CONFIGURACIÓN DEL PROYECTO`n" -ForegroundColor Cyan

# 1. Node.js
Write-Host "📦 Node.js:" -ForegroundColor Yellow -NoNewline
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host " ✅ $(node --version)" -ForegroundColor Green
} else {
    Write-Host " ❌ NO INSTALADO" -ForegroundColor Red
}

# 2. npm
Write-Host "📦 npm:" -ForegroundColor Yellow -NoNewline
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host " ✅ $(npm --version)" -ForegroundColor Green
} else {
    Write-Host " ❌ NO INSTALADO" -ForegroundColor Red
}

# 3. ANDROID_HOME
Write-Host "🤖 ANDROID_HOME:" -ForegroundColor Yellow -NoNewline
if ($env:ANDROID_HOME) {
    Write-Host " ✅ $env:ANDROID_HOME" -ForegroundColor Green
} else {
    Write-Host " ❌ NO CONFIGURADO" -ForegroundColor Red
}

# 4. adb
Write-Host "🔧 ADB:" -ForegroundColor Yellow -NoNewline
if (Get-Command adb -ErrorAction SilentlyContinue) {
    Write-Host " ✅ INSTALADO" -ForegroundColor Green
} else {
    Write-Host " ❌ NO EN PATH" -ForegroundColor Red
}

# 5. emulator
Write-Host "📱 Emulator:" -ForegroundColor Yellow -NoNewline
if (Get-Command emulator -ErrorAction SilentlyContinue) {
    Write-Host " ✅ INSTALADO" -ForegroundColor Green
} else {
    Write-Host " ❌ NO EN PATH" -ForegroundColor Red
}

# 6. node_modules
Write-Host "📚 node_modules:" -ForegroundColor Yellow -NoNewline
if (Test-Path "node_modules") {
    Write-Host " ✅ INSTALADO" -ForegroundColor Green
} else {
    Write-Host " ❌ EJECUTAR: npm install" -ForegroundColor Red
}

# 7. .env
Write-Host "🔐 .env:" -ForegroundColor Yellow -NoNewline
if (Test-Path ".env") {
    Write-Host " ✅ EXISTE" -ForegroundColor Green
} else {
    Write-Host " ❌ FALTA" -ForegroundColor Red
}

# 8. google-services.json
Write-Host "🔥 google-services.json:" -ForegroundColor Yellow -NoNewline
if (Test-Path "android/app/google-services.json") {
    Write-Host " ✅ EXISTE" -ForegroundColor Green
} else {
    Write-Host " ❌ FALTA" -ForegroundColor Red
}

# 9. android/
Write-Host "🤖 android/:" -ForegroundColor Yellow -NoNewline
if (Test-Path "android") {
    Write-Host " ✅ EXISTE" -ForegroundColor Green
} else {
    Write-Host " ⚠️ EJECUTAR: npx expo prebuild" -ForegroundColor Yellow
}

# 10. Servidor
Write-Host "🖥️ server/node_modules:" -ForegroundColor Yellow -NoNewline
if (Test-Path "server/node_modules") {
    Write-Host " ✅ INSTALADO" -ForegroundColor Green
} else {
    Write-Host " ❌ EJECUTAR: cd server; npm install" -ForegroundColor Red
}

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "ESTADO: " -NoNewline -ForegroundColor Cyan

$allGood = $true
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $allGood = $false }
if (-not $env:ANDROID_HOME) { $allGood = $false }
if (-not (Test-Path ".env")) { $allGood = $false }

if ($allGood) {
    Write-Host "✅ LISTO PARA USAR" -ForegroundColor Green
} else {
    Write-Host "⚠️ REQUIERE CONFIGURACIÓN" -ForegroundColor Yellow
}
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan
```

**Uso:**
```powershell
.\verify-setup.ps1
```

---

## 💾 BACKUP DE SEGURIDAD

Antes de mover, haz backup de:

```powershell
# Crear carpeta de backup
$backupPath = "C:\Julie-Backup-$(Get-Date -Format 'yyyy-MM-dd')"
New-Item -ItemType Directory -Path $backupPath

# Copiar archivos críticos
Copy-Item .env $backupPath
Copy-Item google-services.json $backupPath -ErrorAction SilentlyContinue
Copy-Item android/app/google-services.json $backupPath -ErrorAction SilentlyContinue
Copy-Item server/database.db $backupPath -ErrorAction SilentlyContinue

# Exportar configuración de emuladores
& "$env:ANDROID_HOME\emulator\emulator.exe" -list-avds > "$backupPath\avds.txt"

Write-Host "✅ Backup creado en: $backupPath"
```

---

## 🚀 ORDEN RECOMENDADO DE INSTALACIÓN

### En el Nuevo PC:

1. **Instalar Node.js** (20 min)
2. **Instalar Android Studio** (30-60 min)
3. **Configurar variables de entorno** (5 min)
4. **Reiniciar PC** (2 min) ⚠️ IMPORTANTE
5. **Copiar proyecto** (depende del método)
6. **Instalar dependencias** (10-15 min)
7. **Regenerar nativo** con `npx expo prebuild` (5 min)
8. **Actualizar IP del servidor** en config/api.ts (2 min)
9. **Probar compilación** (10-15 min)

**Tiempo total estimado: 2-3 horas**

---

## 📝 NOTAS IMPORTANTES

### ⚠️ NUNCA Copiar Estas Carpetas:
- ❌ `node_modules/` (50,000+ archivos, +500MB)
- ❌ `.expo/` (cache temporal)
- ❌ `android/build/` (archivos compilados)
- ❌ `android/.gradle/` (cache de Gradle)
- ❌ `server/node_modules/`

### ✅ SIEMPRE Copiar Estos Archivos:
- ✅ `.env` (credenciales)
- ✅ `google-services.json` (Firebase)
- ✅ `package.json` (dependencias)
- ✅ `package-lock.json` (versiones exactas)
- ✅ Todo el código fuente

### 🔧 Después de Copiar:
1. Ejecutar `npm install` (siempre)
2. Ejecutar `npx expo prebuild --clean` (si mover a PC nuevo)
3. Actualizar IP en `config/api.ts`
4. Limpiar cache con `npx expo start -c`

---

## 🎯 COMANDO ÚNICO PARA SETUP RÁPIDO

Después de copiar el proyecto al nuevo PC:

```powershell
# Setup completo en un solo comando
npm install; cd server; npm install; cd ..; npx expo prebuild --clean; Write-Host "`n✅ SETUP COMPLETO! Ahora ejecuta: npx expo run:android`n" -ForegroundColor Green
```

---

¿Algo salió mal? Revisa la sección "PROBLEMAS COMUNES" arriba o ejecuta `.\verify-setup.ps1` 🔍
