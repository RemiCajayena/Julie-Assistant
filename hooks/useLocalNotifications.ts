/**
 * Hook para gestionar notificaciones locales
 * Funciona incluso cuando la app está en segundo plano
 */

import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { registerPendingMedication } from '../services/medicationConfirmationService';
import { announceNotification, VoiceNotification } from '../services/voiceNotificationService';

// Configurar comportamiento de notificaciones cuando la app está en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface LocalNotificationData extends Record<string, unknown> {
  type: 'medication' | 'appointment' | 'reminder' | 'general';
  id?: string;
  medicationId?: string;
  appointmentId?: string;
  screen?: string;
}

export function useLocalNotifications() {
  const notificationListener = useRef<any | null>(null);
  const responseListener = useRef<any | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Listener para notificaciones recibidas mientras la app está abierta
    notificationListener.current = Notifications.addNotificationReceivedListener(async notification => {
      console.log('✅ 📱 NOTIFICATION RECEIVED LISTENER TRIGGERED!');
      console.log('📱 Notificación recibida (foreground):', notification);
      
      // Obtener datos de la notificación
      const data = notification.request.content.data as any;
      const title = notification.request.content.title || '';
      const body = notification.request.content.body || '';
      
      console.log('📊 Datos de notificación:', {
        type: data?.type,
        grouped: data?.grouped,
        medicationName: data?.medicationName,
        medications: data?.medications,
        dosage: data?.dosage,
        appState: appState.current,
      });
      
      console.log(`🔍 AppState check: appState.current = "${appState.current}"`);
      
      // Anunciar por voz solo si la app está activa
      if (appState.current === 'active') {
        console.log('✅ 🔊 App activa, anunciando notificación por voz...');
        
        const voiceNotification: VoiceNotification = {
          type: data?.type || 'general',
          grouped: data?.grouped || false,
          medications: data?.medications,
          medicationName: data?.medicationName,
          dosage: data?.dosage,
          appointmentTitle: data?.appointmentTitle,
          location: data?.location,
          customMessage: body,
        };
        
        console.log('✅ 🎤 Llamando announceNotification con:', JSON.stringify(voiceNotification, null, 2));
        try {
          await announceNotification(voiceNotification);
          console.log('✅ announceNotification completado');
        } catch (error) {
          console.error('❌ Error en announceNotification:', error);
        }
        
        // Registrar medicamento para esperar confirmación
        if (data?.type === 'medication_reminder') {
          const medicationIds = data?.grouped 
            ? (data?.medicationIds || '').split(',')
            : [data?.medicationId || ''];
          const medicationNames = data?.grouped
            ? (data?.medications || []).map((m: any) => m.name)
            : [data?.medicationName || ''];
          const reminderIds = data?.grouped
            ? (data?.reminderIds || '').split(',')
            : [data?.reminderId || ''];
          
          registerPendingMedication(medicationIds, medicationNames, reminderIds);
        }
      } else {
        console.log(`⏸️ App NO activa (state: ${appState.current}), no se anuncia por voz`);
      }
    });

    // Listener para cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Usuario tocó notificación:', response);
      const data = response.notification.request.content.data as any;
      
      // Navegar a pantallas específicas según el tipo
      handleNotificationTap(data);
    });

    // Monitorear estado de la app
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const handleNotificationTap = (data: LocalNotificationData) => {
    // TODO: Implementar navegación según el tipo de notificación
    console.log('Navegar a:', data.screen || data.type);
  };

  /**
   * Solicitar permisos de notificación
   */
  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('⚠️ Permisos de notificación denegados');
        return false;
      }

      // Configurar canal de notificaciones para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Recordatorios',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
          sound: 'default',
        });

        // Canal para medicamentos
        await Notifications.setNotificationChannelAsync('medications', {
          name: 'Medicamentos',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
          sound: 'default',
          description: 'Recordatorios de medicamentos',
        });

        // Canal para citas médicas
        await Notifications.setNotificationChannelAsync('appointments', {
          name: 'Citas Médicas',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2196F3',
          sound: 'default',
          description: 'Recordatorios de citas médicas',
        });
      }

      console.log('✅ Permisos de notificación otorgados');
      return true;
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
      return false;
    }
  };

  /**
   * Programar notificación inmediata
   */
  const scheduleImmediateNotification = async (
    title: string,
    body: string,
    data?: LocalNotificationData
  ): Promise<string | null> => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // Inmediato
      });
      
      console.log('✅ Notificación programada:', id);
      return id;
    } catch (error) {
      console.error('❌ Error programando notificación:', error);
      return null;
    }
  };

  /**
   * Programar notificación para una fecha/hora específica
   */
  const scheduleDateNotification = async (
    title: string,
    body: string,
    date: Date,
    data?: LocalNotificationData
  ): Promise<string | null> => {
    try {
      const channelId = data?.type === 'medication' ? 'medications' 
                      : data?.type === 'appointment' ? 'appointments' 
                      : 'default';

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger: {
          date,
          channelId,
        },
      });
      
      console.log(`✅ Notificación programada para ${date.toLocaleString()}:`, id);
      return id;
    } catch (error) {
      console.error('❌ Error programando notificación:', error);
      return null;
    }
  };

  /**
   * Programar notificación diaria a una hora específica
   */
  const scheduleDailyNotification = async (
    title: string,
    body: string,
    hour: number,
    minute: number,
    data?: LocalNotificationData
  ): Promise<string | null> => {
    try {
      const channelId = data?.type === 'medication' ? 'medications' 
                      : data?.type === 'appointment' ? 'appointments' 
                      : 'default';

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger: {
          hour,
          minute,
          repeats: true,
          channelId,
        },
      });
      
      console.log(`✅ Notificación diaria programada para ${hour}:${String(minute).padStart(2, '0')}:`, id);
      return id;
    } catch (error) {
      console.error('❌ Error programando notificación diaria:', error);
      return null;
    }
  };

  /**
   * Programar notificación semanal
   */
  const scheduleWeeklyNotification = async (
    title: string,
    body: string,
    weekday: number, // 1 = Lunes, 7 = Domingo
    hour: number,
    minute: number,
    data?: LocalNotificationData
  ): Promise<string | null> => {
    try {
      const channelId = data?.type === 'medication' ? 'medications' 
                      : data?.type === 'appointment' ? 'appointments' 
                      : 'default';

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger: {
          weekday,
          hour,
          minute,
          repeats: true,
          channelId,
        },
      });
      
      console.log(`✅ Notificación semanal programada:`, id);
      return id;
    } catch (error) {
      console.error('❌ Error programando notificación semanal:', error);
      return null;
    }
  };

  /**
   * Cancelar una notificación específica
   */
  const cancelNotification = async (notificationId: string): Promise<void> => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('✅ Notificación cancelada:', notificationId);
    } catch (error) {
      console.error('❌ Error cancelando notificación:', error);
    }
  };

  /**
   * Cancelar todas las notificaciones programadas
   */
  const cancelAllNotifications = async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ Todas las notificaciones canceladas');
    } catch (error) {
      console.error('❌ Error cancelando notificaciones:', error);
    }
  };

  /**
   * Obtener todas las notificaciones programadas
   */
  const getAllScheduledNotifications = async () => {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 Notificaciones programadas: ${notifications.length}`);
      return notifications;
    } catch (error) {
      console.error('❌ Error obteniendo notificaciones:', error);
      return [];
    }
  };

  /**
   * Limpiar badge de notificaciones
   */
  const clearBadge = async (): Promise<void> => {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('❌ Error limpiando badge:', error);
    }
  };

  return {
    requestPermissions,
    scheduleImmediateNotification,
    scheduleDateNotification,
    scheduleDailyNotification,
    scheduleWeeklyNotification,
    cancelNotification,
    cancelAllNotifications,
    getAllScheduledNotifications,
    clearBadge,
  };
}
