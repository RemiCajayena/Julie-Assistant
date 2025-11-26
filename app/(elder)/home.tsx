import { SimpleMicButton, SimpleMicButtonRef } from '@/components/SimpleMicButton';
import { useMode } from '@/contexts/ModeContext';
import { useVoiceActivation } from '@/hooks/useVoiceActivation';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Pantalla principal del adulto mayor - SUPER SIMPLIFICADA
 * Solo micrófono grande, sin chat ni navegación
 */
export default function ElderHomeScreen() {
  const { userName: contextUserName, userId, setMode } = useMode();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(contextUserName || 'Usuario');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastResponse, setLastResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const micButtonRef = useRef<SimpleMicButtonRef>(null);

  // Mostrar userId en logs para debugging de notificaciones
  useEffect(() => {
    console.log('\n🆔 [ElderHome] userId actual:', userId || 'NO DEFINIDO');
    if (!userId) {
      console.warn('⚠️ [ElderHome] NO HAY userId - Las notificaciones NO funcionarán');
      console.warn('   El userId se establece en welcome.tsx como "usuario123"');
    }
  }, [userId]);

  // Mostrar userId en logs para debugging de notificaciones
  useEffect(() => {
    console.log('\n🆔 [ElderHome] userId actual:', userId || 'NO DEFINIDO');
    if (!userId) {
      console.warn('⚠️ [ElderHome] NO HAY userId - Las notificaciones NO funcionarán');
      console.warn('   El userId se establece en welcome.tsx como "usuario123"');
    }
  }, [userId]);

  // Activación por voz - TEMPORALMENTE DESACTIVADA (causa crash)
  // TODO: Investigar inicialización correcta de @react-native-voice/voice
  const { isListening, lastHeard } = useVoiceActivation({
    enabled: false, // Desactivado temporalmente por problemas de inicialización
    phrases: ['hey julie', 'hola julie', 'oye julie'],
    onActivated: () => {
      console.log('🎤 Activación por voz detectada');
      // Activar el micrófono automáticamente
      if (micButtonRef.current) {
        // El SimpleMicButton manejará la grabación
        setLastResponse('¡Escuchando! Dime qué necesitas...');
      }
    },
  });

  // Actualizar nombre cuando cambia en el contexto
  useEffect(() => {
    if (contextUserName) {
      setDisplayName(contextUserName);
    }
  }, [contextUserName]);

  // Actualizar reloj cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Obtener saludo según hora del día
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '☀️ Buenos días';
    if (hour < 19) return '🌤️ Buenas tardes';
    return '🌙 Buenas noches';
  };

  // Formatear hora
  const getFormattedTime = () => {
    return currentTime.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Manejar respuesta del micrófono
  const handleResponse = (userText: string, aiResponse: string) => {
    console.log('🎤 Usuario dijo:', userText);
    console.log('💬 Julie respondió:', aiResponse);
    setLastResponse(aiResponse);
    setIsProcessing(false);
  };

  // Detener a Julie si está hablando
  const stopSpeaking = async () => {
    if (micButtonRef.current) {
      await micButtonRef.current.stopAudio();
    }
    setIsSpeaking(false);
  };

  // Manejar errores
  const handleError = (error: string) => {
    console.error('❌ Error:', error);
    Alert.alert('Error', error);
    setIsProcessing(false);
  };

  // Cambiar a modo tutor
  const switchToTutorMode = () => {
    Alert.alert(
      'Cambiar a Modo Tutor',
      '¿Quieres cambiar a la interfaz de tutor?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, cambiar',
          onPress: async () => {
            await setMode('tutor');
            router.replace('/(auth)/pin-login');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.background}>
        {/* Botones superiores */}
        <View style={styles.topButtonsContainer}>
          {/* Botón para cambiar a modo tutor */}
          <TouchableOpacity 
            style={styles.tutorButton}
            onPress={switchToTutorMode}
            activeOpacity={0.7}
          >
            <Text style={styles.tutorButtonText}>👨‍💼 Tutor</Text>
          </TouchableOpacity>

          {/* Botón de configuración */}
          <TouchableOpacity 
            style={styles.smallSettingsButton}
            onPress={() => router.push('/(elder)/reminders')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Contenido principal */}
        <View style={styles.content}>
          {/* Reloj y saludo */}
          <View style={styles.timeContainer}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.time}>{getFormattedTime()}</Text>
          </View>

          {/* Última respuesta de Julie (con scroll para textos largos) */}
          {lastResponse && !isProcessing && (
            <ScrollView 
              style={styles.responseContainer}
              contentContainerStyle={styles.responseContent}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}
            >
              <Text style={styles.responseIcon}>💬</Text>
              <Text style={styles.responseText}>{lastResponse}</Text>
            </ScrollView>
          )}

          {/* Estado de carga */}
          {isProcessing && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>🤔 Pensando...</Text>
            </View>
          )}

          {/* Botón de micrófono GRANDE centrado */}
          <View style={styles.micContainer}>
            <SimpleMicButton 
              ref={micButtonRef}
              userId={userId || 'usuario123'}
              onResponse={handleResponse}
              onError={handleError}
              onSpeakingChange={setIsSpeaking}
              size="large"
            />
          </View>

          {/* Botón para detener a Julie */}
          {isSpeaking && (
            <TouchableOpacity 
              style={styles.stopButton}
              onPress={stopSpeaking}
              activeOpacity={0.8}
            >
              <Text style={styles.stopButtonText}>⏹ Detener</Text>
            </TouchableOpacity>
          )}

          {/* Instrucción simple */}
          <View style={styles.instructionCard}>
            <Text style={styles.instructionText}>
              Presiona el micrófono y dime{'\n'}
              lo que necesites
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: '#E8F5E9', // Verde suave de fondo
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },

  // Contenedor de botones superiores
  topButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  // Botón para cambiar a modo tutor
  tutorButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tutorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Reloj y saludo
  timeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  time: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
  },

  // Respuesta de Julie
  responseContainer: {
    maxHeight: 400, // Altura máxima aumentada para scroll
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    marginVertical: 16,
  },
  responseContent: {
    paddingBottom: 8,
  },
  responseIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  responseText: {
    fontSize: 20,
    color: '#333',
    lineHeight: 28,
  },

  // Cargando
  loadingContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    color: '#FF9800',
    fontWeight: '600',
  },

  // Contenedor del micrófono
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },

  // Botón para detener a Julie
  stopButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginTop: 16,
  },
  stopButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Tarjeta de instrucciones
  instructionCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  instructionText: {
    fontSize: 20,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 28,
  },

  // Botón de configuración (ahora posicionado en el header)
  smallSettingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  // Botón de configuración (legacy - mantener por compatibilidad)
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  settingsIcon: {
    fontSize: 24,
  },
});
