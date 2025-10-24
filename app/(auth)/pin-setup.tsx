import { PINInput } from '@/components/tutor/PINInput';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';


export default function PINSetupScreen() {
  const router = useRouter();
  const { setupPIN } = useAuth();
  const { userName } = useMode();
  const [step, setStep] = useState<'first' | 'confirm'>('first');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');

  const handleFirstPIN = (pin: string) => {
    setFirstPin(pin);
    setStep('confirm');
    setError('');
  };

  const handleConfirmPIN = async (pin: string) => {
    if (pin !== firstPin) {
      setError('Los PIN no coinciden');
      setStep('first');
      setFirstPin('');
      return;
    }

    // Configurar PIN
    const success = await setupPIN(pin);

    if (success) {
      Alert.alert(
        '✅ PIN Configurado',
        'Tu PIN ha sido guardado de forma segura',
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/(auth)/tutor-registration'),
          },
        ]
      );
    } else {
      setError('Error configurando PIN. Intenta nuevamente');
      setStep('first');
      setFirstPin('');
    }
  };

  const handleErrorClear = () => {
    setError('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>Configurar PIN de Tutor</Text>
        <Text style={styles.subtitle}>
          {userName
            ? `Protege el acceso a la configuración de ${userName}`
            : 'Protege el acceso a la configuración'}
        </Text>
      </View>

      <PINInput
        key={step} // Forzar remontaje cuando cambia el step
        length={4}
        title={step === 'first' ? 'Crea tu PIN (4 dígitos)' : 'Confirma tu PIN'}
        onComplete={step === 'first' ? handleFirstPIN : handleConfirmPIN}
        error={error}
        onErrorClear={handleErrorClear}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Recuerda tu PIN, lo necesitarás para acceder al modo tutor
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
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
