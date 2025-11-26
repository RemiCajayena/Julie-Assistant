/**
 * Hook para gestionar notificaciones push con Firebase Cloud Messaging
 * Maneja permisos, tokens FCM y recepción de notificaciones
 */

import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
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
  medicationId?: string;
  reminderId?: string;
  title: string;
  body: string;
  [key: string]: any;
}

export function useFirebaseNotifications() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    // DELAY para evitar conflicto con otros permisos que se solicitan en _layout.js
    // Esperar 3 segundos para que se completen primero los permisos de Audio, Location y Notifications
    const initTimer = setTimeout(async () => {
      console.log('🔥 Inicializando Firebase Notifications...');
      const token = await requestUserPermission();
      if (token) {
        console.log('✅ Token FCM obtenido:', token.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ No se pudo obtener token FCM');
      }
    }, 3000); // 3 segundos de delay

    // Configurar canal de notificaciones para Android
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Recordatorios de Medicamentos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#457dc7ff',
        sound: 'default',
      });
    }

    // Listener para cuando llega un mensaje en foreground
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('✅ 🔥 FIREBASE MESSAGE RECEIVED IN FOREGROUND!');
      console.log('📨 Remote message:', JSON.stringify(remoteMessage, null, 2));
      
      // Mostrar notificación local cuando la app está abierta
      if (remoteMessage.notification) {
        console.log('📢 Scheduling local notification...');
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification.title || 'Notificación',
            body: remoteMessage.notification.body || '',
            data: remoteMessage.data || {},
            sound: true,
          },
          trigger: null, // inmediata
        });
        console.log('✅ Local notification scheduled');
      } else {
        console.log('⚠️ No notification payload in remoteMessage');
      }
      
      setNotification(remoteMessage);
    });

    // Listener para cuando el usuario toca una notificación (app cerrada o background)
    messaging().onNotificationOpenedApp(remoteMessage => {
      handleNotificationTap(remoteMessage);
    });

    // Verificar si la app fue abierta desde una notificación (app completamente cerrada)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          handleNotificationTap(remoteMessage);
        }
      });

    // Cleanup
    return () => {
      clearTimeout(initTimer); // Limpiar el timer
      unsubscribeForeground();
    };
  }, []);

  /**
   * Manejar tap en notificación
   */
  const handleNotificationTap = (remoteMessage: any) => {
    const data = remoteMessage.data as NotificationData;
    
    if (data.type === 'medication_reminder' && data.medicationId) {
      console.log('📱 Abrir recordatorio de medicamento:', data.medicationId);
      // Aquí puedes navegar a la pantalla de medicamentos
    }
  };

  /**
   * Solicitar permisos de notificaciones y obtener token FCM
   */
  const requestUserPermission = async () => {
    try {
      // Para Android 13+, solicitar permiso explícito de POST_NOTIFICATIONS
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const { PermissionsAndroid } = await import('react-native');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('Permiso de notificaciones denegado');
          return null;
        }
      }

      // Solicitar permiso de Firebase (API modular)
      const messagingInstance = messaging();
      const authStatus = await messagingInstance.requestPermission();
      
      // authStatus: 1 = AUTHORIZED, 2 = PROVISIONAL, 0 = DENIED, -1 = NOT_DETERMINED
      const enabled = authStatus === 1 || authStatus === 2;

      if (enabled) {
        // Obtener el token FCM (API modular)
        const token = await messagingInstance.getToken();
        setFcmToken(token);
        
        // Guardar token en AsyncStorage para uso posterior
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem('fcmToken', token);
        
        return token;
      } else {
        console.warn('Permiso de notificaciones Firebase denegado');
        return null;
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return null;
    }
  };

  /**
   * Enviar token al servidor (implementar según tu API)
   */
  const sendTokenToServer = async (token: string, userId: string) => {
    try {
      // TODO: Implementar endpoint en tu servidor
      // await axios.post(`${API_URL}/users/${userId}/fcm-token`, { token });
      console.log('📤 Token enviado al servidor');
    } catch (error) {
      console.error('❌ Error enviando token al servidor:', error);
    }
  };

  /**
   * Programar notificación local (para recordatorios mientras la app está abierta)
   */
  const scheduleLocalNotification = async (
    title: string,
    body: string,
    data: NotificationData,
    triggerDate?: Date
  ) => {
    try {
      const trigger: Notifications.NotificationTriggerInput | null = triggerDate 
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          }
        : null;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger,
      });
      
      console.log('✅ Notificación local programada:', id);
      return id;
    } catch (error) {
      console.error('❌ Error programando notificación local:', error);
      return null;
    }
  };

  /**
   * Cancelar todas las notificaciones locales programadas
   */
  const cancelAllLocalNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Todas las notificaciones locales canceladas');
    } catch (error) {
      console.error('❌ Error cancelando notificaciones:', error);
    }
  };

  return {
    fcmToken,
    notification,
    requestUserPermission,
    sendTokenToServer,
    scheduleLocalNotification,
    cancelAllLocalNotifications,
  };
}
