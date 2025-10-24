import AsyncStorage from '@react-native-async-storage/async-storage';

export const resetApp = async (): Promise<void> => {
  try {
    const keys = [
      'pin_setup_complete',
      'tutor_pin',
      'tutor_session',
      'app_mode',
      'user_id',
      'user_name',
    ];

    await AsyncStorage.multiRemove(keys);
    console.log('✅ App reseteada completamente');
    console.log('🔄 Recarga la app para empezar desde cero');
  } catch (error) {
    console.error('❌ Error reseteando app:', error);
  }
};

/**
 * Ver todos los datos guardados en AsyncStorage
 */
export const debugStorage = async (): Promise<void> => {
  try {
    const keys = [
      'pin_setup_complete',
      'tutor_pin',
      'tutor_session',
      'app_mode',
      'user_id',
      'user_name',
    ];

    console.log('📊 Estado de AsyncStorage:');
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`  ${key}: ${value}`);
    }
  } catch (error) {
    console.error('❌ Error leyendo storage:', error);
  }
};

/**
 * Simular logout y volver a modo elder
 */
export const quickLogout = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem('tutor_session', 'inactive');
    await AsyncStorage.setItem('app_mode', 'elder');
    console.log('✅ Logout simulado');
    console.log('🔄 Recarga la app');
  } catch (error) {
    console.error('❌ Error en logout:', error);
  }
};

/**
 * Cambiar PIN directamente (para testing)
 */
export const changePINDev = async (newPin: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('tutor_pin', newPin);
    console.log(`✅ PIN cambiado a: ${newPin}`);
  } catch (error) {
    console.error('❌ Error cambiando PIN:', error);
  }
};
