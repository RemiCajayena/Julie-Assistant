/**
 * Pantalla de Registro del Tutor
 * Se muestra después del PIN setup para registrar información del tutor
 */

import { useMode } from '@/contexts/ModeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function TutorRegistrationScreen() {
  const router = useRouter();
  const { setUserInfo } = useMode();
  const [loading, setLoading] = useState(false);

  // Datos del tutor
  const [tutorName, setTutorName] = useState('');
  const [tutorPhone, setTutorPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  // Datos del usuario (adulto mayor)
  const [userName, setUserNameLocal] = useState('');

  const [errors, setErrors] = useState({
    tutorName: '',
    tutorPhone: '',
    userName: '',
  });

  const validateForm = () => {
    const newErrors = {
      tutorName: '',
      tutorPhone: '',
      userName: '',
    };

    let isValid = true;

    if (!tutorName.trim()) {
      newErrors.tutorName = 'El nombre del tutor es requerido';
      isValid = false;
    }

    if (!tutorPhone.trim()) {
      newErrors.tutorPhone = 'El teléfono es requerido';
      isValid = false;
    } else if (!/^9\d{8}$/.test(tutorPhone.replace(/\s/g, ''))) {
      newErrors.tutorPhone = 'Ingresa un teléfono válido (9 dígitos, comienza con 9)';
      isValid = false;
    }

    if (!userName.trim()) {
      newErrors.userName = 'El nombre del usuario es requerido';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 1. Usar el userId por defecto
      const userId = 'usuario123';
      await setUserInfo(userId, userName.trim());

      // 2. Formatear teléfono con prefijo +56
      const formattedPhone = '+56' + tutorPhone.trim().replace(/\s/g, '');

      // 3. Registrar tutor en el servidor
      const response = await fetch(`${API_URL}/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: tutorName.trim(),
          phone: formattedPhone,
          relationship: relationship.trim() || 'Familiar',
        }),
      });

      if (response.ok) {
        console.log('✅ Tutor registrado exitosamente');

        // Registrar token de notificaciones push si está disponible
        try {
          // Intentar obtener el token de notificaciones desde AsyncStorage (lo guarda NotificationProvider)
          const expoPushToken = await AsyncStorage.getItem('expoPushToken');
          if (expoPushToken) {
            // Importar dinámicamente para evitar ciclos
            const { registerDeviceToken } = await import('../../utils/notificationService');
            await registerDeviceToken(Number(userId), expoPushToken);
            console.log('✅ Token de notificaciones registrado tras registro de tutor');
          } else {
            console.log('⚠️ No se encontró token de notificaciones para registrar tras registro de tutor');
          }
        } catch (err) {
          console.error('Error registrando token de notificaciones tras registro de tutor:', err);
        }

        Alert.alert(
          '✅ Registro Completo',
          `Bienvenido ${tutorName}! Ahora puedes gestionar los medicamentos y recordatorios de ${userName}.`,
          [
            {
              text: 'Continuar',
              onPress: () => {
                // Marcar que el tutor ya fue registrado
                AsyncStorage.setItem('tutorRegistered', 'true');
                router.replace('/welcome');
              },
            },
          ]
        );
      } else {
        const error = await response.text();
        console.error('Error registrando tutor:', error);
        Alert.alert('Error', 'No se pudo registrar el tutor. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error en registro:', error);
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar con el servidor. Verifica que esté corriendo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Omitir Registro',
      'Puedes registrar esta información después desde la configuración. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, omitir',
          onPress: async () => {
            // Guardar datos mínimos
            const userId = 'usuario123';
            if (userName.trim()) {
              await setUserInfo(userId, userName.trim());
            } else {
              await AsyncStorage.setItem('userId', userId);
            }
            await AsyncStorage.setItem('tutorRegistered', 'skipped');
            router.replace('/welcome');
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="person-add" size={64} color="#6366f1" />
          <Text style={styles.title}>Registro de Tutor</Text>
          <Text style={styles.subtitle}>
            Registra la información del cuidador para recibir alertas y gestionar medicamentos
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {/* Datos del Usuario (Adulto Mayor) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Datos del Usuario</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nombre del Usuario <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.userName && styles.inputError]}
                placeholder="Ej: María González"
                value={userName}
                onChangeText={(text) => {
                  setUserNameLocal(text);
                  setErrors({ ...errors, userName: '' });
                }}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {errors.userName ? (
                <Text style={styles.errorText}>{errors.userName}</Text>
              ) : null}
              <Text style={styles.hint}>
                Nombre de la persona que usará Julie Assistant
              </Text>
            </View>
          </View>

          {/* Datos del Tutor */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👨‍⚕️ Datos del Tutor</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Tu Nombre <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.tutorName && styles.inputError]}
                placeholder="Ej: Juan Pérez"
                value={tutorName}
                onChangeText={(text) => {
                  setTutorName(text);
                  setErrors({ ...errors, tutorName: '' });
                }}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {errors.tutorName ? (
                <Text style={styles.errorText}>{errors.tutorName}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Tu Teléfono <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.phonePrefix}>+56</Text>
                <TextInput
                  style={[styles.phoneInput, errors.tutorPhone && styles.inputError]}
                  placeholder="972683920"
                  value={tutorPhone}
                  onChangeText={(text) => {
                    // Solo permitir números
                    const cleaned = text.replace(/[^0-9]/g, '');
                    setTutorPhone(cleaned);
                    setErrors({ ...errors, tutorPhone: '' });
                  }}
                  keyboardType="phone-pad"
                  maxLength={9}
                  returnKeyType="next"
                />
              </View>
              {errors.tutorPhone ? (
                <Text style={styles.errorText}>{errors.tutorPhone}</Text>
              ) : null}
              <Text style={styles.hint}>
                9 dígitos comenzando con 9 (ej: 972683920)
              </Text>
              <Text style={styles.hint}>
                Para recibir alertas por WhatsApp/SMS en emergencias
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Relación</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Hijo/a, Familiar, Cuidador"
                value={relationship}
                onChangeText={setRelationship}
                autoCapitalize="words"
                returnKeyType="done"
              />
              <Text style={styles.hint}>Opcional: Tu relación con el usuario</Text>
            </View>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Registrar</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSkip}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Omitir por ahora</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  form: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  phoneInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    borderWidth: 0,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
