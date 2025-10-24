/**
 * Provider de Notificaciones
 * Maneja el registro de tokens y la recepción de notificaciones
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { registerDeviceToken, syncRemindersWithServer } from '../utils/notificationService';

interface NotificationContextType {
  expoPushToken: string | null;
  syncReminders: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  syncReminders: async () => {},
});

export const useNotificationContext = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { expoPushToken } = useNotifications();
  const [userId, setUserId] = useState<number | null>(null);

  // Cargar userId
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const id = await AsyncStorage.getItem('userId');
        if (id) {
          setUserId(parseInt(id));
        }
      } catch (error) {
        console.error('Error cargando userId:', error);
      }
    };
    
    loadUserId();
  }, []);

  // Registrar token cuando esté disponible o cuando userId cambie (por ejemplo, tras registrar tutor)
  useEffect(() => {
    const tryRegisterToken = async () => {
      if (expoPushToken && userId) {
        // Verificar si ya se registró el token para este userId
        const registeredFlag = await AsyncStorage.getItem(`pushTokenRegistered_${userId}`);
        if (!registeredFlag) {
          const success = await registerDeviceToken(userId, expoPushToken);
          if (success) {
            await AsyncStorage.setItem(`pushTokenRegistered_${userId}`, 'true');
            const mode = expoPushToken === 'development-mode-token' ? 'local' : 'push';
            console.log(`✅ Notificaciones configuradas en modo: ${mode}`);
            syncReminders();
          }
        }
      }
    };
    tryRegisterToken();
  }, [expoPushToken, userId]);

  const syncReminders = async () => {
    if (!userId) {
      console.log('⚠️ No se puede sincronizar: userId no disponible');
      return;
    }

    try {
      const success = await syncRemindersWithServer(userId);
      if (success) {
        console.log('✅ Recordatorios sincronizados con éxito');
      } else {
        console.log('⚠️ Error sincronizando recordatorios');
      }
    } catch (error) {
      console.error('Error sincronizando recordatorios:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ expoPushToken, syncReminders }}>
      {children}
    </NotificationContext.Provider>
  );
}
