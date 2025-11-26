/**
 * Sistema de Recordatorios de Medicamentos
 * Verifica periódicamente los horarios y envía recordatorios
 */

import * as db from './database.js';
import * as firebase from './firebaseAdmin.js';
import * as sms from './smsService.js';

// Callbacks para notificaciones en la app
let notificationCallbacks = [];

// Mapa para rastrear recordatorios enviados (evitar duplicados)
const sentReminders = new Map();

// Configuración de recordatorios
const REMINDER_CONFIG = {
  checkInterval: 30000, // Verificar cada 30 segundos (más preciso)
  reminderWindow: 2, // Ventana de ±2 minutos para enviar recordatorio
  reminderRepeat: 30, // Repetir recordatorio cada 30 minutos si no se toma
  maxReminders: 3, // Máximo 3 recordatorios por medicamento
};

/**
 * Registrar callback para enviar notificaciones a la app
 */
export function registerNotificationCallback(callback) {
  notificationCallbacks.push(callback);
  console.log('📱 Callback de notificación registrado');
}

/**
 * Enviar notificación agrupada para múltiples medicamentos
 */
async function sendGroupedNotification(reminders, userId) {
  const medicationList = reminders.map(r => ({
    name: r.medication_name || r.title,
    dosage: r.dosage || ''
  }));

  // Crear mensaje agrupado
  const medicationText = medicationList
    .map(med => `${med.dosage ? med.dosage + ' de ' : ''}${med.name}`)
    .join(' y ');

  const message = `⏰ Es hora de tomar ${medicationText}`;

  console.log(`📢 Enviando notificación agrupada: ${message} a usuario ${userId}`);

  // Registrar notificación para el primer recordatorio (representante del grupo)
  const notification = db.logNotification(reminders[0].id, userId);

  // Enviar notificación FCM con todos los medicamentos
  try {
    if (firebase.isFirebaseInitialized()) {
      const notificationData = {
        type: 'medication_reminder',
        grouped: true,
        medications: medicationList,
        medicationIds: reminders.map(r => String(r.medication_id || '')).join(','),
        reminderIds: reminders.map(r => String(r.id)).join(','),
        notificationId: String(notification.id),
        screen: 'medications'
      };

      const notificationOptions = {
        color: '#4CAF50',
        priority: 'high',
        sound: 'default',
        badge: reminders.length
      };

      const result = await firebase.sendNotificationToUser(
        userId,
        {
          title: '💊 Recordatorio de Medicamentos',
          body: message
        },
        notificationData,
        db.getDeviceTokens,
        notificationOptions
      );

      if (result.success) {
        console.log(`✅ Notificación agrupada FCM enviada exitosamente a ${userId}`);
      } else {
        console.warn(`⚠️ No se pudo enviar notificación agrupada: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('❌ Error enviando notificación agrupada:', error);
  }

  // Notificar al tutor por SMS
  try {
    const tutor = db.getTutor(userId);
    if (tutor && tutor.phone) {
      const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
      if (tutor.phone !== fromNumber) {
        await sms.sendSMS(
          tutor.phone,
          `Julie Recordatorio: ${message} para tu familiar.`
        );
        console.log(`📱 SMS enviado al tutor: ${tutor.phone}`);
      }
    }
  } catch (error) {
    console.error('Error enviando SMS al tutor:', error);
  }

  return notification;
}

/**
 * Enviar notificación a través de todos los canales
 */
async function sendNotification(reminder, userId) {
  const message = reminder.medication_id 
    ? `⏰ Recordatorio: Tomar ${reminder.medication_name || reminder.title}${reminder.dosage ? ` (${reminder.dosage})` : ''}`
    : `⏰ ${reminder.title}`;

  console.log(`📢 Enviando notificación: ${message} a usuario ${userId}`);

  // 1. Registrar en base de datos
  const notification = db.logNotification(reminder.id, userId);

  // 2. Enviar notificación push FCM (método principal)
  try {
    if (firebase.isFirebaseInitialized()) {
      const notificationData = {
        type: 'medication_reminder',
        medicationId: String(reminder.medication_id || ''),
        medicationName: reminder.medication_name || reminder.title,
        dosage: reminder.dosage || '',
        frequency: reminder.description || '',
        reminderId: String(reminder.id),
        notificationId: String(notification.id),
        screen: 'medications'
      };

      // Opciones de notificación personalizadas para medicamentos
      const notificationOptions = {
        color: '#4CAF50', // Verde para medicamentos
        priority: 'high',
        sound: 'default',
        badge: 1
      };

      const result = await firebase.sendNotificationToUser(
        userId,
        {
          title: '💊 Recordatorio de Medicamento',
          body: message
        },
        notificationData,
        db.getDeviceTokens,
        notificationOptions
      );

      if (result.success) {
        console.log(`✅ Notificación FCM enviada exitosamente a ${userId}`);
      } else {
        console.warn(`⚠️ No se pudo enviar notificación FCM: ${result.error}`);
      }
    } else {
      console.warn('⚠️ Firebase Admin SDK no inicializado, no se envió notificación push');
    }
  } catch (error) {
    console.error('❌ Error enviando notificación FCM:', error);
  }

  // 3. Enviar a través de callbacks legacy (mantener por compatibilidad)
  if (notificationCallbacks.length > 0) {
    const notificationData = {
      id: notification.id,
      reminderId: reminder.id,
      userId,
      title: reminder.medication_name || reminder.title,
      body: reminder.description || message,
      data: {
        type: 'medication_reminder',
        medicationId: reminder.medication_id,
        reminderId: reminder.id
      }
    };

    for (const callback of notificationCallbacks) {
      try {
        await callback(notificationData);
      } catch (error) {
        console.error('Error enviando notificación legacy:', error);
      }
    }
  }

  // 4. Notificar al tutor por SMS (opcional)
  try {
    const tutor = db.getTutor(userId);
    if (tutor && tutor.phone) {
      // No enviar SMS si el número del tutor es el mismo que el FROM de SMS
      // (evita error de Twilio cuando se envía a sí mismo)
      const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
      if (tutor.phone !== fromNumber) {
        await sms.sendSMS(
          tutor.phone,
          `Julie Recordatorio: ${message} para tu familiar.`
        );
        console.log(`📱 SMS enviado al tutor: ${tutor.phone}`);
      } else {
        console.log(`ℹ️ SMS no enviado: número del tutor es el mismo que el número FROM`);
      }
    }
  } catch (error) {
    console.error('Error enviando SMS al tutor:', error);
  }

  return notification;
}

/**
 * Verificar si es hora de enviar un recordatorio
 */
function shouldSendReminder(reminderTime) {
  const now = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);
  
  const reminderDate = new Date();
  reminderDate.setHours(hours, minutes, 0, 0);
  
  const diffMinutes = (reminderDate - now) / (1000 * 60);
  
  // Enviar dentro de la ventana de recordatorio configurada (±2 minutos por defecto)
  return Math.abs(diffMinutes) <= REMINDER_CONFIG.reminderWindow;
}

/**
 * Verificar recordatorios programados y enviar notificaciones
 * Agrupa medicamentos con la misma hora en una sola notificación
 */
export async function checkMedicationReminders() {
  try {
    // Obtener recordatorios activos que no estén en snooze
    const dueReminders = db.getDueRemindersNotSnoozed();
    
    if (dueReminders.length === 0) {
      return;
    }

    console.log(`🔔 Verificando ${dueReminders.length} recordatorios programados (excluyendo snoozed)...`);

    // Agrupar recordatorios por usuario y hora
    const reminderGroups = new Map();

    for (const reminder of dueReminders) {
      const key = `${reminder.id}-${new Date().toDateString()}`;
      
      // Verificar si ya se envió hoy
      if (sentReminders.has(key)) {
        const sentCount = sentReminders.get(key);
        if (sentCount >= REMINDER_CONFIG.maxReminders) {
          continue;
        }
      }

      // Verificar si está dentro de la ventana de tiempo
      if (shouldSendReminder(reminder.reminder_time)) {
        // Agrupar por usuario y hora (redondeada a 5 minutos)
        const [hours, minutes] = reminder.reminder_time.split(':').map(Number);
        const roundedMinutes = Math.floor(minutes / 5) * 5;
        const groupKey = `${reminder.user_id}-${hours}:${roundedMinutes}`;
        
        if (!reminderGroups.has(groupKey)) {
          reminderGroups.set(groupKey, []);
        }
        reminderGroups.get(groupKey).push(reminder);
      }
    }

    // Enviar notificaciones agrupadas
    for (const [groupKey, reminders] of reminderGroups) {
      const userId = reminders[0].user_id;
      
      if (reminders.length > 1) {
        // Múltiples medicamentos a la misma hora - enviar agrupados
        console.log(`📦 Agrupando ${reminders.length} medicamentos para usuario ${userId}`);
        await sendGroupedNotification(reminders, userId);
      } else {
        // Un solo medicamento - enviar individual
        await sendNotification(reminders[0], userId);
      }

      // Marcar todos como enviados
      for (const reminder of reminders) {
        const key = `${reminder.id}-${new Date().toDateString()}`;
        const count = (sentReminders.get(key) || 0) + 1;
        sentReminders.set(key, count);
        console.log(`✅ Recordatorio marcado: ${reminder.title} (${count}/${REMINDER_CONFIG.maxReminders})`);
      }
    }
  } catch (error) {
    console.error('❌ Error verificando recordatorios:', error);
  }
}

/**
 * Limpiar recordatorios enviados antiguos (evitar acumulación en memoria)
 */
function cleanupSentReminders() {
  const today = new Date().toDateString();
  const keysToDelete = [];
  
  for (const [key] of sentReminders) {
    if (!key.includes(today)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => sentReminders.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`🧹 Limpiados ${keysToDelete.length} recordatorios antiguos de memoria`);
  }
}

let reminderInterval = null;

/**
 * Iniciar el sistema de recordatorios
 */
export function startReminderSystem() {
  if (reminderInterval) {
    console.log('⚠️ Sistema de recordatorios ya está activo');
    return reminderInterval;
  }

  console.log('🚀 Iniciando sistema de recordatorios de medicamentos...');
  console.log(`⏰ Intervalo de verificación: ${REMINDER_CONFIG.checkInterval / 1000}s`);
  console.log(`📢 Ventana de precisión: ±${REMINDER_CONFIG.reminderWindow} minutos`);
  
  // Verificar inmediatamente al iniciar
  checkMedicationReminders();
  
  // Verificar periódicamente
  reminderInterval = setInterval(() => {
    checkMedicationReminders();
    cleanupSentReminders();
  }, REMINDER_CONFIG.checkInterval);
  
  console.log('✅ Sistema de recordatorios activo');
  return reminderInterval;
}

/**
 * Detener el sistema de recordatorios
 */
export function stopReminderSystem() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log('🛑 Sistema de recordatorios detenido');
  }
}

/**
 * Obtener próximos recordatorios de un usuario
 */
export function getUpcomingReminders(userId, limit = 5) {
  const reminders = db.getReminders(userId, true); // Solo activos
  
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentDay = now.getDay(); // 0 = Domingo, 6 = Sábado
  
  return reminders
    .filter(r => {
      // Verificar día de la semana
      const daysArray = typeof r.days_of_week === 'string' 
        ? JSON.parse(r.days_of_week) 
        : r.days_of_week;
      
      return daysArray.includes(currentDay) && r.reminder_time >= currentTime;
    })
    .sort((a, b) => a.reminder_time.localeCompare(b.reminder_time))
    .slice(0, limit);
}

/**
 * Registrar respuesta del usuario a un recordatorio
 */
export function recordReminderResponse(notificationId, response) {
  try {
    db.logNotificationResponse(notificationId, response);
    console.log(`✅ Respuesta registrada: ${response} para notificación ${notificationId}`);
    return true;
  } catch (error) {
    console.error('Error registrando respuesta:', error);
    return false;
  }
}

// Exportar configuración para poder ajustarla si es necesario
export { REMINDER_CONFIG };

