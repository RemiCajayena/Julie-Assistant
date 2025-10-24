# 🔊 Guía de Configuración de Voz (TTS)

## Problema Reportado
- ✅ La voz suena muy robótica
- ✅ Logs excesivos en consola

## Soluciones Implementadas

### 1. 🎙️ Mejora de Calidad de Voz

#### **Configuración Actualizada del TTS**

**Antes:**
```typescript
{
  language: 'es-ES',
  pitch: 1.1,
  rate: 0.9,
}
```

**Ahora (Mejorado):**
```typescript
{
  language: 'es-MX',    // Español México (más natural)
  pitch: 1.05,          // Tono ligeramente más alto
  rate: 0.95,           // Velocidad 5% más lenta (más clara)
  volume: 1.0,
  quality: 'enhanced',  // Calidad mejorada
}
```

#### **Beneficios:**
- ✅ Voz más natural y menos robótica
- ✅ Mayor claridad en pronunciación
- ✅ Velocidad más cómoda para entender
- ✅ Mejor para adultos mayores

---

### 2. 🔇 Reducción de Logs

Se eliminaron logs excesivos en:

#### **`utils/juliePersonality.ts`:**
- ❌ Eliminado: `console.log('🔍 Analizando mensaje:')`
- ❌ Eliminado: `console.log('=== GENERANDO RESPUESTA CONTEXTUAL ===')`
- ❌ Eliminado: `console.log('✅ Nombre detectado:')`
- ❌ Eliminado: `console.log('📊 Resultado final:')`
- ❌ Eliminado: 10+ logs de debug innecesarios

**Resultado:** Solo se muestran logs importantes de TTS, STT y errores.

---

### 3. 📝 Sistema de Logs Configurable

Se creó **`utils/logger.ts`** para controlar logs:

```typescript
import { logger } from '@/utils/logger';

// En lugar de console.log
logger.tts('Audio iniciado');      // 🔊 [TTS] Audio iniciado
logger.conversation('Mensaje');     // 💬 [CONV] Mensaje (DESACTIVADO)
logger.intent('Analizando');        // 🎯 [INTENT] Analizando (DESACTIVADO)
logger.error('Error crítico');      // ❌ [ERROR] Error crítico (SIEMPRE)
```

#### **Categorías de Logs:**
```typescript
export const LOG_CATEGORIES = {
  TTS: true,              // ✅ Text-to-Speech (activo)
  STT: true,              // ✅ Speech-to-Text (activo)
  CONVERSATION: false,    // ❌ Conversación (desactivado)
  INTENT: false,          // ❌ Análisis intención (desactivado)
  API: false,             // ❌ Llamadas API (desactivado)
  AUDIO: true,            // ✅ Audio (activo)
  UI: false,              // ❌ Eventos UI (desactivado)
  ERROR: true,            // ✅ Errores (siempre activo)
};
```

---

## 🎯 Configuración Adicional Recomendada

### **Opción 1: Usar Google Cloud TTS (Actual)**

El sistema ya usa Google Cloud TTS a través del backend:

```typescript
// En VoiceAssistant.tsx
const response = await axios.post(`${API_URL}/tts`, {
  text,
  voice: 'es-US-Neural2-A',  // Voz neural de Google
});
```

**Ventajas:**
- ✅ Voz muy natural (mejor que Expo Speech)
- ✅ Calidad premium
- ✅ Menos robótica

**Desventaja:**
- ⚠️ Requiere conexión a internet

---

### **Opción 2: Mejorar Fallback (Expo Speech)**

Si falla Google Cloud, usa Expo Speech mejorado:

```typescript
{
  language: 'es-MX',      // Español México
  pitch: 1.05,            // Tono natural
  rate: 0.95,             // Velocidad clara
  quality: 'enhanced',    // Calidad mejorada
}
```

---

## 🔧 Ajustes Adicionales

### **1. Cambiar Voz de Google Cloud**

Editar `server/index.js` línea ~XXX:

