/**
 * Sistema de Recordatorios de Citas Médicas
 * Verifica periódicamente las citas y envía recordatorios antes de la hora
 */

import * as db from './database.js';
import * as firebase from './firebaseAdmin.js';
import * as sms from './smsService.js';

// Mapa para rastrear recordatorios enviados (evitar duplicados)
const sentAppointmentReminders = new Map();

// Configuración de recordatorios de citas
const APPOINTMENT_CONFIG = {
  checkInterval: 30000, // Verificar cada 30 segundos (más preciso)
  defaultReminderTimes: [0, 60, 1440], // A la hora exacta, 1 hora antes y 24 horas antes (en minutos)
  reminderWindow: 2, // Ventana de ±2 minutos para enviar recordatorio
};

/**
 * Enviar recordatorio de cita médica
 */
async function sendAppointmentReminder(appointment, userId, minutesBefore) {
  const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
  const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = appointment.appointment_time;

  let timeMessage = '';
  let notificationTitle = '🏥 Cita Médica';
  
  if (minutesBefore === 0) {
    timeMessage = `ahora (${formattedTime})`;
    notificationTitle = '⏰ Es hora de tu cita médica';
  } else if (minutesBefore >= 1440) {
    timeMessage = `mañana a las ${formattedTime}`;
  } else if (minutesBefore >= 60) {
    const hours = Math.floor(minutesBefore / 60);
    timeMessage = `en ${hours} hora${hours > 1 ? 's' : ''} (${formattedTime})`;
  } else {
    timeMessage = `en ${minutesBefore} minutos (${formattedTime})`;
  }

  const message = `🏥 Recordatorio de Cita Médica: ${appointment.title} ${timeMessage}`;
  const body = appointment.description 
    ? `${appointment.description}\n📍 ${appointment.location || 'Ubicación no especificada'}`
    : `📍 ${appointment.location || 'Ubicación no especificada'}`;

  console.log(`📢 Enviando recordatorio de cita: ${message}`);

  // 1. Enviar notificación push FCM
  try {
    if (firebase.isFirebaseInitialized()) {
      const notificationData = {
        type: 'appointment_reminder',
        appointmentId: String(appointment.id),
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        minutesBefore: String(minutesBefore)
      };

      const result = await firebase.sendNotificationToUser(
        userId,
        {
          title: notificationTitle,
          body: `${appointment.title} ${timeMessage}`
        },
        notificationData,
        db.getDeviceTokens
      );

      if (result.success) {
        console.log(`✅ Recordatorio de cita FCM enviado a ${userId}`);
      } else {
        console.warn(`⚠️ No se pudo enviar recordatorio de cita FCM: ${result.error}`);
      }
    } else {
      console.warn('⚠️ Firebase Admin SDK no inicializado');
    }
  } catch (error) {
    console.error('❌ Error enviando recordatorio de cita FCM:', error);
  }

  // 2. Notificar al tutor por SMS (opcional)
  try {
    const tutor = db.getTutor(userId);
    if (tutor && tutor.phone) {
      const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
      if (tutor.phone !== fromNumber) {
        await sms.sendSMS(
          tutor.phone,
          `Julie: Recordatorio de cita médica para tu familiar - ${appointment.title} ${timeMessage}`
        );
        console.log(`📱 SMS de cita enviado al tutor: ${tutor.phone}`);
      }
    }
  } catch (error) {
    console.error('Error enviando SMS de cita al tutor:', error);
  }
}

/**
 * Verificar citas próximas y enviar recordatorios
 */
export async function checkAppointmentReminders() {
  try {
    const now = new Date();
    const upcomingAppointments = db.getUpcomingAppointments('usuario123'); // TODO: obtener todos los usuarios

    if (upcomingAppointments.length === 0) {
      return;
    }

    console.log(`🔔 Verificando ${upcomingAppointments.length} citas próximas...`);

    for (const appointment of upcomingAppointments) {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const diffMinutes = Math.floor((appointmentDateTime - now) / (1000 * 60));

      // Obtener tiempos de recordatorio configurados o usar defaults
      let reminderTimes = APPOINTMENT_CONFIG.defaultReminderTimes;
      if (appointment.reminder_time_before) {
        try {
          reminderTimes = typeof appointment.reminder_time_before === 'string'
            ? JSON.parse(appointment.reminder_time_before)
            : appointment.reminder_time_before;
        } catch (e) {
          console.warn('Error parseando reminder_time_before, usando defaults');
        }
      }

      // Verificar si debemos enviar recordatorio
      for (const reminderTime of reminderTimes) {
        const key = `${appointment.id}-${reminderTime}`;
        
        // Evitar duplicados
        if (sentAppointmentReminders.has(key)) {
          continue;
        }

        // Verificar si estamos dentro de la ventana de tiempo configurada
        if (Math.abs(diffMinutes - reminderTime) <= APPOINTMENT_CONFIG.reminderWindow) {
          await sendAppointmentReminder(appointment, appointment.user_id, reminderTime);
          sentAppointmentReminders.set(key, Date.now());
          console.log(`✅ Recordatorio de cita enviado: ${appointment.title} (${reminderTime} min antes)`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error verificando recordatorios de citas:', error);
  }
}

/**
 * Limpiar recordatorios de citas antiguos
 */
function cleanupSentAppointmentReminders() {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const keysToDelete = [];
  
  for (const [key, timestamp] of sentAppointmentReminders) {
    if (timestamp < oneDayAgo) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => sentAppointmentReminders.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`🧹 Limpiados ${keysToDelete.length} recordatorios de citas antiguos`);
  }
}

let appointmentInterval = null;

/**
 * Iniciar el sistema de recordatorios de citas
 */
export function startAppointmentSystem() {
  if (appointmentInterval) {
    console.log('⚠️ Sistema de recordatorios de citas ya está activo');
    return appointmentInterval;
  }

  console.log('🚀 Iniciando sistema de recordatorios de citas...');
  console.log(`⏰ Intervalo de verificación: ${APPOINTMENT_CONFIG.checkInterval / 1000}s`);
  console.log(`📢 Ventana de precisión: ±${APPOINTMENT_CONFIG.reminderWindow} minutos`);
  
  // Verificar inmediatamente al iniciar
  checkAppointmentReminders();
  
  // Verificar periódicamente
  appointmentInterval = setInterval(() => {
    checkAppointmentReminders();
    cleanupSentAppointmentReminders();
  }, APPOINTMENT_CONFIG.checkInterval);
  
  console.log('✅ Sistema de recordatorios de citas activo');
  return appointmentInterval;
}

/**
 * Detener el sistema de recordatorios de citas
 */
export function stopAppointmentSystem() {
  if (appointmentInterval) {
    clearInterval(appointmentInterval);
    appointmentInterval = null;
    console.log('🛑 Sistema de recordatorios de citas detenido');
  }
}

// Exportar configuración
export { APPOINTMENT_CONFIG };

