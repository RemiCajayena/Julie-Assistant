import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * ModeContext - Manejo de modos de la aplicación
 * 
 * Modos:
 * - 'elder': Modo adulto mayor (interfaz simplificada, solo voz)
 * - 'tutor': Modo tutor (interfaz completa, requiere PIN)
 * - 'initial': Primera vez, debe seleccionar quién es
 */

export type AppMode = 'elder' | 'tutor' | 'initial';

interface ModeContextType {
  // Estado
  mode: AppMode;
  isLoading: boolean;
  userId: string | null;  // ID del usuario (adulto mayor)
  userName: string | null; // Nombre del usuario
  
  // Acciones
  setMode: (mode: AppMode) => Promise<void>;
  setUserInfo: (userId: string, userName: string) => Promise<void>;
  resetApp: () => Promise<void>;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const MODE_KEY = 'app_mode';
const USER_ID_KEY = 'user_id';
const USER_NAME_KEY = 'user_name';

export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode>('initial');
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Inicializar: Cargar modo guardado
   */
  useEffect(() => {
    loadMode();
  }, []);

  const loadMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(MODE_KEY);
      const savedUserId = await AsyncStorage.getItem(USER_ID_KEY);
      const savedUserName = await AsyncStorage.getItem(USER_NAME_KEY);

      if (savedMode) {
        setModeState(savedMode as AppMode);
      }
      
      if (savedUserId) {
        setUserId(savedUserId);
      }
      
      if (savedUserName) {
        setUserName(savedUserName);
      }

      console.log('📱 Modo cargado:', savedMode || 'initial');
    } catch (error) {
      console.error('Error cargando modo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cambiar modo de la aplicación
   */
  const setMode = async (newMode: AppMode): Promise<void> => {
    try {
      await AsyncStorage.setItem(MODE_KEY, newMode);
      setModeState(newMode);
      console.log('✅ Modo cambiado a:', newMode);
    } catch (error) {
      console.error('Error cambiando modo:', error);
    }
  };

  /**
   * Guardar información del usuario
   */
  const setUserInfo = async (id: string, name: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(USER_ID_KEY, id);
      await AsyncStorage.setItem(USER_NAME_KEY, name);
      setUserId(id);
      setUserName(name);
      console.log('✅ Usuario guardado:', name);
    } catch (error) {
      console.error('Error guardando usuario:', error);
    }
  };

  /**
   * Reset completo de la app (para testing o reinstalación)
   */
  const resetApp = async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([MODE_KEY, USER_ID_KEY, USER_NAME_KEY]);
      setModeState('initial');
      setUserId(null);
      setUserName(null);
      console.log('✅ App reseteada');
    } catch (error) {
      console.error('Error reseteando app:', error);
    }
  };

  const value: ModeContextType = {
    mode,
    isLoading,
    userId,
    userName,
    setMode,
    setUserInfo,
    resetApp,
  };

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};

/**
 * Hook para usar ModeContext
 */
export const useMode = (): ModeContextType => {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode debe usarse dentro de ModeProvider');
  }
  return context;
};
