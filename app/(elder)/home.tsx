import { TextChat } from '@/components/elder/TextChat';
import { VoiceAssistant } from '@/components/elder/VoiceAssistant';
import { useMode } from '@/contexts/ModeContext';
import { useMedications } from '@/hooks/useMedications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Pantalla principal del adulto mayor
 * Interfaz simplificada solo con botón de voz
 */
export default function ElderHomeScreen() {
  const { userName: contextUserName, setMode } = useMode();
  const router = useRouter();
  const medications = useMedications('usuario123'); // TODO: Usar userId real
  const [displayName, setDisplayName] = useState(contextUserName || 'Usuario');
  const [useTextMode, setUseTextMode] = useState(false); // Modo texto para pruebas

  // Actualizar nombre cuando cambia en el contexto
  useEffect(() => {
    if (contextUserName) {
      setDisplayName(contextUserName);
      console.log('👤 Nombre actualizado:', contextUserName);
    }
  }, [contextUserName]);

  const handleBackToWelcome = () => {
    Alert.alert(
      'Cambiar Modo',
      '¿Quieres cambiar al modo Tutor?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, cambiar',
          onPress: async () => {
            await setMode('tutor');
            // @ts-ignore - Expo Router type issue
            router.replace('/(auth)/pin-login');
          },
        },
      ]
    );
  };

  /**
   * Manejar acciones de medicamentos detectadas por Julie
   */
  const handleMedicationAction = async (action: any) => {
    console.log('🏥 Acción de medicamento detectada:', action);

    try {
      switch (action.action) {
        case 'query':
          // Consultar lista de medicamentos
          console.log('📋 Consultando medicamentos...');
          if (medications.medications.length === 0) {
            return 'No tienes medicamentos registrados aún. ¿Te gustaría agregar alguno?';
          }
          
          const medicationList = medications.medications.map((med, index) => {
            const scheduleInfo = med.schedule ? ` a las ${med.schedule}` : '';
            return `${index + 1}. ${med.name}${med.dosage ? ` - ${med.dosage}` : ''}${scheduleInfo}`;
          }).join('\n');
          
          return `Estos son tus medicamentos registrados:\n\n${medicationList}\n\n¿Necesitas ayuda con alguno de ellos?`;

        case 'taken':
          // Registrar medicamento tomado
          // Buscar el medicamento por nombre
          const medication = medications.medications.find(
            (m) => m.name.toLowerCase() === action.medicationName.toLowerCase()
          );
          
          if (medication) {
            await medications.markMedicationTaken(medication.id, 'taken');
            console.log('✅ Medicamento registrado como tomado');
          } else {
            console.warn('⚠️ Medicamento no encontrado:', action.medicationName);
          }
          break;

        case 'missed':
          // Notificar medicamento olvidado
          const missedMed = medications.medications.find(
            (m) => m.name.toLowerCase() === action.medicationName.toLowerCase()
          );

          if (missedMed) {
            Alert.alert(
              'Medicamento Olvidado',
              `Has olvidado tomar ${action.medicationName}. ¿Quieres registrarlo ahora?`,
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Sí, tomarlo ahora',
                  onPress: async () => {
                    await medications.markMedicationTaken(missedMed.id, 'taken');
                  },
                },
              ]
            );
          }
          break;

        case 'request':
          // Solicitar registro de nuevo medicamento
          await medications.requestMedicationRegistration({
            medicationName: action.medicationName,
            dosage: action.dosage,
            frequency: action.frequency,
          });
          console.log('📋 Solicitud de medicamento enviada al tutor');
          break;

        case 'emergency':
          // Alerta de emergencia
          await medications.sendAlertToTutor(
            'emergency',
            action.message || 'El usuario ha solicitado ayuda urgente'
          );
          Alert.alert(
            '🚨 EMERGENCIA',
            'Se ha enviado una alerta a tu tutor. Mantén la calma.',
            [{ text: 'OK' }]
          );
          break;

        default:
          console.log('⚠️ Acción de medicamento no reconocida:', action.action);
      }
    } catch (error) {
      console.error('Error manejando acción de medicamento:', error);
      Alert.alert('Error', 'No pude procesar esa acción. Intenta de nuevo.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      
      <TouchableOpacity style={styles.backButton} onPress={handleBackToWelcome}>
        <Text style={styles.backButtonText}>⚙️</Text>
      </TouchableOpacity>

      
      <TouchableOpacity 
        style={styles.medicationsButton} 
        onPress={() => router.push('/(elder)/reminders')}
      >
        <Text style={styles.medicationsButtonText}>💊</Text>
      </TouchableOpacity>

      {/* Switch para alternar entre voz y texto (TEMPORAL - SOLO PRUEBAS) */}
      <View style={styles.modeSwitch}>
        <Text style={styles.modeSwitchLabel}>
          {useTextMode ? '💬 Texto' : '🎤 Voz'}
        </Text>
        <Switch
          value={useTextMode}
          onValueChange={setUseTextMode}
          trackColor={{ false: '#4CAF50', true: '#2196F3' }}
          thumbColor={useTextMode ? '#1976D2' : '#45a049'}
        />
      </View>


      {useTextMode ? (
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <Text style={styles.greeting}>¡Hola, {displayName}!</Text>
            <Text style={styles.subtitle}>Soy Julie, tu asistente personal</Text>
            <Text style={styles.testMode}>⚠️ Modo Prueba (Texto)</Text>
          </View>
          <TextChat
            userName={displayName}
            userId="usuario123"
            onMedicationAction={handleMedicationAction}
          />
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.greeting}>¡Hola, {displayName}!</Text>
            <Text style={styles.subtitle}>Soy Julie, tu asistente personal</Text>
          </View>
          <VoiceAssistant
            userName={displayName}
            userId="usuario123"
            onMedicationAction={handleMedicationAction}
          />
          <View style={styles.footerContainer}>
            <Text style={styles.footer}>
              💡 Toca el botón para hablar, vuelve a tocar para detener
            </Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  chatContainer: {
    flex: 1,
    marginTop: 100, // Espacio para los botones superiores
  },
  chatHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 24,
  },
  medicationsButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  medicationsButtonText: {
    fontSize: 28,
  },
  modeSwitch: {
    position: 'absolute',
    top: 120,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  modeSwitchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  testMode: {
    fontSize: 12,
    color: '#FF9800',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },

  footerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footer: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
