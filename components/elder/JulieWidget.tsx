/**
 * Julie Widget - Interfaz siempre activa para adultos mayores
 * 
 * El adulto mayor NO debe navegar por la app. Este widget:
 * - Está siempre visible y accesible
 * - Se activa con un simple toque
 * - Escucha y responde de forma natural
 * - Muestra información relevante sin navegación
 */

import { VoiceAssistant } from '@/components/elder/VoiceAssistant';
import { useVoiceActivation } from '@/hooks/useVoiceActivation';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface JulieWidgetProps {
  userName: string;
  userId: string;
  enableVoiceActivation?: boolean; // Nueva prop
}

export interface JulieWidgetHandle {
  activateJulie: () => void;
}

export const JulieWidget = forwardRef<JulieWidgetHandle, JulieWidgetProps>(
  ({ userName, userId, enableVoiceActivation = false }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMedicationsList, setShowMedicationsList] = useState(false);
  

  const [medications, setMedications] = useState<any>({ medications: [] });
  
  // Animación de pulso para el botón
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Activación por voz 
  const { isListening, lastHeard } = useVoiceActivation({
    enabled: enableVoiceActivation && !isExpanded,
    onActivated: () => {
      console.log('🎤 ¡Julie activada por voz!');
      setIsExpanded(true);
    },
    phrases: ['hey julie', 'julie', 'hola julie', 'oye julie', 'ei julie']
  });

  // Exponer método para activar Julie desde el widget nativo
  useImperativeHandle(ref, () => ({
    activateJulie: () => {
      console.log('🎤 Activando Julie desde widget nativo');
      setIsExpanded(true);
    }
  }));

  // Animación de pulso continua
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    if (!isExpanded) {
      pulse.start();
    } else {
      pulse.stop();
      pulseAnim.setValue(1);
    }

    return () => pulse.stop();
  }, [isExpanded]);

  /**
   * Manejar acciones de medicamentos detectadas por Julie
   */
  const handleMedicationAction = async (action: any) => {
    console.log('🏥 Acción de medicamento:', action);

    try {
      switch (action.action) {
        case 'query':
          // Mostrar lista de medicamentos
          setShowMedicationsList(true);
          
          if (medications.medications.length === 0) {
            return 'No tienes medicamentos registrados todavía. Habla con tu familiar para agregarlos.';
          }
          
          const medicationList = medications.medications
            .filter(med => med.active)
            .map((med, index) => {
              const scheduleInfo = med.schedule ? ` - ${med.schedule}` : '';
              return `${med.name}${med.dosage ? ` ${med.dosage}` : ''}${scheduleInfo}`;
            })
            .join('\n');
          
          return `Estos son tus medicamentos:\n${medicationList}`;

        case 'taken':
          // Registrar medicamento tomado
          const medication = medications.medications.find(
            (m) => m.name.toLowerCase().includes(action.medicationName.toLowerCase())
          );
          
          if (medication) {
            await medications.markMedicationTaken(medication.id, 'taken');
            console.log('✅ Medicamento registrado:', medication.name);
          }
          break;

        case 'emergency':
          // Alerta de emergencia
          await medications.sendAlertToTutor(
            'emergency',
            action.message || 'Solicitud de ayuda urgente'
          );
          
          Alert.alert(
            '🚨 Alerta Enviada',
            'Tu familiar fue notificado. Mantén la calma, pronto te ayudarán.',
            [{ text: 'Entendido' }]
          );
          break;

        default:
          console.log('⚠️ Acción no reconocida:', action.action);
      }
    } catch (error) {
      console.error('❌ Error en acción de medicamento:', error);
    }
  };

  return (
    <>
      {/* Widget compacto (siempre visible) */}
      {!isExpanded && (
        <View style={styles.compactWidget}>
          {/* Indicador de escucha activa */}
          {isListening && (
            <View style={styles.listeningIndicator}>
              <Text style={styles.listeningText}>👂 Escuchando...</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.julieButton}
            onPress={() => setIsExpanded(true)}
            activeOpacity={0.8}
          >
            <View style={styles.julieAvatar}>
              <Ionicons name="person-circle" size={60} color="#FFFFFF" />
            </View>
            <Animated.View 
              style={[
                styles.juliePulse,
                { transform: [{ scale: pulseAnim }] }
              ]} 
            />
            <Text style={styles.julieLabel}>
              {isListening ? 'Di "Hey Julie"' : 'Habla con Julie'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Widget expandido (pantalla completa para conversación) */}
      <Modal
        visible={isExpanded}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.expandedWidget}>
          {/* Header simple */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="person-circle" size={40} color="#4CAF50" />
              <View>
                <Text style={styles.headerTitle}>Julie</Text>
                <Text style={styles.headerSubtitle}>Tu asistente personal</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsExpanded(false)}
            >
              <Ionicons name="close-circle" size={36} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Lista de medicamentos de hoy (si está visible) */}
          {showMedicationsList && (
            <View style={styles.medicationsPanel}>
              <Text style={styles.medicationsTitle}>
                💊 Medicamentos de Hoy
              </Text>
              {medications.medications.filter(m => m.active).map((med, index) => (
                <View key={med.id} style={styles.medicationItem}>
                  <Text style={styles.medicationName}>
                    {index + 1}. {med.name}
                  </Text>
                  {med.dosage && (
                    <Text style={styles.medicationDosage}>{med.dosage}</Text>
                  )}
                  {med.schedule && (
                    <Text style={styles.medicationSchedule}>
                      🕐 {med.schedule}
                    </Text>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={styles.closePanelButton}
                onPress={() => setShowMedicationsList(false)}
              >
                <Text style={styles.closePanelText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Asistente de voz (componente principal) - CON MULTI-TURNO */}
          <View style={styles.voiceContainer}>
            <VoiceAssistant
              userName={userName}
              userId={userId}
              onMedicationAction={handleMedicationAction}
              enableMultiTurn={true} // Habilitar conversación multi-turno
              maxTurns={3} // Máximo 3 turnos automáticos
            />
          </View>

          {/* Instrucciones simples */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              💬 Toca el micrófono y dime lo que necesites
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
});

JulieWidget.displayName = 'JulieWidget';

const styles = StyleSheet.create({
  // Widget compacto (botón flotante)
  compactWidget: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    zIndex: 1000,
  },
  julieButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  julieAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  juliePulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    opacity: 0.3,
  },
  listeningIndicator: {
    position: 'absolute',
    top: -40,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  listeningText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  julieLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Widget expandido (pantalla completa)
  expandedWidget: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 4,
  },

  // Panel de medicamentos
  medicationsPanel: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  medicationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  medicationItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  medicationDosage: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  medicationSchedule: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  closePanelButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  closePanelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },

  // Contenedor del asistente de voz
  voiceContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Instrucciones en la parte inferior
  instructions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  instructionsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
