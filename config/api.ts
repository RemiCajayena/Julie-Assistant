/**
 * Configuración de API para diferentes entornos
 * 
 * IMPORTANTE: 
 * - Emulador Android: usa 10.0.2.2
 * - iOS Simulator: usa localhost
 * - Dispositivo físico: usa la IP de tu computadora en la red local
 */

// Detectar plataforma
import { Platform } from 'react-native';

/**
 * Obtener la URL base del servidor según la plataforma
 */
export const getServerUrl = (): string => {
  // Para desarrollo
  const SERVER_PORT = 3000;
  
  // IP de tu PC en la red local (obtenida de los logs del servidor)
  // CAMBIA ESTA IP si tu computadora cambia de red
  const LOCAL_NETWORK_IP = '192.168.1.207';
  
  if (__DEV__) {
    // Modo desarrollo
    if (Platform.OS === 'android') {
      // Intentar en este orden:
      // 1. IP de red local (más confiable sin adb)
      // 2. Si falla, probar con 10.0.2.2 (emulador estándar)
      return `http://${LOCAL_NETWORK_IP}:${SERVER_PORT}`;
    } else if (Platform.OS === 'ios') {
      // iOS Simulator puede usar localhost
      return `http://localhost:${SERVER_PORT}`;
    } else {
      // Web o desconocido
      return `http://localhost:${SERVER_PORT}`;
    }
  } else {
    // Producción: usar URL real del servidor
    return 'https://tu-servidor-produccion.com';
  }
};

// Exportar URL por defecto
export const API_URL = getServerUrl();

// Función de fallback para intentar diferentes URLs
export const getAlternativeUrls = (): string[] => {
  const SERVER_PORT = 3000;
  return [
    `http://192.168.1.207:${SERVER_PORT}`, // IP de red local
    `http://10.0.2.2:${SERVER_PORT}`,      // Emulador Android estándar
    `http://localhost:${SERVER_PORT}`,     // Con adb reverse
  ];
};

// Para debugging
console.log('🌐 Server URL configurada:', API_URL);
