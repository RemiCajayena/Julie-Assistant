import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * Componente de navegación inicial
 * Decide a qué pantalla redirigir según el estado de autenticación y modo
 */
export default function InitialNavigator() {
  const { isSetup, isAuthenticated, isLoading: authLoading } = useAuth();
  const { mode, isLoading: modeLoading } = useMode();

  // Mostrar loading mientras se cargan los contexts
  if (authLoading || modeLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Lógica de redirección:
  
  // 1. Primera vez: Configurar PIN del tutor
  if (!isSetup) {
    // @ts-ignore - Expo Router type issue with groups
    return <Redirect href="/(auth)/pin-setup" />;
  }

  // 2. Modo inicial: Seleccionar quién usa el dispositivo
  if (mode === 'initial') {
    return <Redirect href="/welcome" />;
  }

  // 3. Modo Elder: Ir a interfaz simplificada
  if (mode === 'elder') {
    // @ts-ignore - Expo Router type issue with groups
    return <Redirect href="/(elder)/home" />;
  }

  // 4. Modo Tutor: Verificar autenticación
  if (mode === 'tutor') {
    if (isAuthenticated) {
      // @ts-ignore - Expo Router type issue with groups
      return <Redirect href="/(tutor)/dashboard" />;
    } else {
      // @ts-ignore - Expo Router type issue with groups
      return <Redirect href="/(auth)/pin-login" />;
    }
  }

  // Fallback
  return <Redirect href="/welcome" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
