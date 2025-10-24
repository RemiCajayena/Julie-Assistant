import { PINInput } from '@/components/tutor/PINInput';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function PINLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { userName, setMode } = useMode();
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handlePINComplete = async (pin: string) => {
    const success = await login(pin);

    if (success) {
      setError('');

      // @ts-ignore - Expo Router type issue
      router.replace('/(tutor)/dashboard');
    } else {
      setAttempts((prev) => prev + 1);
      setError('PIN incorrecto');

      if (attempts >= 2) {
        setError('Demasiados intentos. Vuelve a intentar más tarde');
      }
    }
  };

  const handleErrorClear = () => {
    setError('');
  };

  const handleBackToElderMode = async () => {
    await setMode('elder');
    // @ts-ignore - Expo Router type issue
    router.replace('/(elder)/home');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>👨‍💼</Text>
        <Text style={styles.title}>Acceso de Tutor</Text>
        <Text style={styles.subtitle}>
          {userName
            ? `Modo de configuración para ${userName}`
            : 'Modo de configuración'}
        </Text>
      </View>

      <PINInput
        length={4}
        title="Ingresa tu PIN"
        onComplete={handlePINComplete}
        error={error}
        onErrorClear={handleErrorClear}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToElderMode}
        >
          <Text style={styles.backButtonText}>← Volver al modo usuario</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          💡 Si olvidaste tu PIN, contacta al soporte técnico
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 30,
    alignItems: 'center',
    gap: 20,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
