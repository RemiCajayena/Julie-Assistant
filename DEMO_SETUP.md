# 🎯 GUÍA RÁPIDA - SETUP DE DEMO

## 📋 Antes de Empezar

### Requisitos:
- ✅ Servidor backend funcionando
- ✅ Emulador Android iniciado
- ✅ Dispositivo físico conectado
- ✅ Ambos con la app instalada
- ✅ Datos de prueba creados

---

## 🚀 INICIO RÁPIDO (5 minutos)

### Opción 1: Script Automatizado
```powershell
.\start-demo.ps1
```
Este script hace todo automáticamente.

### Opción 2: Manual

#### 1. Iniciar Servidor
```powershell
cd server
node index.js
```
**Verificar:** Debe mostrar URLs de acceso

#### 2. Crear Datos de Prueba
```powershell
# En otra terminal
cd server
node createDemoData.js
```
**Verificar:** Debe crear usuarios, medicamentos y citas

#### 3. Iniciar Emulador
```powershell
& "C:\Users\pc\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone_API_36.1
```
**Esperar:** 1-2 minutos hasta que inicie

#### 4. Verificar Dispositivos
```powershell
adb devices
```
**Debe mostrar:**
- emulator-5554 (emulador)
- Tu dispositivo físico

#### 5. Instalar App (si es necesario)
```powershell
npx expo run:android
```
Seleccionar dispositivo cuando pregunte

---

## 🎬 CONFIGURACIÓN EN DISPOSITIVOS

### EMULADOR (Tutor):
1. Abrir app
2. Registrarse como "Tutor"
3. Nombre: Carlos González
4. Email: carlos.demo@email.com
5. **IMPORTANTE:** Copiar el ID de usuario que se muestra
6. (Los medicamentos ya están creados en la BD)

### FÍSICO (Adulto Mayor):
1. Abrir app
2. Registrarse como "Adulto Mayor"  
3. Nombre: María González
4. Edad: 75
5. **IMPORTANTE:** Usar ID: `elder_demo_001`
6. Aceptar permisos de micrófono y ubicación

---

## 🎮 PANEL DE CONTROL

Abrir en navegador:
```
server/demo-control.html
```

**Funciones:**
- Ver medicamentos del usuario
- Forzar recordatorios en cualquier momento
- Verificar estado del sistema

**Cambiar IP en el HTML:**
Línea 284: `const API_URL = 'http://TU_IP:3000';`

---

## 🎭 FLUJO DE DEMOSTRACIÓN

### 1. Introducción (2 min)
- Mostrar problema: adultos mayores olvidando medicamentos
- Presentar solución: Julie Assistant

### 2. Demo de Conversación (5 min)

**En dispositivo físico:**

```
"Hola Julie"
→ Julie responde con saludo cálido

"¿Cómo está el clima?"
→ Julie consulta clima real y responde

"¿Qué medicamentos tengo?"
→ Julie lista los 5 medicamentos programados

"Hey Julie" (sin tocar nada)
→ Se activa por voz
"¿Tengo citas esta semana?"
→ Julie informa sobre las 3 citas
```

### 3. Demo de Recordatorio (5 min)

**En el panel de control (navegador):**
1. Cargar medicamentos
2. Seleccionar "Losartán 50mg"
3. Click "Enviar Recordatorio"

**Mostrar ambos dispositivos:**
- **Físico:** Recibe notificación + anuncio de voz
- Usuario dice "Sí, ya lo tomé"
- **Emulador:** Recibe confirmación ✅

**Demo de NO confirmación:**
1. Enviar otro recordatorio
2. NO confirmar (esperar 2 minutos)
3. **Emulador:** Recibe alerta ⚠️ "María no ha tomado su medicamento"

### 4. Características Técnicas (3 min)
- Mostrar código en VSCode
- Explicar arquitectura
- Mencionar tecnologías (GPT-3.5, Whisper, Google Cloud TTS)

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### ❌ "No se puede conectar al servidor"
```powershell
# Verificar IP local
ipconfig

# Actualizar en config/api.ts:
export const API_URL = 'http://TU_IP:3000';

# Reconstruir app
npx expo run:android
```

### ❌ "Dispositivo no recibe notificaciones"
```powershell
# Verificar token FCM registrado
# En la app, ir a Settings y copiar el token
# Verificar en la base de datos que esté guardado
```

### ❌ "Emulador no aparece en adb devices"
```powershell
# Reiniciar adb
adb kill-server
adb start-server
adb devices
```

### ❌ "Activación por voz no funciona"
- Usar botón manual durante la demo
- Explicar que requiere permisos específicos de Android
- Mostrar que el código está implementado

---

## 📊 DATOS DEMO CREADOS

### Usuarios:
- **María González** (elder_demo_001) - 75 años
- **Carlos González** (tutor_demo_001) - Hijo/Tutor

