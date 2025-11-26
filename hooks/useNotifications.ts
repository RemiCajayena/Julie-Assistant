/**
 * Hook para gestionar notificaciones push
 * Maneja permisos, tokens y recepción de notificaciones
 */

import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Configurar cómo se manejan las notificaciones cuando la app está en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'medication_reminder' | 'alert' | 'message';
  medicationId?: number;
  reminderId?: number;
  title: string;
  body: string;
  [key: string]: unknown;
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Registrar para notificaciones push
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
      }
    });

    // Listener para notificaciones recibidas mientras la app está abierta
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listener para cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as unknown as NotificationData;
      
      // Aquí puedes navegar a la pantalla correspondiente
      if (data.type === 'medication_reminder' && data.medicationId) {
        // Navegar a medicamentos
        console.log('📱 Notificación de medicamento:', data.medicationId);
      }
    });

    // Cleanup
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  /**
   * Programar notificación local
   */
  const scheduleNotification = async (
    title: string,
    body: string,
    data: Record<string, unknown>,
    trigger?: Notifications.NotificationTriggerInput
  ) => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: trigger || null, // null = inmediata
      });
      
      console.log('✅ Notificación programada con ID:', id);
      return id;
    } catch (error) {
      console.error('Error programando notificación:', error);
      return null;
    }
  };

  /**
   * Enviar notificación inmediata
   */
  const sendImmediateNotification = async (
    title: string,
    body: string,
    data: NotificationData
  ) => {
    return scheduleNotification(title, body, data as Record<string, unknown>);
  };

  /**
   * Programar notificación para una fecha específica
   */
  const scheduleNotificationForDate = async (
    title: string,
    body: string,
    data: NotificationData,
    date: Date
  ) => {
    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    };
    
    return scheduleNotification(title, body, data, trigger);
  };

  /**
   * Programar notificación diaria
   */
  const scheduleDailyNotification = async (
    title: string,
    body: string,
    data: NotificationData,
    hour: number,
    minute: number
  ) => {
    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };
    
    return scheduleNotification(title, body, data, trigger);
  };

  /**
   * Cancelar notificación
   */
  const cancelNotification = async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('🗑️ Notificación cancelada:', notificationId);
    } catch (error) {
      console.error('Error cancelando notificación:', error);
    }
  };

  /**
   * Cancelar todas las notificaciones programadas
   */
  const cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Todas las notificaciones canceladas');
    } catch (error) {
      console.error('Error cancelando notificaciones:', error);
    }
  };

  /**
   * Obtener notificaciones programadas
   */
  const getScheduledNotifications = async () => {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 ${notifications.length} notificaciones programadas`);
      return notifications;
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      return [];
    }
  };

  return {
    expoPushToken,
    notification,
    sendImmediateNotification,
    scheduleNotificationForDate,
    scheduleDailyNotification,
    cancelNotification,
    cancelAllNotifications,
    getScheduledNotifications,
  };
}

/**
 * Registrar dispositivo para notificaciones push
 */
async function registerForPushNotificationsAsync() {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Obtener permisos de notificaciones
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('❌ Permiso de notificaciones denegado');
    return null;
  }
  
  try {
    // Obtener el token de Expo Push
    try {
      // Para dispositivos físicos con build de desarrollo, necesitamos el projectId correcto
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: '71804a7c-79a5-49f6-a1c9-07889cf4c0a3', // Tu EAS Project ID
      })).data;
      
      console.log('✅ Notificaciones configuradas');
    } catch (pushError: any) {
      // Si falla (build sin configuración de push), usar token de desarrollo
      console.log('⚠️ Usando notificaciones locales');
      token = 'development-mode-token';
    }
  } catch (error) {
    console.error('❌ Error en permisos de notificaciones:', error);
  }

  return token;
}
