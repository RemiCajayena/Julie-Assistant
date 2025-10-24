import { API_URL } from '@/config/api';
import { useMode } from '@/contexts/ModeContext';
import { useMedications } from '@/hooks/useMedications';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Medication {
  id: number;
  name: string;
  dosage?: string;
  frequency: string;
  schedule?: string;
  active: number;
  isReminderEnabled?: boolean;
  enabledTimes?: { [key: number]: boolean };
}

/**
 * Pantalla de lista de medicamentos con CRUD completo
 */
export default function MedicationsScreen() {
  const router = useRouter();
  const { userId } = useMode();
  const medications = useMedications(userId || 'usuario123');
  
  const updateMedication = async (id: number, data: Partial<Medication>) => {
    try {
      // Actualizamos el estado local primero para una respuesta inmediata en la UI
      await medications.updateMedicationState(id, data);

      // Actualizamos los recordatorios en el servidor
      const times = data.schedule?.split(',') || [];
      const uid = userId || 'usuario123';

      for (let i = 0; i < times.length; i++) {
        const time = times[i].trim();
        const isEnabled = data.isReminderEnabled && (data.enabledTimes?.[i] ?? true);
        
        try {
          // Buscar recordatorios existentes
          const reminderResp = await axios.get(`${API_URL}/reminders/${uid}`, {
            params: { medication_id: id }
          });

          const reminder = reminderResp.data?.find((r: any) => r.reminder_time === time);

          if (reminder) {
            // Actualizar recordatorio existente
            await axios.put(`${API_URL}/reminders/${reminder.id}`, {
              active: isEnabled ? 1 : 0
            });
          } else {
            // Crear nuevo recordatorio si no existe
            await axios.post(`${API_URL}/reminders`, {
              userId: uid,
              medication_id: id,
              title: data.name + (data.dosage ? ` (${data.dosage})` : ''),
              description: `Frecuencia: ${data.frequency}`,
              reminder_time: time,
              days_of_week: [0,1,2,3,4,5,6],
              active: isEnabled ? 1 : 0
            });
          }
        } catch (reminderError) {
          console.warn(`Error con recordatorio para ${time}:`, reminderError);
        }
      }

      // Refrescar los datos desde el servidor
      medications.fetchMedications();

    } catch (error) {
      console.error('Error actualizando medicamento:', error);
      Alert.alert('Error', 'No se pudo actualizar el medicamento');
    }
  };
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);
  
  // Formulario
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [schedule, setSchedule] = useState('');
  const [scheduleSuggestion, setScheduleSuggestion] = useState('');

  // Recargar medicamentos al montar
  useEffect(() => {
    medications.fetchMedications();
  }, []);

  const resetForm = () => {
    setMedName('');
    setDosage('');
    setFrequency('');
    setSchedule('');
    setEditingMed(null);
  };

  const handleAddNew = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!medName.trim() || !frequency.trim()) {
      Alert.alert('Error', 'El nombre y frecuencia son obligatorios');
      return;
    }

    try {
      // 1. Obtener hora sugerida del servidor primero
      let suggestedSchedule = '';
      try {
        const f = frequency.trim();
        const s = (schedule || '').trim();
        const initial = s && !s.includes(',') ? s : '';
        
        console.log('🔄 Obteniendo sugerencia de horarios:', { frequency: f, initialTime: initial });
        const scheduleResp = await axios.get(`${API_URL}/calculate-schedule`, {
          params: { frequency: f, initialTime: initial }
        });
        
        if (scheduleResp.data?.schedule) {
          suggestedSchedule = scheduleResp.data.schedule;
          console.log('✅ Horarios sugeridos:', suggestedSchedule);
        }
      } catch (schedErr) {
        console.warn('⚠️ Error obteniendo sugerencia de horarios:', schedErr);
      }

      // 2. Crear el medicamento
      const newMed = await medications.createMedication({
        name: medName.trim(),
        dosage: dosage.trim() || undefined,
        frequency: frequency.trim(),
        schedule: schedule.trim() || suggestedSchedule || undefined,
      });
      console.log('📋 Medicamento creado:', newMed);

      // 3. Crear recordatorios para cada horario del medicamento
      try {
        const uid = (userId || 'usuario123');
        
        // Determinar horarios a usar (del input o sugeridos)
        const finalSchedule = (schedule || suggestedSchedule || '08:00').trim();
        const times = finalSchedule.split(',').map(time => time.trim());

        console.log('⏰ Creando recordatorios para horarios:', times);

        const createdReminders = [];
        
        // Crear un recordatorio por cada horario
        for (const time of times) {
          if (/^([0-1]?\d|2[0-3]):[0-5]\d$/.test(time)) {
            try {
              console.log(`⏰ Creando recordatorio para ${time}...`);
              const response = await axios.post(`${API_URL}/reminders`, {
                userId: uid,
                medication_id: newMed.id,
                title: dosage ? `${medName.trim()} (${dosage.trim()})` : medName.trim(),
                description: `Frecuencia: ${frequency.trim()}`,
                reminder_time: time,
                days_of_week: [0,1,2,3,4,5,6], // Array de números (0=Domingo, 6=Sábado)
                active: 1 // Activado por defecto
              });

              // La respuesta siempre debería ser exitosa si llegamos aquí
              createdReminders.push(time);
              console.log(`✅ Recordatorio creado para ${time}:`, response.data);
            } catch (err) {
              console.error(`❌ Error creando recordatorio para ${time}:`, err);
              // No lanzamos el error, solo lo registramos para continuar con el siguiente horario
            }
          } else {
            console.warn(`Formato de hora inválido: ${time}`);
          }
        }

        if (createdReminders.length > 0) {
          Alert.alert(
            'Éxito',
            `Medicamento agregado con recordatorios para: ${createdReminders.join(', ')}`,
            [
              {
                text: 'Ver Recordatorios',
                onPress: () => router.push('/reminders')
              },
              {
                text: 'OK',
                style: 'default'
              }
            ]
          );
        } else {
          Alert.alert('Aviso', 'Medicamento agregado pero no se pudieron crear los recordatorios');
        }

      } catch (remErr) {
        console.error('❌ Error creando recordatorios:', remErr);
        Alert.alert('Medicamento Agregado', 'El medicamento se guardó pero hubo un error al crear los recordatorios');
      }

      setShowAddModal(false);
      resetForm();
      medications.fetchMedications();
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el medicamento');
    }
  };


  useEffect(() => {
    let lastRequest = 0;
    const DEBOUNCE_TIME = 500; // ms

    const calc = async () => {
      try {
        setScheduleSuggestion('');
        const f = (frequency || '').trim();
        if (!f) return;
        
        const now = Date.now();
        if (now - lastRequest < DEBOUNCE_TIME) return;
        lastRequest = now;

        // Solo usar hora inicial si el campo schedule tiene una hora completa (HH:MM)
        const s = (schedule || '').trim();
        const isValidTime = /^([0-1]?\d|2[0-3]):[0-5]\d$/.test(s);
        const initial = isValidTime ? s : '';
        
        const resp = await axios.get(`${API_URL}/calculate-schedule`, {
          params: { frequency: f, initialTime: initial }
        });
        
        if (resp.data?.schedule) {
          setScheduleSuggestion(resp.data.schedule);
        }
      } catch (e) {
        console.warn('⚠️ Error calculando sugerencia:', e);
      }
    };
    calc();
  }, [frequency]);

  const handleDelete = (medId: number, medName: string) => {
    Alert.alert(
      'Confirmar',
      `¿Desactivar el medicamento "${medName}"?\nEsto también eliminará todos los recordatorios asociados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Primero buscamos todos los recordatorios asociados
              const uid = userId || 'usuario123';
              const remindersResp = await axios.get(`${API_URL}/reminders/search`, {
                params: {
                  userId: uid,
                  medicationId: medId
                }
              });

              // Eliminamos cada recordatorio
              if (remindersResp.data && remindersResp.data.length > 0) {
                for (const reminder of remindersResp.data) {
                  try {
                    await axios.delete(`${API_URL}/reminders/${reminder.id}`);
                  } catch (err) {
                    console.warn(`Error eliminando recordatorio ${reminder.id}:`, err);
                  }
                }
              }

              // Finalmente desactivamos el medicamento
              await medications.deleteMedication(medId);
              Alert.alert('Éxito', 'Medicamento y recordatorios desactivados');
              medications.fetchMedications();
            } catch (error) {
              console.error('Error en la desactivación:', error);
              Alert.alert('Error', 'No se pudo desactivar el medicamento y sus recordatorios');
            }
          },
        },
      ]
    );
  };

  const activeMedications = medications.medications.filter(m => m.active);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Medicamentos</Text>
        <TouchableOpacity onPress={handleAddNew}>
          <Text style={styles.addButton}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {medications.loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Cargando medicamentos...</Text>
          </View>
        ) : activeMedications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyText}>No hay medicamentos registrados</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddNew}>
              <Text style={styles.emptyButtonText}>Agregar primero</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeMedications.map((med) => (
            <View key={med.id} style={styles.medicationCard}>
              <View style={styles.medicationHeader}>
                <Text style={styles.medicationName}>💊 {med.name}</Text>
                <Text style={styles.medicationStatus}>✅ Activo</Text>
              </View>
              
              {med.dosage && (
                <Text style={styles.medicationDetail}>💊 Dosis: {med.dosage}</Text>
              )}
              
              <Text style={styles.medicationDetail}>📅 Frecuencia: {med.frequency}</Text>
              
      {med.schedule && (
        <View>
          <View style={styles.reminderHeader}>
            <Text style={styles.medicationDetailTitle}>⏰ Horarios programados:</Text>
            <Switch
              value={med.isReminderEnabled ?? true}
              onValueChange={(value) => {
                updateMedication(med.id, {
                  ...med,
                  isReminderEnabled: value,
                });
              }}
            />
          </View>
          <View style={[
            styles.scheduleList,
            !med.isReminderEnabled && styles.scheduleListDisabled
          ]}>
            {med.schedule.split(',').map((time, index) => {
              const isTimeEnabled = med.enabledTimes?.[index] ?? true;
              return (
                <View key={index} style={[
                  styles.scheduleItem,
                  !med.isReminderEnabled && styles.scheduleItemDisabled,
                  !isTimeEnabled && styles.scheduleItemDisabled
                ]}>
                  <Text style={[
                    styles.scheduleTime,
                    !med.isReminderEnabled && styles.scheduleTimeDisabled,
                    !isTimeEnabled && styles.scheduleTimeDisabled
                  ]}>{time.trim()}</Text>
                  {med.isReminderEnabled && (
                    <TouchableOpacity
                      onPress={() => {
                        const enabledTimes = { ...(med.enabledTimes || {}) };
                        enabledTimes[index] = !isTimeEnabled;
                        updateMedication(med.id, {
                          ...med,
                          enabledTimes,
                        });
                      }}
                      style={styles.toggleButton}
                    >
                      <View style={styles.toggleButton}>
                        <Text style={styles.toggleButtonText}>
                          {isTimeEnabled ? '🔔' : '🔕'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}              <View style={styles.medicationActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={() => handleDelete(med.id, med.name)}
                >
                  <Text style={[styles.actionText, styles.dangerText]}>Desactivar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal para agregar medicamento */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Medicamento</Text>

            <Text style={styles.label}>Nombre del medicamento *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Aspirina 500mg"
              value={medName}
              onChangeText={setMedName}
            />

            <Text style={styles.label}>Dosis</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 1 tableta"
              value={dosage}
              onChangeText={setDosage}
            />

            <Text style={styles.label}>Frecuencia *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Cada 8 horas"
              value={frequency}
              onChangeText={setFrequency}
            />

            <Text style={styles.label}>Horario inicial (opcional)</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={[styles.input, styles.inputWithButtonField]}
                placeholder="Ej: 08:00"
                value={schedule}
                onChangeText={setSchedule}
              />
              <TouchableOpacity 
                style={[
                  styles.calcButton,
                  !frequency && styles.calcButtonDisabled
                ]}
                onPress={() => {
                  if (scheduleSuggestion) {
                    setSchedule(scheduleSuggestion);
                  }
                }}
                disabled={!frequency}
              >
                <Text style={[
                  styles.calcButtonText,
                  !frequency && styles.calcButtonTextDisabled
                ]}>
                  Calcular
                </Text>
              </TouchableOpacity>
            </View>
            {!!scheduleSuggestion && (
              <View style={styles.suggestionContainer}>
                <Text style={styles.suggestionTitle}>Horarios sugeridos:</Text>
                <View style={styles.scheduleList}>
                  {scheduleSuggestion.split(',').map((time, index) => (
                    <View key={index} style={styles.scheduleItem}>
                      <Text style={styles.scheduleTime}>{time.trim()}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.suggestionHelp}>
                  Presiona "Calcular" para usar estos horarios
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleListDisabled: {
    opacity: 0.5,
  },
  scheduleItemDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  scheduleTimeDisabled: {
    color: '#999',
  },
  toggleButton: {
    marginLeft: 8,
    padding: 4,
  },
  toggleButtonText: {
    fontSize: 16,
    lineHeight: 20,
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWithButtonField: {
    flex: 1,
  },
  calcButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  calcButtonDisabled: {
    backgroundColor: '#ccc',
  },
  calcButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  calcButtonTextDisabled: {
    color: '#666',
  },
  suggestionContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  suggestionHelp: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  medicationDetailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 4,
  },
  scheduleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 8,
  },
  scheduleItem: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e1f0ff',
  },
  scheduleTime: {
    fontSize: 14,
    color: '#0056b3',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    fontSize: 16,
    color: '#2196F3',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  medicationCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  medicationStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  medicationDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  medicationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#FFEBEE',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dangerText: {
    color: '#F44336',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
