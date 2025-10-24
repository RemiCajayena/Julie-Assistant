/**
 * Sistema de Recordatorios de Medicamentos
 * Verifica periódicamente los horarios y envía recordatorios
 */

import * as db from './database.js';
import * as sms from './smsService.js';

// Callbacks para notificaciones en la app
let notificationCallbacks = [];

// Mapa para rastrear recordatorios enviados (evitar duplicados)
const sentReminders = new Map();

// Configuración de recordatorios
const REMINDER_CONFIG = {
  checkInterval: 60000, // Verificar cada 1 minuto
  reminderWindow: 15, // Ventana de 15 minutos antes del horario
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
 * Enviar notificación a través de todos los canales
 */
async function sendNotification(reminder, userId) {
  const message = reminder.medication_id 
    ? `⏰ Recordatorio: Tomar ${reminder.medication_name || reminder.title}${reminder.dosage ? ` (${reminder.dosage})` : ''}`
    : `⏰ ${reminder.title}`;

  console.log(`📢 Enviando notificación: ${message} a usuario ${userId}`);

  // 1. Registrar en base de datos
  const notification = db.logNotification(reminder.id, userId);

  // 2. Enviar a la app (si hay callbacks registrados)
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
        console.error('Error enviando notificación a la app:', error);
      }
    }
  }

  // 3. Notificar al tutor por SMS (opcional)
  try {
    const tutor = db.getTutor(userId);
    if (tutor && tutor.phone) {
      await sms.sendSMS(
        tutor.phone,
        `Julie Recordatorio: ${message} para tu familiar.`
      );
      console.log(`📱 SMS enviado al tutor: ${tutor.phone}`);
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
  
  // Enviar dentro de la ventana de recordatorio (ej: 15 minutos antes o a la hora exacta)
  return diffMinutes >= -5 && diffMinutes <= REMINDER_CONFIG.reminderWindow;
}

/**
 * Verificar recordatorios programados y enviar notificaciones
 */
export async function checkMedicationReminders() {
  try {
    // Obtener recordatorios activos que no estén en snooze
    const dueReminders = db.getDueRemindersNotSnoozed();
    
    if (dueReminders.length === 0) {
      return;
    }

    console.log(`🔔 Verificando ${dueReminders.length} recordatorios programados (excluyendo snoozed)...`);

    for (const reminder of dueReminders) {
      const key = `${reminder.id}-${new Date().toDateString()}`;
      
      // Verificar si ya se envió hoy
      if (sentReminders.has(key)) {
        const sentCount = sentReminders.get(key);
        if (sentCount >= REMINDER_CONFIG.maxReminders) {
          continue; // Ya se enviaron los recordatorios máximos
        }
      }

      // Verificar si está dentro de la ventana de tiempo
      if (shouldSendReminder(reminder.reminder_time)) {
        await sendNotification(reminder, reminder.user_id);
        
        // Marcar como enviado
        const count = (sentReminders.get(key) || 0) + 1;
        sentReminders.set(key, count);
        
        console.log(`✅ Recordatorio enviado: ${reminder.title} (${count}/${REMINDER_CONFIG.maxReminders})`);
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

  console.log('🚀 Iniciando sistema de recordatorios...');
  console.log(`⏰ Intervalo de verificación: ${REMINDER_CONFIG.checkInterval / 1000}s`);
  console.log(`📢 Ventana de recordatorio: ${REMINDER_CONFIG.reminderWindow} minutos antes`);
  
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

