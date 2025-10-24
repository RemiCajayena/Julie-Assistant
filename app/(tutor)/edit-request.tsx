import { API_URL } from '@/config/api';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface MedicationRequest {
  id: number;
  user_id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  schedule?: string;
  notes?: string;
  status: string;
  requested_at: string;
}

export default function EditRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<MedicationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Campos editables
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [schedule, setSchedule] = useState('');
  const [notes, setNotes] = useState('');

  /**
   * Cargar solicitud
   */
  useEffect(() => {
    fetchRequest();
  }, []);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      // Obtener desde el endpoint de solicitudes
      const response = await axios.get(`${API_URL}/medication-requests/usuario123`);
      const found = response.data.requests.find((r: any) => r.id === parseInt(requestId));

      if (!found) {
        Alert.alert('Error', 'Solicitud no encontrada');
        router.back();
        return;
      }

      setRequest(found);
      setName(found.name || '');
      setDosage(found.dosage || '');
      setFrequency(found.frequency || '');
      setSchedule(found.schedule || '');
      setNotes(found.notes || '');
    } catch (error: any) {
      console.error('Error cargando solicitud:', error);
      Alert.alert('Error', 'No se pudo cargar la solicitud');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Guardar cambios
   */
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre del medicamento es obligatorio');
      return;
    }

    try {
      setSaving(true);

      await axios.put(`${API_URL}/medication-requests/${requestId}`, {
        name: name.trim(),
        dosage: dosage.trim() || null,
        frequency: frequency.trim() || null,
        schedule: schedule.trim() || null,
        notes: notes.trim() || null,
      });

      Alert.alert('Éxito', 'Solicitud actualizada correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error guardando:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Calcular horarios automáticamente
   */
  const handleCalculateSchedule = () => {
    if (!frequency.trim()) {
      Alert.alert('Información', 'Ingresa primero la frecuencia (ej: "cada 8 horas")');
      return;
    }

    if (!schedule.trim()) {
      Alert.alert('Información', 'Ingresa una hora inicial (ej: "08:00")');
      return;
    }

    // El servidor calculará automáticamente al guardar
    Alert.alert(
      'Calcular Horarios',
      `Se calcularán automáticamente los horarios basándose en "${frequency}" desde "${schedule}". ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Calcular', onPress: handleSave },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loaderText}>Cargando solicitud...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Solicitud</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          {/* Nombre */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Nombre del medicamento <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej: Ibuprofeno"
              placeholderTextColor="#999"
            />
          </View>

          {/* Dosis */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Dosis</Text>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder="Ej: 400mg, 2 comprimidos"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>Opcional. Ej: 500mg, 1 comprimido, 10 gotas</Text>
          </View>

          {/* Frecuencia */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Frecuencia</Text>
            <TextInput
              style={styles.input}
              value={frequency}
              onChangeText={setFrequency}
              placeholder="Ej: cada 8 horas, 3 veces al día"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>Opcional. Ej: cada 8 horas, cada 12 horas</Text>
          </View>

          {/* Horarios */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Horarios</Text>
            <TextInput
              style={styles.input}
              value={schedule}
              onChangeText={setSchedule}
              placeholder="Ej: 08:00, 16:00, 22:00"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>
              Opcional. Separar con comas. Ej: 08:00, 16:00, 22:00
            </Text>

            {/* Botón para calcular horarios automáticamente */}
            <TouchableOpacity
              style={styles.calculateButton}
              onPress={handleCalculateSchedule}
            >
              <Text style={styles.calculateButtonText}>
                🕐 Calcular horarios automáticamente
              </Text>
            </TouchableOpacity>
            <Text style={styles.calculateHint}>
              Si ingresas frecuencia y una hora inicial, se calcularán automáticamente todos
              los horarios del día
            </Text>
          </View>

          {/* Notas */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Notas adicionales</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas adicionales..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Ejemplo */}
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleTitle}>💡 Ejemplo de cálculo automático:</Text>
            <Text style={styles.exampleText}>
              Frecuencia: "cada 8 horas"{'\n'}
              Hora inicial: "08:00"{'\n'}
              {'\n'}
              Resultado: 08:00, 16:00, 00:00
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  calculateButton: {
    marginTop: 12,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  calculateHint: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  exampleContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 20,
  },
});
