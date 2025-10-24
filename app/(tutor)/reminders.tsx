/**
 * Pantalla de Gestión de Recordatorios
 * Permite al tutor crear, editar y gestionar recordatorios de medicamentos
 */

import { TimePicker } from '@/components/TimePicker';
import { theme } from '@/constants/theme';
import { syncRemindersWithServer } from '@/utils/notificationService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

interface Medication {
  id: number;
  name: string;
  dosage: string;
}

interface Reminder {
  id: number;
  user_id: string | number;
  medication_id: number | null;
  medication_name?: string;
  title: string;
  description: string;
  reminder_time: string;
  days_of_week: number[] | string;
  active: number | boolean;
  created_at: string;
}

const DAYS_OF_WEEK = [
  { id: 0, label: 'Dom', fullLabel: 'Domingo' },
  { id: 1, label: 'Lun', fullLabel: 'Lunes' },
  { id: 2, label: 'Mar', fullLabel: 'Martes' },
  { id: 3, label: 'Mié', fullLabel: 'Miércoles' },
  { id: 4, label: 'Jue', fullLabel: 'Jueves' },
  { id: 5, label: 'Vie', fullLabel: 'Viernes' },
  { id: 6, label: 'Sáb', fullLabel: 'Sábado' },
];

export default function RemindersScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMedicationId, setFormMedicationId] = useState<number | null>(null);
  const [formTime, setFormTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [formDaysOfWeek, setFormDaysOfWeek] = useState<number[]>([]);
  const [formActive, setFormActive] = useState(true);

  // Error handling
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userIdChecked, setUserIdChecked] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userId) {
      loadReminders();
      loadMedications();
    }
  }, [userId, showActiveOnly]);

  const loadUserData = async () => {
    try {
      const userIdStr = await AsyncStorage.getItem('user_id');
      if (userIdStr) {
        setUserId(userIdStr);
      } else {
        setErrorMsg('No se encontró el usuario. Por favor, vuelve a iniciar sesión.');
      }
    } catch (error) {
      console.error('Error cargando userId:', error);
      setErrorMsg('Error cargando usuario.');
    } finally {
      setUserIdChecked(true);
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      const response = await fetch(
        `${API_URL}/reminders/${userId}?active_only=${showActiveOnly}`
      );
      if (response.ok) {
        const data = await response.json();
        setReminders(data.reminders || []);
      } else {
        setErrorMsg('No se pudieron cargar los recordatorios');
      }
    } catch (error) {
      console.error('Error cargando recordatorios:', error);
      setErrorMsg('No se pudieron cargar los recordatorios');
    } finally {
      setLoading(false);
    }
  };

  const loadMedications = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`${API_URL}/medications/${userId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Medicamentos recibidos:', data.medications);
        setMedications(data.medications);
      }
    } catch (error) {
      console.error('Error cargando medicamentos:', error);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setEditingReminder(null);
    setModalVisible(true);
  };

  const openEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormTitle(reminder.title);
    setFormDescription(reminder.description);
    setFormMedicationId(reminder.medication_id);
    
    const [hours, minutes] = reminder.reminder_time.split(':').map(Number);
    const time = new Date();
    time.setHours(hours, minutes);
    setFormTime(time);
    
    // Convertir days_of_week a array si viene como string
    const daysArray = Array.isArray(reminder.days_of_week)
      ? reminder.days_of_week
      : (reminder.days_of_week || '').split(',').map(Number).filter(n => !isNaN(n));
    setFormDaysOfWeek(daysArray);
    setFormActive(!!reminder.active);
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormMedicationId(null);
    setFormTime(new Date());
    setFormDaysOfWeek([]);
    setFormActive(true);
  };

  const handleSaveReminder = async () => {
    if (!userId) {
      Alert.alert('Error', 'No se encontró el ID del usuario');
      return;
    }

    // Validar campos requeridos
    const errors = [];
    
    if (!formTitle.trim()) {
      errors.push('- El título es requerido');
    }

    if (formDaysOfWeek.length === 0) {
      errors.push('- Selecciona al menos un día de la semana');
    }

    if (!formTime) {
      errors.push('- Selecciona una hora para el recordatorio');
    }

    if (errors.length > 0) {
      Alert.alert(
        'Campos requeridos',
        'Por favor, completa los siguientes campos:\n\n' + errors.join('\n')
      );
      return;
    }

    const reminderTime = `${String(formTime.getHours()).padStart(2, '0')}:${String(formTime.getMinutes()).padStart(2, '0')}`;

    const reminderData = {
      user_id: userId,
      medication_id: formMedicationId,
      title: formTitle,
      description: formDescription,
      reminder_time: reminderTime,
      days_of_week: formDaysOfWeek,
      active: formActive,
    };

    try {
      const url = editingReminder
        ? `${API_URL}/reminders/${editingReminder.id}`
        : `${API_URL}/reminders`;
      
      const method = editingReminder ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminderData),
      });

      if (response.ok) {
        Alert.alert(
          'Éxito',
          editingReminder ? 'Recordatorio actualizado' : 'Recordatorio creado'
        );
        setModalVisible(false);
        loadReminders();
        handleSyncReminders(); // Sincronizar después de guardar
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'No se pudo guardar el recordatorio');
      }
    } catch (error) {
      console.error('Error guardando recordatorio:', error);
      Alert.alert('Error', 'No se pudo guardar el recordatorio');
    }
  };

  const handleDeleteReminder = (reminder: Reminder) => {
    Alert.alert(
      'Eliminar Recordatorio',
      `¿Estás seguro de eliminar "${reminder.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/reminders/${reminder.id}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Éxito', 'Recordatorio eliminado');
                loadReminders();
                handleSyncReminders(); // Sincronizar después de eliminar
              } else {
                Alert.alert('Error', 'No se pudo eliminar el recordatorio');
              }
            } catch (error) {
              console.error('Error eliminando recordatorio:', error);
              Alert.alert('Error', 'No se pudo eliminar el recordatorio');
            }
          },
        },
      ]
    );
  };

  const handleSnoozeReminder = (reminder: Reminder) => {
    Alert.alert(
      'Posponer Recordatorio',
      `¿Cuánto tiempo quieres posponer "${reminder.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '5 minutos',
          onPress: () => snoozeReminder(reminder.id, 5),
        },
        {
          text: '15 minutos',
          onPress: () => snoozeReminder(reminder.id, 15),
        },
        {
          text: '30 minutos',
          onPress: () => snoozeReminder(reminder.id, 30),
        },
        {
          text: '1 hora',
          onPress: () => snoozeReminder(reminder.id, 60),
        },
      ]
    );
  };

  const snoozeReminder = async (reminderId: number, durationMinutes: number) => {
    try {
      const response = await fetch(`${API_URL}/reminders/${reminderId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: durationMinutes }),
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert(
          'Recordatorio Pospuesto',
          `El recordatorio se volverá a mostrar en ${durationMinutes} minutos`
        );
        loadReminders();
      } else {
        Alert.alert('Error', 'No se pudo posponer el recordatorio');
      }
    } catch (error) {
      console.error('Error posponiendo recordatorio:', error);
      Alert.alert('Error', 'No se pudo posponer el recordatorio');
    }
  };

  const handleSyncReminders = async () => {
    if (!userId) return;

    try {
      const success = await syncRemindersWithServer(Number(userId));
      if (success) {
        Alert.alert('Éxito', 'Recordatorios sincronizados con la aplicación');
      } else {
        Alert.alert('Error', 'No se pudieron sincronizar los recordatorios');
      }
    } catch (error) {
      console.error('Error sincronizando:', error);
      Alert.alert('Error', 'Error al sincronizar');
    }
  };

  const handleToggleActive = async (reminder: Reminder) => {
    try {
      const response = await fetch(`${API_URL}/reminders/${reminder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !reminder.active }),
      });

      if (response.ok) {
        loadReminders();
      }
    } catch (error) {
      console.error('Error actualizando recordatorio:', error);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setFormDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Agrupar recordatorios por medicamento
  const groupRemindersByMedication = (reminders: Reminder[]) => {
    const groups = new Map<string, Reminder[]>();
    
    reminders.forEach(reminder => {
      const key = reminder.medication_id 
        ? `med_${reminder.medication_id}` 
        : `custom_${reminder.title}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(reminder);
    });

    return Array.from(groups.values());
  };

  const renderScheduleItem = (reminder: Reminder, isLast: boolean) => {
    return (
      <View key={reminder.id} style={[
        styles.scheduleItem,
        !isLast && styles.scheduleItemBorder
      ]}>
        <View style={styles.scheduleRow}>
          <Text style={styles.scheduleTime}>{reminder.reminder_time}</Text>
          <Switch
            value={!!reminder.active}
            onValueChange={() => handleToggleActive(reminder)}
            trackColor={{ false: '#ccc', true: theme.colors.primary + '50' }}
            thumbColor={reminder.active ? theme.colors.primary : '#f4f3f4'}
          />
        </View>
      </View>
    );
  };

  const renderReminderItem = ({ item }: { item: Reminder[] }) => {
    // Usar el primer recordatorio del grupo como referencia
    const mainReminder = item[0];
    // Ordenar recordatorios por hora
    const sortedReminders = [...item].sort((a, b) => 
      a.reminder_time.localeCompare(b.reminder_time)
    );
    const firstReminder = sortedReminders[0];

    // Convertir days_of_week a array
    let daysArray: number[] = [];
    try {
      if (Array.isArray(firstReminder.days_of_week)) {
        daysArray = firstReminder.days_of_week;
      } else if (typeof firstReminder.days_of_week === 'string') {
        if (firstReminder.days_of_week.startsWith('[')) {
          daysArray = JSON.parse(firstReminder.days_of_week);
        } else {
          daysArray = firstReminder.days_of_week.split(',').map(Number).filter(n => !isNaN(n));
        }
      }
    } catch (e) {
      console.warn('Error parsing days_of_week:', e);
    }
    
    const daysText = daysArray
      .sort((a, b) => a - b)
      .map(day => DAYS_OF_WEEK[day]?.label || '')
      .filter(Boolean)
      .join(', ');

    return (
      <View style={styles.reminderCard}>
        <View style={styles.reminderHeader}>
          <View style={styles.reminderTitleRow}>
            <Ionicons
              name={mainReminder.medication_id ? 'medical' : 'notifications'}
              size={24}
              color={mainReminder.active ? theme.colors.primary : theme.colors.textLight}
            />
            <View style={styles.reminderTitleContainer}>
              <Text style={styles.reminderTitle}>{mainReminder.title}</Text>
              {mainReminder.medication_name && (
                <Text style={styles.reminderMedication}>
                  {mainReminder.medication_name}
                </Text>
              )}
            </View>
          </View>
          <Switch
            value={!!mainReminder.active}
            onValueChange={() => handleToggleActive(mainReminder)}
            trackColor={{ false: '#ccc', true: theme.colors.primary + '50' }}
            thumbColor={mainReminder.active ? theme.colors.primary : '#f4f3f4'}
          />
        </View>

        {mainReminder.description && (
          <Text style={styles.reminderDescription}>{mainReminder.description}</Text>
        )}

        <View style={styles.reminderDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={theme.colors.textLight} />
            <Text style={styles.detailText}>{mainReminder.reminder_time}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textLight} />
            <Text style={styles.detailText}>{daysText}</Text>
          </View>
        </View>

        <View style={styles.reminderActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => openEditModal(mainReminder)}
          >
            <Ionicons name="pencil" size={20} color={theme.colors.primary} />
            <Text style={styles.actionButtonText}>Editar</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleSnoozeReminder(mainReminder)}
          >
            <Ionicons name="time" size={20} color={theme.colors.warning} />
            <Text style={[styles.actionButtonText, { color: theme.colors.warning }]}>
              Posponer
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteReminder(mainReminder)}
          >
            <Ionicons name="trash-outline" size={20} color="#dc3545" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              Eliminar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Recordatorios</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={handleSyncReminders} style={styles.syncButton}>
            <Ionicons name="sync" size={22} color={theme.colors.primary} />
          </Pressable>
          <Pressable onPress={openCreateModal} style={styles.addButton}>
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Mostrar solo activos</Text>
        <Switch
          value={showActiveOnly}
          onValueChange={setShowActiveOnly}
          trackColor={{ false: '#ccc', true: theme.colors.primary + '50' }}
          thumbColor={showActiveOnly ? theme.colors.primary : '#f4f3f4'}
        />
      </View>

      {/* List */}
      {loading || !userIdChecked ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Cargando recordatorios...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e57373" />
          <Text style={styles.emptyText}>{errorMsg}</Text>
        </View>
      ) : reminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No hay recordatorios</Text>
          <Text style={styles.emptySubtext}>
            Presiona el botón + para crear uno
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupRemindersByMedication(reminders)}
          keyExtractor={(item, index) => `group-${index}`}
          renderItem={({ item }) => (
            <View style={styles.medicationCard}>
              {/* Encabezado con información del medicamento */}
              <View style={styles.reminderHeader}>
                <View style={styles.reminderTitleRow}>
                  <Ionicons
                    name={item[0].medication_id ? 'medical' : 'notifications'}
                    size={24}
                    color={theme.colors.primary}
                  />
                  <View style={styles.reminderTitleContainer}>
                    <Text style={styles.reminderTitle}>{item[0].title}</Text>
                    {item[0].medication_name && (
                      <Text style={styles.reminderMedication}>
                        {item[0].medication_name}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {item[0].description && (
                <Text style={styles.reminderDescription}>{item[0].description}</Text>
              )}

              {/* Lista de horarios */}
              <View style={styles.schedulesContainer}>
                {item.map((reminder, index) => (
                  renderScheduleItem(reminder, index === item.length - 1)
                ))}
              </View>

              {/* Acciones para el grupo completo */}
              <View style={styles.reminderActions}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => openEditModal(item[0])}
                >
                  <Ionicons name="pencil" size={20} color={theme.colors.primary} />
                  <Text style={styles.actionButtonText}>Editar</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteReminder(item[0])}
                >
                  <Ionicons name="trash-outline" size={20} color="#dc3545" />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                    Eliminar
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Modal de crear/editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingReminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
                </Text>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color={theme.colors.text} />
                </Pressable>
              </View>

              {/* Título */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Título *</Text>
                <TextInput
                  style={styles.input}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="Ej: Tomar medicamento"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Descripción */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Detalles adicionales..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Medicamento */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Medicamento (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Pressable
                    style={[
                      styles.medicationChip,
                      formMedicationId === null && styles.medicationChipSelected,
                    ]}
                    onPress={() => setFormMedicationId(null)}
                  >
                    <Text
                      style={[
                        styles.medicationChipText,
                        formMedicationId === null && styles.medicationChipTextSelected,
                      ]}
                    >
                      Ninguno
                    </Text>
                  </Pressable>
                  {medications.map(med => (
                    <Pressable
                      key={med.id}
                      style={[
                        styles.medicationChip,
                        formMedicationId === med.id && styles.medicationChipSelected,
                      ]}
                      onPress={() => setFormMedicationId(med.id)}
                    >
                      <Text
                        style={[
                          styles.medicationChipText,
                          formMedicationId === med.id && styles.medicationChipTextSelected,
                        ]}
                      >
                        {med.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Hora */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hora *</Text>
                <Pressable
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.timeButtonText}>
                    {formTime.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </Pressable>
              </View>

              <TimePicker
                value={formTime}
                visible={showTimePicker}
                onChange={(date) => {
                  setFormTime(date);
                }}
                onClose={() => setShowTimePicker(false)}
              />

              {/* Días de la semana */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Días de la semana *</Text>
                <View style={styles.daysContainer}>
                  {DAYS_OF_WEEK.map(day => (
                    <Pressable
                      key={day.id}
                      style={[
                        styles.dayChip,
                        formDaysOfWeek.includes(day.id) && styles.dayChipSelected,
                      ]}
                      onPress={() => toggleDayOfWeek(day.id)}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          formDaysOfWeek.includes(day.id) && styles.dayChipTextSelected,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Activo */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>Recordatorio activo</Text>
                  <Switch
                    value={formActive}
                    onValueChange={setFormActive}
                    trackColor={{ false: '#ccc', true: theme.colors.primary + '50' }}
                    thumbColor={formActive ? theme.colors.primary : '#f4f3f4'}
                  />
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveReminder}
                >
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scheduleItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  scheduleItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleTime: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  schedulesContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  medicationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reminderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  reminderMedication: {
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 2,
  },
  reminderDescription: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 12,
  },
  reminderDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#fff0f0',
  },
  deleteButtonText: {
    color: '#dc3545',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  medicationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  medicationChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  medicationChipText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  medicationChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  timeButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  dayChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayChipText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  dayChipTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
