import { useNotificationContext } from '@/components/NotificationProvider';
import { TimePickerList } from '@/components/TimePickerList';
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
  const { syncLocalReminders } = useNotificationContext();
  
  const updateMedication = async (id: number, data: Partial<Medication>) => {
    try {
      if (data.schedule) {
        const times = data.schedule.split(',').map(t => t.trim());
        const uid = userId || 'usuario123';

        // Obtener TODOS los recordatorios del usuario UNA SOLA VEZ
        const reminderResp = await axios.get(`${API_URL}/reminders/${uid}`);
        const allReminders = reminderResp.data?.reminders || [];
        
        // Filtrar solo los recordatorios de este medicamento
        const medReminders = allReminders.filter((r: any) => r.medication_id === id);

        // Actualizar cada recordatorio según el estado - ESPERAR A QUE TODOS TERMINEN
        const updatePromises = [];
        for (let i = 0; i < times.length; i++) {
          const time = times[i];
          const isEnabled = data.isReminderEnabled !== undefined 
            ? (data.isReminderEnabled && (data.enabledTimes?.[i] ?? true))
            : (data.enabledTimes?.[i] ?? true);
          
          // Buscar el recordatorio correspondiente a este horario
          const reminder = medReminders.find((r: any) => r.reminder_time === time);

          if (reminder) {
            // Solo actualizar si el estado cambió
            if ((reminder.active === 1) !== isEnabled) {
              updatePromises.push(
                axios.put(`${API_URL}/reminders/${reminder.id}`, {
                  active: isEnabled ? 1 : 0
                }).catch(err => {
                  console.warn(`Error actualizando recordatorio ${time}:`, err);
                  throw err; // Re-lanzar para saber si falló
                })
              );
            }
          }
        }

        // ESPERAR a que TODAS las actualizaciones terminen
        await Promise.all(updatePromises);
      }

      // DESPUÉS de que todo esté actualizado en BD, actualizar estado local
      await medications.updateMedicationState(id, data);

    } catch (error) {
      console.error('Error actualizando medicamento:', error);
      Alert.alert('Error', 'No se pudo actualizar el medicamento');
      // Recargar desde servidor si hubo error
      await medications.fetchMedications();
    }
  };
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);
  
  // Formulario
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);

  // Recargar medicamentos al montar
  useEffect(() => {
    medications.fetchMedications();
  }, []);

  const resetForm = () => {
    setMedName('');
    setDosage('');
    setFrequency('');
    setSelectedTimes([]);
    setSuggestedTimes([]);
    setEditingMed(null);
  };

  const handleAddNew = () => {
    resetForm();
    setShowAddModal(true);
  };

  const testNotification = async () => {
    try {
      const uid = userId || 'usuario123';
      const currentTime = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      console.log(`🧪 Enviando notificación de prueba a ${API_URL}/test-notification`);
      
      // Ejemplos de personalización:
      const notificationOptions = {
        userId: uid,
        title: '💊 Recordatorio de Medicamento',
        body: `Es hora de tomar tu medicamento (${currentTime})`,
        // imageUrl: 'https://example.com/pill.png', // Imagen grande
        color: '#4CAF50', // Color verde para medicamentos
        sound: 'default', // 'default' o nombre de sonido personalizado
        priority: 'high', // 'high', 'normal', 'low'
        // vibrate: [300, 200, 300], // Patrón de vibración en ms
        badge: 1, // Número en el icono de la app
        data: {
          screen: 'medications', // Para navegar a pantalla específica
          medicationId: '123',
        }
      };
      
      const response = await axios.post(`${API_URL}/test-notification`, notificationOptions);

      console.log('✅ Respuesta del servidor:', response.data);

      Alert.alert(
        'Notificación Enviada', 
        'Deberías recibir una notificación push personalizada en unos segundos',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ Error enviando notificación de prueba:', error);
      console.error('   Response:', error.response?.data);
      console.error('   Status:', error.response?.status);
      
      const errorMsg = error.response?.data?.error 
        || error.message 
        || 'Error desconocido';
      
      Alert.alert(
        'Error', 
        `No se pudo enviar la notificación de prueba:\n${errorMsg}\n\n¿El servidor está corriendo?`
      );
    }
  };

  const handleSave = async () => {
    if (!medName.trim() || !frequency.trim()) {
      Alert.alert('Error', 'El nombre y frecuencia son obligatorios');
      return;
    }

    if (selectedTimes.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un horario para los recordatorios');
      return;
    }

    try {
      // 1. Convertir array de horarios a string para el servidor
      const scheduleString = selectedTimes.join(', ');

      let medId: number;
      let isEditing = false;

      // 2. Crear o actualizar el medicamento
      if (editingMed) {
        // Modo edición
        isEditing = true;
        medId = editingMed.id;
        await medications.updateMedicationState(medId, {
          name: medName.trim(),
          dosage: dosage.trim() || undefined,
          frequency: frequency.trim(),
          schedule: scheduleString,
        });
        console.log('📝 Medicamento actualizado:', medId);
      } else {
        // Modo creación
        const newMed = await medications.createMedication({
          name: medName.trim(),
          dosage: dosage.trim() || undefined,
          frequency: frequency.trim(),
          schedule: scheduleString,
        });
        medId = newMed.id;
        console.log('📋 Medicamento creado:', newMed);
      }

      // 3. Sincronizar recordatorios para cada horario del medicamento
      try {
        const uid = (userId || 'usuario123');
        
        console.log('⏰ Sincronizando recordatorios para horarios:', selectedTimes);

        const createdReminders = [];
        
        // Obtener recordatorios existentes del medicamento
        const existingResp = await axios.get(`${API_URL}/reminders/${uid}`);
        const existingReminders = (existingResp.data?.reminders || []).filter(
          (r: any) => r.medication_id === medId
        );

        // Crear/actualizar recordatorios para cada horario
        for (const time of selectedTimes) {
          if (/^([0-1]?\d|2[0-3]):[0-5]\d$/.test(time)) {
            try {
              // Buscar si ya existe un recordatorio para este horario
              const existing = existingReminders.find((r: any) => r.reminder_time === time);

              if (existing) {
                // Actualizar recordatorio existente
                console.log(`⏰ Actualizando recordatorio para ${time}...`);
                await axios.put(`${API_URL}/reminders/${existing.id}`, {
                  title: dosage ? `${medName.trim()} (${dosage.trim()})` : medName.trim(),
                  description: `Frecuencia: ${frequency.trim()}`,
                  active: 1
                });
              } else {
                // Crear nuevo recordatorio
                console.log(`⏰ Creando recordatorio para ${time}...`);
                await axios.post(`${API_URL}/reminders`, {
                  userId: uid,
                  medication_id: medId,
                title: dosage ? `${medName.trim()} (${dosage.trim()})` : medName.trim(),
                description: `Frecuencia: ${frequency.trim()}`,
                reminder_time: time,
                  days_of_week: [0,1,2,3,4,5,6],
                  active: 1
                });
              }

              createdReminders.push(time);
              console.log(`✅ Recordatorio ${existing ? 'actualizado' : 'creado'} para ${time}`);
            } catch (err) {
              console.error(`❌ Error con recordatorio para ${time}:`, err);
            }
          } else {
            console.warn(`Formato de hora inválido: ${time}`);
          }
        }

        // Eliminar recordatorios que ya no están en la lista
        for (const existing of existingReminders) {
          if (!selectedTimes.includes(existing.reminder_time)) {
            try {
              await axios.delete(`${API_URL}/reminders/${existing.id}`);
              console.log(`🗑️ Recordatorio eliminado: ${existing.reminder_time}`);
            } catch (err) {
              console.error('Error eliminando recordatorio:', err);
            }
          }
        }

        if (createdReminders.length > 0) {
          // Sincronizar notificaciones locales después de guardar
          await syncLocalReminders();
          
          Alert.alert(
            'Éxito',
            `Medicamento ${isEditing ? 'actualizado' : 'agregado'} con recordatorios para: ${createdReminders.join(', ')}`,
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
          Alert.alert('Aviso', `Medicamento ${isEditing ? 'actualizado' : 'agregado'} pero no se pudieron crear los recordatorios`);
        }

      } catch (remErr) {
        console.error('❌ Error sincronizando recordatorios:', remErr);
        Alert.alert('Medicamento Guardado', 'El medicamento se guardó pero hubo un error al sincronizar los recordatorios');
      }

      setShowAddModal(false);
      resetForm();
      medications.fetchMedications();
    } catch (error) {
      console.error('Error guardando medicamento:', error);
      Alert.alert('Error', `No se pudo ${editingMed ? 'actualizar' : 'agregar'} el medicamento`);
    }
  };


  useEffect(() => {
    let lastRequest = 0;
    const DEBOUNCE_TIME = 500; // ms

    const calc = async () => {
      try {
        setSuggestedTimes([]);
        const f = (frequency || '').trim();
        if (!f) return;
        
        const now = Date.now();
        if (now - lastRequest < DEBOUNCE_TIME) return;
        lastRequest = now;

        // Usar la primera hora seleccionada como inicial, o vacío
        const initial = selectedTimes.length > 0 ? selectedTimes[0] : '';
        
        const resp = await axios.get(`${API_URL}/calculate-schedule`, {
          params: { frequency: f, initialTime: initial }
        });
        
        if (resp.data?.schedule) {
          const times = resp.data.schedule.split(',').map((t: string) => t.trim());
          setSuggestedTimes(times);
        }
      } catch (e) {
        console.warn('⚠️ Error calculando sugerencia:', e);
      }
    };
    calc();
  }, [frequency, selectedTimes]);

  const handleDelete = (medId: number, medName: string) => {
    Alert.alert(
      'Confirmar Eliminación',
      `¿Eliminar permanentemente el medicamento "${medName}"?\n\nEsto eliminará:\n• El medicamento de la base de datos\n• Todos los recordatorios asociados\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const uid = userId || 'usuario123';
              
              // 1. Eliminar todos los recordatorios asociados primero
              const remindersResp = await axios.get(`${API_URL}/reminders/${uid}`);
              const allReminders = remindersResp.data?.reminders || [];
              const medReminders = allReminders.filter((r: any) => r.medication_id === medId);

              for (const reminder of medReminders) {
                try {
                  await axios.delete(`${API_URL}/reminders/${reminder.id}`);
                  console.log(`🗑️ Recordatorio eliminado: ${reminder.id}`);
                } catch (err) {
                  console.warn(`Error eliminando recordatorio ${reminder.id}:`, err);
                }
              }

              // Finalmente eliminamos el medicamento de la base de datos (DELETE, no desactivar)
              await axios.delete(`${API_URL}/medications/${medId}`);
              console.log(`🗑️ Medicamento eliminado: ${medId}`);
              
              // Sincronizar notificaciones locales después de eliminar
              await syncLocalReminders();
              
              Alert.alert('Éxito', 'Medicamento y recordatorios eliminados permanentemente');
              medications.fetchMedications();
            } catch (error) {
              console.error('Error en la eliminación:', error);
              Alert.alert('Error', 'No se pudo eliminar el medicamento y sus recordatorios');
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
            <Text style={styles.emptyEmoji}>{'💊'}</Text>
            <Text style={styles.emptyText}>{'No hay medicamentos registrados'}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddNew}>
              <Text style={styles.emptyButtonText}>{'Agregar primero'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testButtonBelow} onPress={testNotification}>
              <Text style={styles.testButtonBelowText}>🧪 Probar Notificación</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeMedications.map((med) => (
            <View key={med.id} style={styles.medicationCard}>
              <View style={styles.medicationHeader}>
                <Text style={styles.medicationName}>{'💊 '}{med.name}</Text>
                <Text style={styles.medicationStatus}>{'✅ Activo'}</Text>
              </View>
              
              {med.dosage ? (
                <Text style={styles.medicationDetail}>{'💊 Dosis: '}{med.dosage}</Text>
              ) : null}
              
              <Text style={styles.medicationDetail}>{'📅 Frecuencia: '}{med.frequency}</Text>
              
      {med.schedule ? (
        <View>
          <View style={styles.reminderHeader}>
            <Text style={styles.medicationDetailTitle}>{'⏰ Horarios programados:'}</Text>
            <Switch
              value={med.isReminderEnabled ?? true}
              onValueChange={(value) => {
                // Calcular enabledTimes: si activamos el Switch, todos a true
                const times = med.schedule?.split(',').map(t => t.trim()) || [];
                const newEnabledTimes: { [key: number]: boolean } = {};
                times.forEach((_, index) => {
                  newEnabledTimes[index] = value; // Todos con el mismo valor del Switch
                });

                updateMedication(med.id, {
                  schedule: med.schedule,
                  isReminderEnabled: value,
                  enabledTimes: newEnabledTimes,
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
                          schedule: med.schedule,
                          isReminderEnabled: med.isReminderEnabled,
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
      ) : null}
              
              <View style={styles.medicationActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => {
                    setMedName(med.name);
                    setDosage(med.dosage || '');
                    setFrequency(med.frequency);
                    setSelectedTimes(med.schedule ? med.schedule.split(',').map(t => t.trim()) : []);
                    setEditingMed(med);
                    setShowAddModal(true);
                  }}
                >
                  <Text style={[styles.actionText, styles.editText]}>{'✎ Editar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={() => handleDelete(med.id, med.name)}
                >
                  <Text style={[styles.actionText, styles.dangerText]}>{'🗑️ Eliminar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        
        {/* Botón de test al final de la lista */}
        {!medications.loading && activeMedications.length > 0 && (
          <TouchableOpacity style={styles.testButtonBelow} onPress={testNotification}>
            <Text style={styles.testButtonBelowText}>🧪 Probar Notificación</Text>
          </TouchableOpacity>
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
            <Text style={styles.modalTitle}>
              {editingMed ? 'Editar Medicamento' : 'Agregar Medicamento'}
            </Text>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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

              <Text style={styles.label}>Horarios de recordatorio *</Text>
              <TimePickerList
                times={selectedTimes}
                onTimesChange={setSelectedTimes}
                suggestedTimes={suggestedTimes}
                onUseSuggested={() => {
                  // Ya se aplican automáticamente en el componente
                }}
              />
            </ScrollView>

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
  testButtonBelow: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testButtonBelowText: {
    fontSize: 16,
    color: '#FFFFFF',
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
  editButton: {
    backgroundColor: '#E3F2FD',
  },
  dangerButton: {
    backgroundColor: '#FFEBEE',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  editText: {
    color: '#2196F3',
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
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  modalScrollView: {
    flexGrow: 0,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
