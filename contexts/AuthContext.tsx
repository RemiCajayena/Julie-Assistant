import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as SecureStore from 'expo-secure-store'; // Comentado temporalmente - requiere rebuild
import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * AuthContext - Manejo de autenticación con PIN
 * 
 * Funcionalidades:
 * - Setup inicial de PIN (primera vez)
 * - Login con PIN (tutor)
 * - Verificación de PIN
 * - Cambio de PIN
 * - Logout
 */

interface AuthContextType {
  // Estado
  isSetup: boolean;          // ¿Ya se configuró el PIN?
  isAuthenticated: boolean;  // ¿El tutor está autenticado?
  isLoading: boolean;        // ¿Cargando estado inicial?
  
  // Acciones
  setupPIN: (pin: string) => Promise<boolean>;
  login: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changePIN: (oldPin: string, newPin: string) => Promise<boolean>;
  verifyPIN: (pin: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PIN_KEY = 'tutor_pin';
const SETUP_KEY = 'pin_setup_complete';
const SESSION_KEY = 'tutor_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSetup, setIsSetup] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Inicializar: Verificar si ya hay PIN configurado y si hay sesión activa
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Verificar si ya se configuró el PIN
      const setupComplete = await AsyncStorage.getItem(SETUP_KEY);
      setIsSetup(setupComplete === 'true');

      // Verificar si hay sesión activa (opcional: auto-login)
      const session = await AsyncStorage.getItem(SESSION_KEY);
      if (session === 'active') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error inicializando auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Configurar PIN por primera vez
   */
  const setupPIN = async (pin: string): Promise<boolean> => {
    try {
      // Validar PIN
      if (!validatePIN(pin)) {
        console.error('PIN inválido: debe ser 4-6 dígitos');
        return false;
      }

      // Guardar PIN de forma segura (temporalmente con AsyncStorage)
      // TODO: Cambiar a SecureStore después del rebuild
      await AsyncStorage.setItem(PIN_KEY, pin);
      
      // Marcar como configurado
      await AsyncStorage.setItem(SETUP_KEY, 'true');
      
      // Autenticar automáticamente después del setup
      await AsyncStorage.setItem(SESSION_KEY, 'active');
      
      setIsSetup(true);
      setIsAuthenticated(true);
      
      console.log('✅ PIN configurado exitosamente');
      return true;
    } catch (error) {
      console.error('Error configurando PIN:', error);
      return false;
    }
  };

  /**
   * Login con PIN
   */
  const login = async (pin: string): Promise<boolean> => {
    try {
      const isValid = await verifyPIN(pin);
      
      if (isValid) {
        await AsyncStorage.setItem(SESSION_KEY, 'active');
        setIsAuthenticated(true);
        console.log('✅ Login exitoso');
        return true;
      } else {
        console.log('❌ PIN incorrecto');
        return false;
      }
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  };

  /**
   * Logout (cerrar sesión del tutor)
   */
  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(SESSION_KEY, 'inactive');
      setIsAuthenticated(false);
      console.log('✅ Logout exitoso');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  /**
   * Cambiar PIN
   */
  const changePIN = async (oldPin: string, newPin: string): Promise<boolean> => {
    try {
      // Verificar PIN actual
      const isValid = await verifyPIN(oldPin);
      if (!isValid) {
        console.log('❌ PIN actual incorrecto');
        return false;
      }

      // Validar nuevo PIN
      if (!validatePIN(newPin)) {
        console.error('PIN nuevo inválido: debe ser 4-6 dígitos');
        return false;
      }

      // Guardar nuevo PIN (temporalmente con AsyncStorage)
      // TODO: Cambiar a SecureStore después del rebuild
      await AsyncStorage.setItem(PIN_KEY, newPin);
      console.log('✅ PIN cambiado exitosamente');
      return true;
    } catch (error) {
      console.error('Error cambiando PIN:', error);
      return false;
    }
  };

  /**
   * Verificar si un PIN es correcto
   */
  const verifyPIN = async (pin: string): Promise<boolean> => {
    try {
      // Temporalmente con AsyncStorage
      // TODO: Cambiar a SecureStore después del rebuild
      const storedPin = await AsyncStorage.getItem(PIN_KEY);
      return storedPin === pin;
    } catch (error) {
      console.error('Error verificando PIN:', error);
      return false;
    }
  };

  /**
   * Validar formato de PIN
   */
  const validatePIN = (pin: string): boolean => {
    return /^\d{4,6}$/.test(pin);
  };

  const value: AuthContextType = {
    isSetup,
    isAuthenticated,
    isLoading,
    setupPIN,
    login,
    logout,
    changePIN,
    verifyPIN,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook para usar AuthContext
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
