/**
 * Servicio para sincronizar notificaciones locales con recordatorios del servidor
 * Programa notificaciones locales para medicamentos y citas
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/api';
import { LocalNotificationData } from '../hooks/useLocalNotifications';

const SYNC_KEY = 'lastNotificationSync';
const NOTIFICATION_IDS_KEY = 'scheduledNotificationIds';

interface Reminder {
  id: number;
  medication_id?: number;
  medication_name?: string;
  dosage?: string;
  title: string;
  description?: string;
  reminder_time: string;
  days_of_week: number[];
  active: number;
}

interface Appointment {
  id: number;
  title: string;
  description?: string;
  appointment_date: string; // ISO string
  location?: string;
  active: number;
}

/**
 * Sincronizar notificaciones locales desde el servidor
 */
export async function syncLocalNotifications(
  userId: string,
  scheduleDaily: (title: string, body: string, hour: number, minute: number, data?: LocalNotificationData) => Promise<string | null>,
  scheduleDate: (title: string, body: string, date: Date, data?: LocalNotificationData) => Promise<string | null>,
  cancelAll: () => Promise<void>
): Promise<void> {
  try {
    console.log('🔄 Iniciando sincronización de notificaciones locales...');

    // Cancelar todas las notificaciones existentes
    await cancelAll();

    const scheduledIds: string[] = [];

    // 1. Sincronizar recordatorios de medicamentos
    const remindersResp = await axios.get(`${API_URL}/reminders/${userId}`);
    const reminders: Reminder[] = remindersResp.data?.reminders || [];
    const activeReminders = reminders.filter(r => r.active === 1);

    console.log(`📋 Sincronizando ${activeReminders.length} recordatorios...`);

    for (const reminder of activeReminders) {
      try {
        // Parsear hora (formato "HH:MM")
        const [hour, minute] = reminder.reminder_time.split(':').map(Number);
        
        if (isNaN(hour) || isNaN(minute)) {
          console.warn(`⚠️ Formato de hora inválido: ${reminder.reminder_time}`);
          continue;
        }

        // Preparar título y cuerpo de la notificación
        const title = '💊 Recordatorio de Medicamento';
        const medicationName = reminder.medication_name || reminder.title;
        const dosageText = reminder.dosage ? ` (${reminder.dosage})` : '';
        const body = `Es hora de tomar ${medicationName}${dosageText}`;

        const notificationData: LocalNotificationData = {
          type: 'medication',
          medicationId: reminder.medication_id?.toString(),
          id: reminder.id.toString(),
          screen: 'medications',
        };

        // Programar notificación diaria
        const notificationId = await scheduleDaily(
          title,
          body,
          hour,
          minute,
          notificationData
        );

        if (notificationId) {
          scheduledIds.push(notificationId);
          console.log(`✅ Notificación programada: ${medicationName} a las ${hour}:${String(minute).padStart(2, '0')}`);
        }
      } catch (error) {
        console.error(`❌ Error programando recordatorio ${reminder.id}:`, error);
      }
    }

    // 2. Sincronizar citas médicas
    const appointmentsResp = await axios.get(`${API_URL}/appointments/${userId}`);
    const appointments: Appointment[] = appointmentsResp.data?.appointments || [];
    const activeAppointments = appointments.filter(a => a.active === 1);

    console.log(`📅 Sincronizando ${activeAppointments.length} citas médicas...`);

    for (const appointment of activeAppointments) {
      try {
        const appointmentDate = new Date(appointment.appointment_date);
        
        // Solo programar citas futuras
        if (appointmentDate > new Date()) {
          // Notificación 1 día antes (24 horas)
          const oneDayBefore = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
          
          if (oneDayBefore > new Date()) {
            const title = '📅 Recordatorio de Cita Médica';
            const locationText = appointment.location ? ` en ${appointment.location}` : '';
            const body = `Mañana tienes cita: ${appointment.title}${locationText}`;

            const notificationData: LocalNotificationData = {
              type: 'appointment',
              appointmentId: appointment.id.toString(),
              screen: 'appointments',
            };

            const notificationId = await scheduleDate(
              title,
              body,
              oneDayBefore,
              notificationData
            );

            if (notificationId) {
              scheduledIds.push(notificationId);
              console.log(`✅ Recordatorio de cita programado: ${appointment.title}`);
            }
          }

          // Notificación 1 hora antes
          const oneHourBefore = new Date(appointmentDate.getTime() - 60 * 60 * 1000);
          
          if (oneHourBefore > new Date()) {
            const title = '📅 ¡Cita Médica Pronto!';
            const locationText = appointment.location ? ` en ${appointment.location}` : '';
            const body = `En 1 hora: ${appointment.title}${locationText}`;

            const notificationData: LocalNotificationData = {
              type: 'appointment',
              appointmentId: appointment.id.toString(),
              screen: 'appointments',
            };

            const notificationId = await scheduleDate(
              title,
              body,
              oneHourBefore,
              notificationData
            );

            if (notificationId) {
              scheduledIds.push(notificationId);
              console.log(`✅ Recordatorio 1h antes programado: ${appointment.title}`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error programando cita ${appointment.id}:`, error);
      }
    }

    // Guardar IDs de notificaciones programadas
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(scheduledIds));
    await AsyncStorage.setItem(SYNC_KEY, new Date().toISOString());

    console.log(`✅ Sincronización completa: ${scheduledIds.length} notificaciones programadas`);
  } catch (error) {
    console.error('❌ Error sincronizando notificaciones locales:', error);
    throw error;
  }
}

/**
 * Obtener última fecha de sincronización
 */
export async function getLastSyncDate(): Promise<Date | null> {
  try {
    const lastSync = await AsyncStorage.getItem(SYNC_KEY);
    return lastSync ? new Date(lastSync) : null;
  } catch (error) {
    console.error('Error obteniendo última sincronización:', error);
    return null;
  }
}

/**
 * Verificar si necesita sincronizar (cada 1 hora)
 */
export async function needsSync(): Promise<boolean> {
  const lastSync = await getLastSyncDate();
  if (!lastSync) return true;

  const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync >= 1;
}
