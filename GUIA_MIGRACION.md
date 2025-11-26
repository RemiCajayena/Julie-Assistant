# 🚚 Guía de Migración - Julie Assistant a Otro PC

## ⚠️ PROBLEMAS COMUNES AL MIGRAR

### ❌ Errores Típicos:
1. **node_modules desactualizado** - Causa errores de dependencias
2. **Archivos nativos corruptos** - Android/iOS folders con binarios
3. **Cache de Metro/Gradle** - Builds antiguos causan conflictos
4. **Variables de entorno** - API keys no migradas
5. **Rutas absolutas** - Configuraciones con paths específicos del PC anterior
6. **Android SDK diferente** - Versiones incompatibles

---

## ✅ MÉTODO CORRECTO: Exportación Limpia

### Paso 1: Preparar el Proyecto (PC Actual)

```powershell
# 1. Limpiar todo el cache y builds
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\.gradle -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo-shared -ErrorAction SilentlyContinue

# 2. Limpiar server
cd server
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
cd ..

# 3. Limpiar archivos temporales
Remove-Item -Force *.log -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
```

### Paso 2: Guardar Archivos Importantes

**Crear carpeta temporal para backups:**
```powershell
mkdir ..\\Julie-Backup
```

**Copiar archivos sensibles:**
```powershell
# .env con las API keys
Copy-Item .env ..\\Julie-Backup\\.env

# Base de datos (si quieres mantener datos)
Copy-Item server\\database.db ..\\Julie-Backup\\database.db -ErrorAction SilentlyContinue

# Google services (Firebase)
Copy-Item google-services.json ..\\Julie-Backup\\google-services.json

# Configuraciones personalizadas
Copy-Item config\\api.ts ..\\Julie-Backup\\api.ts
```

### Paso 3: Crear Archivo de Exportación

**OPCIÓN A: Usar Git (Recomendado)**
```powershell
# Si ya tienes repo en GitHub
git add .
git commit -m "Ready for migration"
git push origin main
```

**OPCIÓN B: Comprimir proyecto**
```powershell
# Comprimir solo archivos necesarios (sin node_modules, builds, etc.)
Compress-Archive -Path * -DestinationPath ..\\Julie-Assistant-Clean.zip -Force
```

---

## 📦 ARCHIVOS A INCLUIR (Lista de Verificación)

### ✅ INCLUIR:
```
✓ package.json
✓ package-lock.json
✓ app.json
✓ babel.config.js
✓ tsconfig.json
✓ tailwind.config.js
✓ .env (API keys)
✓ google-services.json
✓ app/ (código fuente)
✓ components/
✓ constants/
✓ contexts/
✓ hooks/
✓ services/
✓ utils/
✓ assets/
✓ server/ (todo el backend)
✓ config/
✓ plugins/
✓ android/ (SOLO AndroidManifest.xml y archivos .kt personalizados)
✓ DEMO_SCRIPT.md
✓ DEMO_SETUP.md
✓ README.md
```

### ❌ NO INCLUIR (Regenerables):
```
✗ node_modules/
✗ android/.gradle/
✗ android/app/build/
✗ android/build/
✗ .expo/
✗ .expo-shared/
✗ .metro/
✗ *.log
✗ dist/
✗ build/
```

---

## 🖥️ SETUP EN EL NUEVO PC

### Paso 1: Prerrequisitos

**Instalar lo siguiente EN ORDEN:**

1. **Node.js LTS** (v18 o superior)
   ```powershell
   # Verificar instalación
   node --version
   npm --version
   ```

2. **Git** (opcional pero recomendado)
   ```powershell
   git --version
   ```

3. **Android Studio**
   - Instalar desde: https://developer.android.com/studio
   - Configurar Android SDK
   - Crear AVD (emulador)

4. **Java JDK 17**
   - Android Studio lo instala automáticamente
   - Verificar: `java -version`

### Paso 2: Configurar Variables de Entorno

**Agregar al PATH:**
```powershell
# Android SDK
$env:ANDROID_HOME = "C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

# Agregar al PATH del sistema:
# %ANDROID_HOME%\platform-tools
# %ANDROID_HOME%\emulator
# %ANDROID_HOME%\tools
# %ANDROID_HOME%\tools\bin
```

**Verificar:**
```powershell
adb version
emulator -version
```

### Paso 3: Copiar el Proyecto

**OPCIÓN A: Desde Git**
```powershell
cd Desktop
git clone https://github.com/TU_USUARIO/Julie-Assistant.git
cd Julie-Assistant
```

**OPCIÓN B: Desde ZIP**
```powershell
# Descomprimir Julie-Assistant-Clean.zip
# Copiar a Desktop/Julie-Assistant
```

### Paso 4: Restaurar Archivos Sensibles

```powershell
# Copiar archivos desde backup
Copy-Item ..\\Julie-Backup\\.env .
Copy-Item ..\\Julie-Backup\\google-services.json .
Copy-Item ..\\Julie-Backup\\database.db server\\ -ErrorAction SilentlyContinue
```

### Paso 5: Instalar Dependencias

