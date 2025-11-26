# Sistema de Notificaciones Locales

## Descripción General

El sistema de notificaciones locales permite que el adulto mayor reciba recordatorios de medicamentos y citas médicas **incluso cuando la app está en segundo plano o cerrada**. Esto se logra mediante:

1. **Notificaciones Locales** (expo-notifications) - Programadas en el dispositivo
2. **Notificaciones Push FCM** (Firebase) - Enviadas desde el servidor en tiempo real

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                     SERVIDOR                             │
│  - Recordatorios en BD                                   │
│  - Sistema de verificación periódica                     │
│  - Envío de notificaciones FCM                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP/FCM
                 │
┌────────────────▼────────────────────────────────────────┐
│                 DISPOSITIVO MÓVIL                        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         NotificationProvider                      │  │
│  │  - Sincroniza recordatorios del servidor         │  │
│  │  - Programa notificaciones locales               │  │
│  │  - Monitorea estado de la app                    │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│         ┌──────────────┴──────────────┐                │
│         │                              │                 │
│  ┌──────▼──────┐              ┌───────▼────────┐       │
│  │ Notif. FCM  │              │ Notif. Locales │       │
│  │ (Push)      │              │ (Programadas)  │       │
│  │             │              │                 │       │
│  │ - Tiempo    │              │ - Tiempo real   │       │
│  │   real      │              │ - Funcionan en  │       │
│  │ - Requiere  │              │   background    │       │
│  │   internet  │              │ - No requieren  │       │
│  │             │              │   internet      │       │
│  └─────────────┘              └─────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. `useLocalNotifications` (Hook)
Ubicación: `hooks/useLocalNotifications.ts`

Funcionalidades:
- ✅ Solicitar permisos de notificación
- ✅ Programar notificaciones inmediatas
- ✅ Programar notificaciones para fecha/hora específica
- ✅ Programar notificaciones diarias (medicamentos)
- ✅ Programar notificaciones semanales
- ✅ Cancelar notificaciones
- ✅ Obtener notificaciones programadas
- ✅ Limpiar badge

### 2. `localNotificationService` (Servicio)
Ubicación: `services/localNotificationService.ts`

Funcionalidades:
- ✅ Sincronizar recordatorios desde servidor
- ✅ Programar notificaciones para medicamentos
- ✅ Programar notificaciones para citas médicas
- ✅ Verificar si necesita sincronizar (cada 1 hora)

### 3. `NotificationProvider` (Context Provider)
Ubicación: `components/NotificationProvider.tsx`

Funcionalidades:
- ✅ Inicializar sistema de notificaciones
- ✅ Solicitar permisos al inicio
- ✅ Sincronizar automáticamente cuando la app vuelve al foreground
- ✅ Mantener FCM token actualizado

## Flujo de Trabajo

### Creación/Edición de Medicamento

```
1. Usuario crea/edita medicamento
   │
2. Se guardan horarios en servidor (API)
   │
3. Se crean recordatorios en BD
   │
4. syncLocalReminders() se ejecuta
   │
5. Se cancelan todas las notificaciones locales anteriores
   │
6. Se consultan recordatorios activos desde servidor
   │
7. Para cada recordatorio:
   - Se parsea hora (HH:MM)
   - Se programa notificación diaria
   - Se guarda ID de notificación
   │
8. Sistema queda programado ✅
```

### Notificación de Medicamento

```
Hora programada (ej: 08:00)
   │
   ├─> [SERVIDOR] Sistema verifica recordatorios cada 30s
   │   └─> Si coincide horario → Envía FCM push
   │
   └─> [DISPOSITIVO] Notificación local programada
       └─> Sistema operativo muestra notificación
           - Título: "💊 Recordatorio de Medicamento"
           - Cuerpo: "Es hora de tomar [Medicamento] ([Dosis])"
           - Sonido + Vibración
           - Badge en icono de app
```

### Notificación de Cita Médica

```
Cita programada (ej: 2025-11-20 15:00)
   │
   ├─> 24 horas antes (2025-11-19 15:00)
   │   └─> Notificación: "📅 Mañana tienes cita: [Título]"
   │
   └─> 1 hora antes (2025-11-20 14:00)
       └─> Notificación: "📅 ¡Cita Médica Pronto! En 1 hora: [Título]"
```

## Canales de Notificación (Android)