```javascript
// Voces disponibles en Google Cloud TTS
const voices = {
  femenina: 'es-US-Neural2-A',    // Actual (recomendada)
  masculina: 'es-US-Neural2-B',
  neutro: 'es-US-Neural2-C',
  chilena: 'es-CL-Standard-A',    // Español Chile
};
```

Para cambiar a voz chilena:
```javascript
voice: 'es-CL-Standard-A'
```

---

### **2. Ajustar Velocidad de Habla**

En `VoiceAssistant.tsx`:

```typescript
rate: 0.95  // Actual

// Más lento (para adultos mayores):
rate: 0.85

// Más rápido:
rate: 1.05
```

---

### **3. Ajustar Tono de Voz**

```typescript
pitch: 1.05  // Actual

// Más agudo (voz más juvenil):
pitch: 1.15

// Más grave (voz más seria):
pitch: 0.95
```

---

## 🧪 Probar Cambios

### **1. Reiniciar Servidor Backend:**
```powershell
cd server
node index.js
```

### **2. Recargar App:**
Presiona `r` en la terminal de Expo

### **3. Probar Voz:**
1. Abrir modo adulto mayor
2. Presionar micrófono
3. Decir: "Hola Julie"
4. Escuchar respuesta

---

## 📊 Comparación de Calidad

| Método | Calidad | Latencia | Internet |
|--------|---------|----------|----------|
| **Google Cloud TTS** | ⭐⭐⭐⭐⭐ | ~500ms | ✅ Requiere |
| **Expo Speech (mejorado)** | ⭐⭐⭐ | ~100ms | ❌ No requiere |
| **Expo Speech (original)** | ⭐⭐ | ~100ms | ❌ No requiere |

---

## 🎨 Personalización Avanzada

### **Añadir Pausas Naturales:**

```javascript
const text = "Hola, bienvenido. ... ¿Cómo estás hoy?";
// Las pausas "..." se convierten en pausas de voz
```

### **Énfasis en Palabras:**

```javascript
const text = "Es MUY importante que tomes tu medicamento";
// Mayúsculas pueden generar énfasis en algunas voces
```

---

## 🐛 Solución de Problemas

### **Problema: Voz sigue robótica**

**Solución 1:** Verificar que Google Cloud TTS esté funcionando:
```bash
# Ver logs del servidor
cd server
node index.js

# Buscar:
✅ Audio recibido del servidor (formato MP3)
```

**Solución 2:** Cambiar voz en `server/index.js`:
```javascript
voice: 'es-CL-Standard-A'  // Voz chilena nativa
```

**Solución 3:** Ajustar parámetros:
```typescript
pitch: 1.1,   // Probar valores entre 0.8 - 1.3
rate: 0.9,    // Probar valores entre 0.7 - 1.2
```

---

### **Problema: Logs excesivos**

**Solución 1:** Cambiar nivel de logs en `utils/logger.ts`:
```typescript
export const LOG_CATEGORIES = {
  CONVERSATION: false,  // ❌ Desactivar
  INTENT: false,        // ❌ Desactivar
  API: false,           // ❌ Desactivar
};
```

**Solución 2:** Modo minimal:
```typescript
import { setLogLevel } from '@/utils/logger';

setLogLevel('minimal');  // Solo errores y TTS
```

---

## 📝 Notas

- **Voz Natural**: Google Cloud TTS es significativamente mejor que Expo Speech
- **Fallback**: Si falla la conexión, usa Expo Speech mejorado automáticamente
- **Logs**: Ahora solo se muestran logs importantes
- **Personalización**: Ajusta `pitch` y `rate` según preferencia

---

## 🚀 Próximas Mejoras

- [ ] Soporte para múltiples voces (masculina/femenina)
- [ ] Selección de voz desde configuración
- [ ] Velocidad ajustable por el usuario
- [ ] Síntesis de voz offline con mejor calidad
- [ ] Emociones en la voz (alegre, seria, etc.)