```powershell
# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

**Si hay errores, limpiar cache:**
```powershell
npm cache clean --force
npm install
```

### Paso 6: Configurar IP del Servidor

**Obtener IP local del NUEVO PC:**
```powershell
ipconfig
# Buscar IPv4 Address de tu red Wi-Fi
```

**Actualizar en `config/api.ts`:**
```typescript
export const API_URL = 'http://TU_NUEVA_IP:3000';
```

### Paso 7: Regenerar Archivos Nativos

```powershell
# Limpiar y regenerar proyecto Android
npx expo prebuild --clean
```

**Esto regenera:**
- android/
- ios/ (si aplica)
- Todas las configuraciones nativas

### Paso 8: Primera Build

```powershell
# Iniciar Metro Bundler
npx expo start

# En otra terminal, build Android
npx expo run:android
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "Module not found"
```powershell
# Solución
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Error: "SDK location not found"
```powershell
# Crear android/local.properties
echo "sdk.dir=C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk" > android\\local.properties
```

### Error: "Gradle build failed"
```powershell
# Limpiar Gradle
cd android
.\\gradlew clean
cd ..

# O desde raíz
npx expo prebuild --clean
```

### Error: "Expo Dev Client mismatch"
```powershell
# Reinstalar expo-dev-client
npm install expo-dev-client@latest
npx expo prebuild --clean
```

### Error: "Cannot connect to Metro"
```powershell
# Limpiar cache de Metro
npx expo start --clear

# O más agresivo
Remove-Item -Recurse -Force .expo
Remove-Item -Recurse -Force $env:TEMP\\metro-*
Remove-Item -Recurse -Force $env:TEMP\\haste-map-*
npx expo start --clear
```

### Error: "Firebase not initialized"
```powershell
# Verificar que google-services.json exista
Test-Path google-services.json

# Si no existe, copiar del backup
Copy-Item ..\\Julie-Backup\\google-services.json .

# Rebuild
npx expo prebuild --clean
```

---

## 📝 SCRIPT AUTOMATIZADO DE MIGRACIÓN

Voy a crear un script que hace todo esto automáticamente...

### En PC Actual (Exportar):
```powershell
.\\export-project.ps1
```

### En PC Nuevo (Importar):
```powershell
.\\import-project.ps1
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

### En PC Actual (Antes de Exportar):
- [ ] Código commiteado en Git (o ZIP creado)
- [ ] .env copiado a backup
- [ ] google-services.json copiado
- [ ] database.db copiado (opcional)
- [ ] Configuraciones personalizadas guardadas
- [ ] node_modules eliminado
- [ ] Builds limpiados

### En PC Nuevo (Después de Importar):
- [ ] Node.js instalado
- [ ] Android Studio instalado
- [ ] Variables de entorno configuradas
- [ ] adb funciona
- [ ] Proyecto copiado
- [ ] .env restaurado
- [ ] npm install ejecutado (frontend y backend)
- [ ] IP actualizada en config/api.ts
- [ ] npx expo prebuild --clean ejecutado
- [ ] Primera build exitosa

---

## 🎯 MÉTODO RÁPIDO (Para Mañana)

Si necesitas migrar rápido para la presentación:

### PC Actual:
```powershell
# 1. Commit todo
git add .
git commit -m "Ready for presentation"
git push

# 2. Backup manual de .env
Copy-Item .env ..\\backup-env.txt
```

### PC Nuevo:
```powershell
# 1. Clone
git clone URL_DEL_REPO
cd Julie-Assistant

# 2. Instalar
npm install
cd server && npm install && cd ..

# 3. Configurar
# - Copiar .env
# - Actualizar IP en config/api.ts

# 4. Build
npx expo prebuild --clean
npx expo run:android
```

**Tiempo estimado: 15-20 minutos**

---

## 🚨 PLAN DE EMERGENCIA

Si algo falla en el nuevo PC durante la presentación:

### Opción 1: Usar PC Actual
- Llevar el PC actual como respaldo
- Conectar ambos dispositivos a ese PC

### Opción 2: Video de Demostración
- Grabar todo el flujo funcionando hoy
- Mostrar el video si hay problemas técnicos

### Opción 3: Código + Explicación
- Tener el código abierto en VSCode
- Explicar la arquitectura sin ejecutar
- Mostrar diagramas y documentación

---

## 💡 TIPS IMPORTANTES

1. **NO copies node_modules** - Siempre reinstala
2. **NO copies builds de Android** - Regenera con prebuild
3. **SÍ copia .env** - Contiene tus API keys
4. **SÍ usa Git** - Es la forma más segura
5. **Prueba en el nuevo PC CON TIEMPO** - No el día de la presentación
6. **Ten backup del proyecto funcionando** - Por si acaso

---

## 📞 SOPORTE RÁPIDO

Si tienes problemas:

1. **Limpiar todo:**
   ```powershell
   Remove-Item -Recurse -Force node_modules, .expo, android\\.gradle, android\\build
   npm install
   npx expo prebuild --clean
   ```

2. **Verificar environment:**
   ```powershell
   node --version  # Debe ser v18+
   npm --version
   adb version
   java -version   # Debe ser JDK 17
   ```

3. **Reset completo:**
   ```powershell
   git clean -fdx  # ⚠️ CUIDADO: Elimina todo lo no trackeado
   npm install
   npx expo prebuild --clean
   ```

---

¿Necesitas los scripts automatizados export-project.ps1 e import-project.ps1?
