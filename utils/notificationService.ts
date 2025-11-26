/**
 * Servicio de Notificaciones Push con Firebase Cloud Messaging
 * Integra Firebase FCM con el sistema de recordatorios del servidor
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Usar IP local para dispositivos físicos, localhost para emulador
const API_URL = Platform.OS === 'android' 
  ? 'http://192.168.1.207:3000'  // IP de tu PC en la red local
  : 'http://localhost:3000';

interface PushNotificationData {
  id: number;
  reminderId: number;
  userId: number;
  title: string;
  body: string;
  data: {
    type: 'medication_reminder' | 'alert' | 'message';
    medicationId?: number;
    reminderId?: number;
  };
}

/**
 * Enviar notificación push a través del servidor
 */
export async function sendPushNotification(
  userId: number,
  title: string,
  body: string,
  data: Record<string, unknown>
) {
  try {
    const response = await fetch(`${API_URL}/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title,
        body,
        data,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Notificación push enviada:', result);
      return result;
    } else {
      console.error('Error enviando notificación push:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('Error enviando notificación push:', error);
    return null;
  }
}

/**
 * Registrar token FCM de dispositivo en el servidor
 */
export async function registerDeviceToken(userId: number, token: string) {
  try {
    console.log(`\n========== REGISTRO DE TOKEN FCM ==========`);
    console.log(`📱 Usuario: ${userId} (tipo: ${typeof userId})`);
    console.log(`🔑 Token: ${token.substring(0, 30)}...${token.substring(token.length - 10)}`);
    console.log(`📡 Servidor: ${API_URL}/devices/register`);
    console.log(`📱 Plataforma: ${Platform.OS}`);

    const requestBody = {
      userId: String(userId), // Forzar como string
      token: String(token),
      platform: Platform.OS,
      tokenType: 'fcm',
    };
    
    console.log(`📤 Enviando:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${API_URL}/devices/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`📥 Status HTTP: ${response.status} ${response.statusText}`);
    
    const responseData = await response.json();
    console.log(`📊 Respuesta completa:`, JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      await AsyncStorage.setItem('deviceToken', token);
      await AsyncStorage.setItem('notification_mode', 'fcm');
      console.log('✅ Token FCM registrado exitosamente en servidor');
      console.log(`=========================================\n`);
      return true;
    } else {
      console.error('❌ Error del servidor al registrar token');
      console.error('📄 Detalles:', responseData);
      console.log(`=========================================\n`);
      return false;
    }
  } catch (error: any) {
    console.error('❌ EXCEPCIÓN al registrar token FCM');
    console.error('📄 Error:', error);
    console.error('📄 Mensaje:', error?.message);
    console.error('📄 Stack:', error?.stack);
    console.log(`=========================================\n`);
    // Fallback a modo local
    await AsyncStorage.setItem('notification_mode', 'local');
    return false;
  }
}

/**
 * Programar recordatorio local desde el servidor
 */
export async function scheduleLocalReminderFromServer(
  reminderId: number,
  title: string,
  body: string,
  triggerTime: Date,
  data: Record<string, unknown>
) {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...data,
          reminderId,
          type: 'medication_reminder',
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
    });

    console.log(`✅ Recordatorio local programado: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('Error programando recordatorio local:', error);
    return null;
  }
}

/**
 * Sincronizar recordatorios con el servidor
 * Programa notificaciones locales para todos los recordatorios activos
 */
export async function syncRemindersWithServer(userId: number | string) {
  try {
    // Cancelar todas las notificaciones programadas
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Obtener recordatorios activos del servidor
    const response = await fetch(`${API_URL}/reminders/${userId}?active_only=true`);
    
    if (!response.ok) {
      console.error('Error obteniendo recordatorios del servidor');
      return false;
    }

    const data = await response.json();
    const reminders = Array.isArray(data)
      ? data
      : Array.isArray(data?.reminders)
        ? data.reminders
        : [];

    console.log(`📋 Sincronizando ${reminders.length} recordatorios...`);

    const now = new Date();
    let scheduled = 0;

    for (const reminder of reminders) {
      if (!reminder?.reminder_time || !/^([0-1]?\d|2[0-3]):[0-5]\d$/.test(reminder.reminder_time)) {
        // Hora inválida u omitida: saltar este recordatorio
        continue;
      }

      const [hours, minutes] = reminder.reminder_time.split(':').map((n: string) => parseInt(n, 10));
      let daysOfWeek: number[] | null = null;
      if (typeof reminder.days_of_week === 'string' && reminder.days_of_week.trim() !== '') {
        try { daysOfWeek = JSON.parse(reminder.days_of_week); } catch { daysOfWeek = null; }
      } else if (Array.isArray(reminder.days_of_week)) {
        daysOfWeek = reminder.days_of_week as number[];
      }

      // Si no hay días definidos, asumir todos los días de la semana (0-6)
      if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
        daysOfWeek = [0,1,2,3,4,5,6];
      }

      // Programar para cada día de la semana
      for (const dayOfWeek of daysOfWeek) {
        const triggerDate = getNextTriggerDate(dayOfWeek, hours, minutes);
        
        if (triggerDate > now) {
          await scheduleLocalReminderFromServer(
            reminder.id,
            reminder.title,
            reminder.description || `Recordatorio: ${reminder.title}`,
            triggerDate,
            {
              medicationId: reminder.medication_id,
              medicationName: reminder.medication_name,
            }
          );
          scheduled++;
        }
      }
    }

    console.log(`✅ ${scheduled} notificaciones programadas`);
    return true;
  } catch (error) {
    console.error('Error sincronizando recordatorios:', error);
    return false;
  }
}

/**
 * Calcular la próxima fecha de activación para un día y hora específicos
 */
function getNextTriggerDate(dayOfWeek: number, hours: number, minutes: number): Date {
  const now = new Date();
  const result = new Date();
  
  result.setHours(hours, minutes, 0, 0);
  
  // Calcular días hasta el próximo día de la semana
  const currentDay = now.getDay();
  let daysUntil = dayOfWeek - currentDay;
  
  if (daysUntil < 0) {
    daysUntil += 7;
  } else if (daysUntil === 0 && result <= now) {
    // Si es hoy pero ya pasó la hora, programar para la próxima semana
    daysUntil = 7;
  }
  
  result.setDate(result.getDate() + daysUntil);
  
  return result;
}

/**
 * Manejar respuesta a notificación de recordatorio
 */
export async function handleReminderResponse(
  notificationId: number,
  response: 'taken' | 'skipped' | 'postponed'
) {
  try {
    const apiResponse = await fetch(`${API_URL}/notifications/${notificationId}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    });

    if (apiResponse.ok) {
      console.log(`✅ Respuesta de recordatorio registrada: ${response}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error registrando respuesta:', error);
    return false;
  }
}

/**
 * Posponer (snooze) un recordatorio
 */
export async function snoozeReminder(reminderId: number, durationMinutes: number) {
  try {
    const response = await fetch(`${API_URL}/reminders/${reminderId}/snooze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: durationMinutes }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Recordatorio pospuesto por ${durationMinutes} minutos`);
      return result;
    } else {
      console.error('Error posponiendo recordatorio:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('Error en snoozeReminder:', error);
    return null;
  }
}

/**
 * Obtener historial de notificaciones
 */
export async function getNotificationHistory(userId: number, limit: number = 50) {
  try {
    const response = await fetch(`${API_URL}/reminders/${userId}/history?limit=${limit}`);
    
    if (response.ok) {
      const history = await response.json();
      return history;
    }
    return [];
  } catch (error) {
    console.error('Error obteniendo historial de notificaciones:', error);
    return [];
  }
}