### Medicamentos:
1. **Losartán 50mg** - 08:00, 20:00 (presión)
2. **Metformina 850mg** - 09:00, 14:00, 21:00 (diabetes)
3. **Omeprazol 20mg** - 07:30 (estómago)
4. **Atorvastatina 20mg** - 22:00 (colesterol)
5. **Aspirina 100mg** - 08:30 (anticoagulante)

### Citas:
1. **Dr. González** (Cardiólogo) - Próxima semana 10:00
2. **Dra. Muñoz** (Endocrinóloga) - En 2 semanas 15:30
3. **Dr. Silva** (General) - Mañana 11:00

---

## ✅ CHECKLIST PRE-PRESENTACIÓN

- [ ] Servidor corriendo ✅
- [ ] Datos de prueba creados ✅
- [ ] Emulador iniciado ✅
- [ ] Dispositivo físico conectado ✅
- [ ] Apps instaladas en ambos ✅
- [ ] Usuarios registrados ✅
- [ ] Panel de control abierto ✅
- [ ] Batería cargada ✅
- [ ] Wi-Fi conectado ✅
- [ ] Proyector/pantalla funcionando ✅
- [ ] Audio audible ✅
- [ ] Video de backup (plan B) ✅
- [ ] VSCode con código abierto ✅

---

## 🎤 PUNTOS CLAVE A DESTACAR

### Innovación:
- IA conversacional real (no respuestas pre-programadas)
- Sistema multi-turno inteligente
- Activación por voz
- Embeddings para memoria a largo plazo

### Impacto:
- Accesibilidad para adultos mayores
- Tranquilidad para familias
- Adherencia médica mejorada
- No solo asistente, sino compañera

### Técnico:
- React Native + Expo (multiplataforma)
- OpenAI GPT-3.5 + Whisper
- Google Cloud TTS Neural2
- Firebase Cloud Messaging
- Node.js + SQLite

---

## 📱 COMANDOS ÚTILES

### Ver logs del servidor:
El servidor muestra logs automáticamente

### Ver logs de Android:
```powershell
# Todos los logs
adb logcat

# Solo logs de Julie
adb logcat | Select-String "Julie"

# Limpiar logs
adb logcat -c
```

### Reiniciar app en dispositivo:
```powershell
# Cerrar app
adb shell am force-stop com.julieassistant

# Abrir app
adb shell am start -n com.julieassistant/.MainActivity
```

### Enviar notificación de prueba:
```powershell
# Usar el panel de control web o:
curl -X POST http://localhost:3000/demo/trigger-reminder `
  -H "Content-Type: application/json" `
  -d '{"userId":"elder_demo_001","medicationName":"Losartán"}'
```

---

## 🎯 TIMING DE LA DEMO

| Sección | Tiempo | Descripción |
|---------|--------|-------------|
| Introducción | 2 min | Problema y solución |
| Setup mostrar | 1 min | Mostrar dispositivos |
| Conversación básica | 3 min | Saludos, clima, preguntas |
| Activación por voz | 2 min | "Hey Julie" demo |
| Recordatorio + confirmación | 3 min | Flujo completo |
| Recordatorio sin confirmar | 2 min | Mostrar alerta al tutor |
| Características técnicas | 3 min | Código y arquitectura |
| Preguntas | 4 min | Q&A |
| **TOTAL** | **20 min** | |

---

## 🚨 PLAN B

Si algo falla:
1. **Video de backup:** Tener grabación del flujo completo
2. **Screenshots:** Capturas de pantalla de cada paso
3. **Código fuente:** Mostrar implementación en VSCode
4. **Diagramas:** Explicar arquitectura con dibujos
5. **Datos en BD:** Mostrar SQLite con datos reales

---

## 💡 CONSEJOS FINALES

✅ **Practica el flujo completo al menos 2 veces**
✅ **Ten agua cerca (hablarás mucho)**
✅ **Llega 15 min antes para setup**
✅ **Desactiva notificaciones en los dispositivos demo**
✅ **Pon el teléfono en modo avión SI NO es el de demo**
✅ **Ten un cronómetro visible**
✅ **Habla despacio y con confianza**
✅ **Disfruta el momento - ¡has trabajado duro!**

---

## 🎉 ¡MUCHA SUERTE!

Has creado algo increíble. Confía en tu trabajo y muéstralo con orgullo.

**Recuerda:** Julie Assistant puede hacer una diferencia real en la vida de las personas.

---

**Archivos Clave:**
- `DEMO_SCRIPT.md` - Script detallado de presentación
- `start-demo.ps1` - Script de inicio automatizado
- `server/createDemoData.js` - Crear datos de prueba
- `server/demo-control.html` - Panel de control web

**URLs Importantes:**
- Servidor: http://localhost:3000
- Panel Control: file:///[path]/server/demo-control.html
- Health Check: http://localhost:3000/health

---

¿Dudas? ¡Revisa DEMO_SCRIPT.md para más detalles! 🚀
