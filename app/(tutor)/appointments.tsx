/**
 * Pantalla de Gestión de Citas Médicas
 * Permite al tutor crear, editar y eliminar citas médicas para el usuario
 */

import { TimePicker } from '@/components/TimePicker';
import { useServerUrl } from '@/config/api';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const colors = {
  primary: theme.colors.primary,
  secondary: theme.colors.secondary,
  success: theme.colors.success,
  error: theme.colors.danger,
  textPrimary: theme.colors.text,
  textSecondary: theme.colors.textLight,
  background: theme.colors.background,
  surface: theme.colors.backgroundLight,
  border: theme.colors.border,
  gray: '#9ca3af',
};

interface Appointment {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM
  location: string | null;
  doctor: string | null;
  reminder_time_before: number; // minutos
  active: number;
  created_at: string;
}

export default function AppointmentsScreen() {
  const { url } = useServerUrl();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // Estado del formulario
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date());
  const [formTime, setFormTime] = useState(new Date());
  const [formLocation, setFormLocation] = useState('');
  const [formDoctor, setFormDoctor] = useState('');
  const [formReminderBefore, setFormReminderBefore] = useState<number[]>([60]); // ahora es array

  // Time picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadUserIdAndAppointments();
  }, []);

  const loadUserIdAndAppointments = async () => {
    try {
      const id = await AsyncStorage.getItem('user_id');
      if (id) {
        setUserId(id);
        await loadAppointments(id);
      } else {
        Alert.alert('Error', 'No se encontró el ID de usuario');
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const loadAppointments = async (uid: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${url}/appointments/${uid}?active_only=true`);
      if (response.ok) {
        const data = await response.json();
        // Ordenar por fecha y hora
        const sorted = data.appointments.sort((a: Appointment, b: Appointment) => {
          const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
          if (dateCompare !== 0) return dateCompare;
          return a.appointment_time.localeCompare(b.appointment_time);
        });
        setAppointments(sorted);
      } else {
        console.error('Error al cargar citas:', await response.text());
      }
    } catch (error) {
      console.error('Error en loadAppointments:', error);
      Alert.alert('Error', 'No se pudieron cargar las citas médicas');
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormDescription('');
    setFormDate(new Date());
    setFormTime(new Date());
    setFormLocation('');
    setFormDoctor('');
    setFormReminderBefore([60]);
    setShowForm(true);
  };

  const openEditForm = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setFormTitle(appointment.title);
    setFormDescription(appointment.description || '');
    
    // Parsear fecha (YYYY-MM-DD)
    const dateParts = appointment.appointment_date.split('-');
    const dateObj = new Date(
      parseInt(dateParts[0]),
      parseInt(dateParts[1]) - 1,
      parseInt(dateParts[2])
    );
    setFormDate(dateObj);

    // Parsear hora (HH:MM)
    const timeParts = appointment.appointment_time.split(':');
    const timeObj = new Date();
    timeObj.setHours(parseInt(timeParts[0]));
    timeObj.setMinutes(parseInt(timeParts[1]));
    setFormTime(timeObj);

    setFormLocation(appointment.location || '');
    setFormDoctor(appointment.doctor || '');
    
    // Al abrir para editar, soportar array o número simple
    setFormReminderBefore(
      Array.isArray(appointment.reminder_time_before)
        ? appointment.reminder_time_before
        : [appointment.reminder_time_before]
    );
    setShowForm(true);
  };

  const saveAppointment = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    const appointmentData = {
      userId,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      appointment_date: formatDate(formDate),
      appointment_time: formatTime(formTime),
      location: formLocation.trim() || null,
      doctor: formDoctor.trim() || null,
      reminder_time_before: formReminderBefore, // ahora es array
    };

    try {
      let response;
      if (editingId) {
        // Actualizar
        response = await fetch(`${url}/appointments/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData),
        });
      } else {
        // Crear
        response = await fetch(`${url}/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData),
        });
      }

      if (response.ok) {
        Alert.alert('Éxito', editingId ? 'Cita actualizada' : 'Cita creada correctamente');
        setShowForm(false);
        await loadAppointments(userId);
      } else {
        const error = await response.text();
        Alert.alert('Error', `No se pudo guardar la cita: ${error}`);
      }
    } catch (error) {
      console.error('Error guardando cita:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    }
  };

  const deleteAppointment = async (id: number) => {
    Alert.alert(
      'Eliminar cita',
      '¿Estás seguro de que quieres eliminar esta cita?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${url}/appointments/${id}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Éxito', 'Cita eliminada correctamente');
                await loadAppointments(userId);
              } else {
                Alert.alert('Error', 'No se pudo eliminar la cita');
              }
            } catch (error) {
              console.error('Error eliminando cita:', error);
              Alert.alert('Error', 'No se pudo conectar con el servidor');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDisplayDate = (dateString: string): string => {
    const parts = dateString.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const syncAppointments = async () => {
    setSyncing(true);
    await loadAppointments(userId);
    setSyncing(false);
  };

  // Reminder time options
  const reminderOptions = [
    { label: '15 minutos antes', value: 15 },
    { label: '30 minutos antes', value: 30 },
    { label: '1 hora antes', value: 60 },
    { label: '2 horas antes', value: 120 },
    { label: '1 día antes', value: 1440 },
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando citas médicas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Citas Médicas</Text>
        <TouchableOpacity onPress={syncAppointments} disabled={syncing}>
          <Ionicons
            name="sync"
            size={24}
            color={syncing ? colors.gray : colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Lista de citas */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.gray} />
            <Text style={styles.emptyText}>No hay citas médicas programadas</Text>
            <Text style={styles.emptySubtext}>
              Presiona el botón + para crear una nueva cita
            </Text>
          </View>
        ) : (
          appointments.map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentIconContainer}>
                  <Ionicons name="medical" size={24} color={colors.primary} />
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentTitle}>{appointment.title}</Text>
                  {appointment.doctor && (
                    <Text style={styles.appointmentDoctor}>Dr. {appointment.doctor}</Text>
                  )}
                </View>
              </View>

              <View style={styles.appointmentDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {formatDisplayDate(appointment.appointment_date)} a las{' '}
                    {appointment.appointment_time}
                  </Text>
                </View>

                {appointment.location && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{appointment.location}</Text>
                  </View>
                )}

                {appointment.description && (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{appointment.description}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Ionicons name="alarm-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    Recordatorio: {appointment.reminder_time_before} min antes
                  </Text>
                </View>
              </View>

              <View style={styles.appointmentActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditForm(appointment)}
                >
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteAppointment(appointment.id)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Botón flotante crear */}
      <TouchableOpacity style={styles.fab} onPress={openCreateForm}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Modal de formulario */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingId ? 'Editar Cita' : 'Nueva Cita Médica'}
                </Text>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <Ionicons name="close" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Título <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Consulta con cardiólogo"
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholderTextColor={colors.gray}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Detalles de la cita..."
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholderTextColor={colors.gray}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Fecha <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={styles.dateTimeText}>{formatDisplayDate(formatDate(formDate))}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Hora <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={styles.dateTimeText}>{formatTime(formTime)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Doctor</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre del doctor"
                  value={formDoctor}
                  onChangeText={setFormDoctor}
                  placeholderTextColor={colors.gray}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ubicación</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Hospital o clínica"
                  value={formLocation}
                  onChangeText={setFormLocation}
                  placeholderTextColor={colors.gray}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Recordatorio</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {reminderOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.reminderOption,
                        formReminderBefore.includes(option.value) && styles.reminderOptionActive,
                      ]}
                      onPress={() => {
                        setFormReminderBefore((prev) =>
                          prev.includes(option.value)
                            ? prev.filter((v) => v !== option.value)
                            : [...prev, option.value]
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.reminderOptionText,
                          formReminderBefore.includes(option.value) && styles.reminderOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={saveAppointment}>
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time Picker */}
      <TimePicker
        value={formTime}
        visible={showTimePicker}
        onChange={(date) => setFormTime(date)}
        onClose={() => setShowTimePicker(false)}
      />

      {/* Date Picker Simple */}
      {showDatePicker && (
        <Modal transparent={true} animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContent}>
              <Text style={styles.datePickerTitle}>Seleccionar Fecha</Text>
              <View style={styles.datePickerInputs}>
                <View style={styles.datePickerInputGroup}>
                  <Text style={styles.datePickerLabel}>Día</Text>
                  <TextInput
                    style={styles.datePickerInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={String(formDate.getDate())}
                    onChangeText={(text) => {
                      const day = parseInt(text) || 1;
                      const newDate = new Date(formDate);
                      newDate.setDate(Math.min(day, 31));
                      setFormDate(newDate);
                    }}
                  />
                </View>
                <View style={styles.datePickerInputGroup}>
                  <Text style={styles.datePickerLabel}>Mes</Text>
                  <TextInput
                    style={styles.datePickerInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={String(formDate.getMonth() + 1)}
                    onChangeText={(text) => {
                      const month = parseInt(text) || 1;
                      const newDate = new Date(formDate);
                      newDate.setMonth(Math.min(month - 1, 11));
                      setFormDate(newDate);
                    }}
                  />
                </View>
                <View style={styles.datePickerInputGroup}>
                  <Text style={styles.datePickerLabel}>Año</Text>
                  <TextInput
                    style={styles.datePickerInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={String(formDate.getFullYear())}
                    onChangeText={(text) => {
                      const year = parseInt(text) || 2025;
                      const newDate = new Date(formDate);
                      newDate.setFullYear(year);
                      setFormDate(newDate);
                    }}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  style={[styles.datePickerButton, { flex: 1, backgroundColor: colors.gray + '30' }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={[styles.datePickerButtonText, { color: colors.textPrimary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.datePickerButton, { flex: 1 }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  appointmentCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  appointmentDoctor: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  appointmentDetails: {
    paddingLeft: 60,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  deleteButton: {
    // No additional styles needed, color handled in Text
  },
  deleteButtonText: {
    color: colors.error,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  formGroup: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.background,
  },
  dateTimeText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 8,
  },
  reminderOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    backgroundColor: colors.background,
  },
  reminderOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reminderOptionText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  reminderOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.gray + '30',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  datePickerInputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  datePickerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  datePickerInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    backgroundColor: colors.background,
  },
  datePickerButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
