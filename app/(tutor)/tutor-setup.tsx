import { API_URL } from '@/config/api';
import { useMode } from '@/contexts/ModeContext';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

/**
 * Pantalla para registrar o actualizar información del tutor
 */
export default function TutorSetupScreen() {
  const router = useRouter();
  const { userId } = useMode();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [existingTutor, setExistingTutor] = useState<any>(null);

  // Formulario
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  // Cargar datos del tutor si ya existe
  useEffect(() => {
    fetchTutorData();
  }, []);

  const fetchTutorData = async () => {
    if (!userId) return;

    try {
      setFetching(true);
      const response = await fetch(`${API_URL}/tutor/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.tutor) {
          setExistingTutor(data.tutor);
          setName(data.tutor.name);
          setPhone(data.tutor.phone);
          setRelationship(data.tutor.relationship || '');
        }
      }
    } catch (error) {
      console.error('Error cargando tutor:', error);
    } finally {
      setFetching(false);
    }
  };

  const validatePhone = (phone: string) => {
    // Validar formato internacional +56XXXXXXXXX (Chile) o +52XXXXXXXXXX (México)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const handleSave = async () => {
    // Validaciones
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del tutor');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Por favor ingresa el teléfono del tutor');
      return;
    }

    if (!validatePhone(phone)) {
      Alert.alert(
        'Formato de teléfono incorrecto',
        'El teléfono debe estar en formato internacional.\n\nEjemplos:\n+56912345678 (Chile)\n+5215512345678 (México)\n+34612345678 (España)'
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/tutor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId || 'usuario123',
          name: name.trim(),
          phone: phone.trim(),
          relationship: relationship.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar tutor');
      }

      Alert.alert(
        'Éxito',
        existingTutor ? 'Tutor actualizado correctamente' : 'Tutor registrado correctamente',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error guardando tutor:', error);
      Alert.alert('Error', 'No se pudo guardar la información del tutor');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {existingTutor ? 'Editar Tutor' : 'Registrar Tutor'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          <Text style={styles.infoEmoji}>👤</Text>
          <Text style={styles.infoTitle}>¿Qué es un tutor?</Text>
          <Text style={styles.infoText}>
            El tutor es la persona que recibirá alertas y recordatorios sobre los medicamentos.
            Puede ser un familiar, cuidador o amigo de confianza.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Nombre completo <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: María García"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Teléfono <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.helperText}>
              Formato internacional (incluye código de país)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="+56912345678"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <View style={styles.examplesBox}>
              <Text style={styles.exampleTitle}>Ejemplos:</Text>
              <Text style={styles.exampleText}>🇨🇱 Chile: +56912345678</Text>
              <Text style={styles.exampleText}>🇲🇽 México: +5215512345678</Text>
              <Text style={styles.exampleText}>🇪🇸 España: +34612345678</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Relación (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Hijo/a, Cuidador/a, Familiar"
              value={relationship}
              onChangeText={setRelationship}
              autoCapitalize="words"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {existingTutor ? '💾 Actualizar' : '💾 Guardar'}
            </Text>
          )}
        </TouchableOpacity>

        {existingTutor && (
          <View style={styles.existingInfo}>
            <Text style={styles.existingLabel}>ℹ️ Información actual</Text>
            <Text style={styles.existingText}>Nombre: {existingTutor.name}</Text>
            <Text style={styles.existingText}>Teléfono: {existingTutor.phone}</Text>
            {existingTutor.relationship && (
              <Text style={styles.existingText}>Relación: {existingTutor.relationship}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    width: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  examplesBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  exampleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  exampleText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  existingInfo: {
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  existingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 8,
  },
  existingText: {
    fontSize: 14,
    color: '#F57F17',
    marginBottom: 4,
  },
});
