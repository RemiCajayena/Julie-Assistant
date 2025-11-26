/**
 * Provider de Notificaciones con Firebase Cloud Messaging y Notificaciones Locales
 * Maneja tanto notificaciones push (FCM) como notificaciones locales programadas
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFirebaseNotifications } from '../hooks/useFirebaseNotifications';
import { useLocalNotifications } from '../hooks/useLocalNotifications';
import { needsSync, syncLocalNotifications } from '../services/localNotificationService';
import { registerDeviceToken } from '../utils/notificationService';

interface NotificationContextType {
  fcmToken: string | null;
  syncReminders: () => Promise<void>;
  syncLocalReminders: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  fcmToken: null,
  syncReminders: async () => {},
  syncLocalReminders: async () => {},
});

export const useNotificationContext = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { fcmToken } = useFirebaseNotifications();
  const localNotifications = useLocalNotifications();
  const [userId, setUserId] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // DEBUG: Ver cuando cambia fcmToken
  useEffect(() => {
    console.log(`\n🔔 [NotificationProvider] fcmToken cambió:`, fcmToken ? `${fcmToken.substring(0, 20)}...` : 'null');
  }, [fcmToken]);

  // DEBUG: Ver cuando cambia userId
  useEffect(() => {
    console.log(`\n👤 [NotificationProvider] userId cambió:`, userId);
  }, [userId]);

  // Cargar userId
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const id = await AsyncStorage.getItem('userId');
        if (id) {
          setUserId(id);
        }
      } catch (error) {
        console.error('Error cargando userId:', error);
      }
    };
    
    loadUserId();
  }, []);

  // Solicitar permisos de notificación local al montar
  useEffect(() => {
    const setupNotifications = async () => {
      const hasPermission = await localNotifications.requestPermissions();
      if (hasPermission && userId) {
        // Sincronizar notificaciones locales al inicio
        await syncLocalReminders();
      }
    };

    setupNotifications();
  }, [userId]);

  // Monitorear cambios de estado de la app para sincronizar
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // Cuando la app vuelve al foreground
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App en foreground, verificando sincronización...');
        
        if (userId && await needsSync()) {
          console.log('🔄 Sincronizando notificaciones...');
          await syncLocalReminders();
        }
      }
      
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, userId]);

  // Registrar token FCM cuando esté disponible
  useEffect(() => {
    const tryRegisterToken = async () => {
      if (fcmToken && userId) {
        console.log('📱 Intentando registrar token FCM para usuario:', userId);
        const registeredFlag = await AsyncStorage.getItem(`pushTokenRegistered_${userId}`);
        if (!registeredFlag) {
          console.log('🔄 Token no registrado, enviando a servidor...');
          const success = await registerDeviceToken(parseInt(userId), fcmToken);
          if (success) {
            await AsyncStorage.setItem(`pushTokenRegistered_${userId}`, 'true');
            console.log('✅ Token FCM registrado exitosamente');
          } else {
            console.error('❌ Falló el registro del token FCM');
          }
        } else {
          console.log('ℹ️ Token FCM ya estaba registrado');
        }
      } else {
        if (!fcmToken) console.log('⏳ Esperando token FCM...');
        if (!userId) console.log('⏳ Esperando userId...');
      }
    };
    tryRegisterToken();
  }, [fcmToken, userId]);

  const syncReminders = async () => {
    // Mantener por compatibilidad (legacy)
    console.log('ℹ️ syncReminders (legacy) - usar syncLocalReminders');
  };

  const syncLocalReminders = async () => {
    if (!userId) {
      // Solo mostrar warning si ya debería haber userId (después de setup)
      const tutorRegistered = await AsyncStorage.getItem('tutorRegistered');
      const pinSetup = await AsyncStorage.getItem('pin_setup_complete');
      
      if (tutorRegistered || pinSetup === 'true') {
        console.warn('⚠️ No hay userId, no se pueden sincronizar notificaciones');
      } else {
        console.log('ℹ️ Usuario aún no registrado, esperando registro...');
      }
      return;
    }

    try {
      console.log('🔄 Sincronizando notificaciones locales desde servidor...');
      
      await syncLocalNotifications(
        userId,
        localNotifications.scheduleDailyNotification,
        localNotifications.scheduleDateNotification,
        localNotifications.cancelAllNotifications
      );

      // Mostrar resumen de notificaciones programadas
      const scheduled = await localNotifications.getAllScheduledNotifications();
      console.log(`✅ ${scheduled.length} notificaciones locales activas`);
    } catch (error) {
      console.error('❌ Error sincronizando notificaciones locales:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ fcmToken, syncReminders, syncLocalReminders }}>
      {children}
    </NotificationContext.Provider>
  );
}