### Canal "medications"
- Importancia: MAX
- Color: #4CAF50 (Verde)
- Sonido: Predeterminado
- Vibración: [0, 250, 250, 250]

### Canal "appointments"
- Importancia: HIGH
- Color: #2196F3 (Azul)
- Sonido: Predeterminado
- Vibración: [0, 250, 250, 250]

### Canal "default"
- Importancia: MAX
- Color: #4CAF50
- Sonido: Predeterminado
- Vibración: [0, 250, 250, 250]

## Sincronización

### Cuándo se Sincroniza

1. **Al iniciar la app** (primera vez)
2. **Al crear/editar medicamento** (manual)
3. **Al eliminar medicamento** (manual)
4. **Al volver del background** (si pasó >1 hora desde última sync)
5. **Cada 1 hora** (automático si la app está abierta)

### Proceso de Sincronización

```javascript
1. Cancelar todas las notificaciones locales existentes
2. Consultar recordatorios activos del servidor
3. Para cada recordatorio de medicamento:
   - Parsear hora (HH:MM)
   - Crear notificación diaria
4. Para cada cita médica:
   - Crear notificación 24h antes
   - Crear notificación 1h antes
5. Guardar IDs de notificaciones programadas
6. Actualizar timestamp de última sincronización
```

## Datos de Notificación

Las notificaciones locales incluyen metadata para navegación:

```typescript
interface LocalNotificationData {
  type: 'medication' | 'appointment' | 'reminder' | 'general';
  id?: string;
  medicationId?: string;
  appointmentId?: string;
  screen?: string; // Pantalla de destino
}
```

## Permisos Requeridos

### Android
- `android.permission.POST_NOTIFICATIONS` (Android 13+)
- Configurado automáticamente por expo-notifications

### iOS
- Permisos solicitados automáticamente al llamar `requestPermissions()`

## Limitaciones

### Android
- ✅ Notificaciones funcionan en background
- ✅ Notificaciones funcionan con app cerrada
- ⚠️ Fabricantes pueden limitar notificaciones (ej: MIUI, EMUI)
- ⚠️ Usuario puede revocar permisos

### iOS
- ✅ Notificaciones funcionan en background
- ✅ Notificaciones funcionan con app cerrada
- ⚠️ Requiere configuración adicional para modo producción

## Monitoreo y Debugging

### Ver Notificaciones Programadas

```javascript
const { getAllScheduledNotifications } = useLocalNotifications();
const notifications = await getAllScheduledNotifications();
console.log(`Notificaciones programadas: ${notifications.length}`);
```

### Cancelar Todas las Notificaciones

```javascript
const { cancelAllNotifications } = useLocalNotifications();
await cancelAllNotifications();
```

### Logs Importantes

- `📱 Notificación recibida (foreground)` - Notificación mostrada mientras app abierta
- `👆 Usuario tocó notificación` - Usuario interactuó con notificación
- `✅ Notificación programada` - Nueva notificación local creada
- `🔄 Sincronizando notificaciones locales` - Proceso de sync iniciado
- `✅ Sincronización completa: X notificaciones programadas` - Sync exitoso

## Mejoras Futuras

1. **Notificaciones con acciones**
   - "Tomar medicamento" / "Posponer"
   - Registro automático de toma

2. **Notificaciones personalizadas**
   - Imágenes del medicamento
   - Sonidos personalizados por medicamento

3. **Estadísticas**
   - Tasa de cumplimiento
   - Horarios más olvidados

4. **Integración con recordatorios del sistema**
   - Sincronizar con calendario del dispositivo
   - Integración con asistentes de voz

## Testing

### Probar Notificación Inmediata

```javascript
const { scheduleImmediateNotification } = useLocalNotifications();
await scheduleImmediateNotification(
  '💊 Prueba',
  'Esta es una notificación de prueba',
  { type: 'medication' }
);
```

### Probar Notificación Programada (1 minuto)

```javascript
const { scheduleDateNotification } = useLocalNotifications();
const oneMinute = new Date(Date.now() + 60 * 1000);
await scheduleDateNotification(
  '⏰ Prueba Programada',
  'Notificación programada para 1 minuto',
  oneMinute,
  { type: 'reminder' }
);
```

## Soporte

Para problemas o preguntas sobre el sistema de notificaciones:
1. Verificar logs de la app
2. Revisar permisos de notificación del dispositivo
3. Verificar sincronización con `getAllScheduledNotifications()`
4. Probar con notificación inmediata primero
