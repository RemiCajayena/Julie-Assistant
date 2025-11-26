import { API_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface Medication {
  id: number;
  user_id: string;
  name: string;
  dosage?: string;
  frequency: string;
  schedule?: string;
  active: number;
  created_at: string;
  isReminderEnabled?: boolean;
  enabledTimes?: { [key: number]: boolean };
}

interface MedicationLog {
  id: number;
  medication_id: number;
  taken_at: string;
  status: 'taken' | 'missed' | 'postponed';
  notes?: string;
}

interface TutorInfo {
  id?: number;
  user_id: string;
  name: string;
  phone: string;
  relationship?: string;
}

/**
 * Hook para gestionar medicamentos y sincronización con servidor
 * 
 * Funcionalidades:
 * - CRUD de medicamentos
 * - Registro de tomas
 * - Sincronización con servidor
 * - Almacenamiento local (AsyncStorage)
 * - Alertas automáticas al tutor
 */
export const useMedications = (userId: string) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [tutor, setTutor] = useState<TutorInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================
  // ALMACENAMIENTO LOCAL
  // =====================================

  const STORAGE_KEYS = {
    medications: `medications_${userId}`,
    tutor: `tutor_${userId}`,
  };

  /**
   * Cargar medicamentos desde AsyncStorage
   */
  const loadLocalMedications = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.medications);
      if (stored) {
        setMedications(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error cargando medicamentos locales:', err);
    }
  };

  /**
   * Guardar medicamentos en AsyncStorage
   */
  const saveLocalMedications = async (meds: Medication[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.medications, JSON.stringify(meds));
    } catch (err) {
      console.error('Error guardando medicamentos locales:', err);
    }
  };

  /**
   * Cargar tutor desde AsyncStorage
   */
  const loadLocalTutor = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.tutor);
      if (stored) {
        setTutor(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error cargando tutor local:', err);
    }
  };

  /**
   * Guardar tutor en AsyncStorage
   */
  const saveLocalTutor = async (tutorData: TutorInfo) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.tutor, JSON.stringify(tutorData));
    } catch (err) {
      console.error('Error guardando tutor local:', err);
    }
  };

  // =====================================
  // SINCRONIZACIÓN CON SERVIDOR
  // =====================================

  /**
   * Obtener medicamentos desde el servidor
   */
  const fetchMedications = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/medications/${userId}`);
      let serverMeds = response.data.medications;

      // Cargar reminders para calcular el estado de cada medicamento
      try {
        const remindersResp = await axios.get(`${API_URL}/reminders/${userId}`);
        const allReminders = remindersResp.data?.reminders || [];

        // Calcular isReminderEnabled y enabledTimes para cada medicamento
        serverMeds = serverMeds.map((med: Medication) => {
          const medReminders = allReminders.filter((r: any) => r.medication_id === med.id);
          
          if (medReminders.length === 0) {
            return { ...med, isReminderEnabled: true, enabledTimes: {} };
          }

          const times = (med.schedule || '').split(',').map((t: string) => t.trim()).filter(Boolean);
          const enabledTimes: { [key: number]: boolean } = {};
          let anyActive = false;

          times.forEach((time: string, index: number) => {
            const reminder = medReminders.find((r: any) => r.reminder_time === time);
            const isActive = reminder ? reminder.active === 1 : false;
            enabledTimes[index] = isActive;
            if (isActive) anyActive = true;
          });

          return {
            ...med,
            isReminderEnabled: anyActive,
            enabledTimes
          };
        });
      } catch (reminderErr) {
        console.warn('Error cargando reminders, usando defaults:', reminderErr);
        serverMeds = serverMeds.map((med: Medication) => ({
          ...med,
          isReminderEnabled: true,
          enabledTimes: {}
        }));
      }

      setMedications(serverMeds);
      await saveLocalMedications(serverMeds);

      return serverMeds;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Error obteniendo medicamentos: ${errorMsg}`);
      console.error('Error fetching medications:', err);
      
      // Si falla, intentar cargar desde local
      await loadLocalMedications();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener tutor desde el servidor
   */
  const fetchTutor = async () => {
    try {
      const response = await axios.get(`${API_URL}/tutor/${userId}`);
      const tutorData = response.data.tutor;

      setTutor(tutorData);
      await saveLocalTutor(tutorData);

      return tutorData;
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error('Error fetching tutor:', err);
      }
      // Si falla, intentar cargar desde local
      await loadLocalTutor();
    }
  };

  // =====================================
  // OPERACIONES DE MEDICAMENTOS
  // =====================================

  /**
   * Crear un nuevo medicamento
   */
  const createMedication = async (medicationData: {
    name: string;
    dosage?: string;
    frequency: string;
    schedule?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/medications`, {
        userId,
        ...medicationData
      });

      const newMed = response.data.medication;

      // Actualizar estado local
      const updatedMeds = [...medications, newMed];
      setMedications(updatedMeds);
      await saveLocalMedications(updatedMeds);

      return newMed;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Error creando medicamento: ${errorMsg}`);
      console.error('Error creating medication:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Desactivar un medicamento
   */
  const deleteMedication = async (medicationId: number) => {
    try {
      setLoading(true);
      setError(null);

      await axios.delete(`${API_URL}/medications/${medicationId}`);

      // Actualizar estado local
      const updatedMeds = medications.filter(m => m.id !== medicationId);
      setMedications(updatedMeds);
      await saveLocalMedications(updatedMeds);

      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Error eliminando medicamento: ${errorMsg}`);
      console.error('Error deleting medication:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Registrar que se tomó un medicamento
   * Automáticamente envía alerta al tutor si está configurado
   */
  const markMedicationTaken = async (
    medicationId: number,
    status: 'taken' | 'missed' | 'postponed' = 'taken',
    notes?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/medication-taken`, {
        userId,
        medicationId,
        status,
        notes: notes || ''
      });

      const result = response.data;
      console.log('✅ Medicamento registrado:', result);

      if (result.alertSent) {
        console.log('📱 Alerta enviada al tutor');
      }

      return result;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Error registrando toma: ${errorMsg}`);
      console.error('Error marking medication taken:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener estado de medicamentos de hoy
   */
  const getTodayStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/medication-status/${userId}`);
      return response.data.status;
    } catch (err: any) {
      console.error('Error getting today status:', err);
      return [];
    }
  };

  /**
   * Crear un recordatorio independiente (no relacionado a medicamento)
   */
  const createIndependentReminder = async (reminderData: {
    title: string;
    description?: string;
    reminder_time: string;
    days_of_week: number[];
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/reminders`, {
        userId,
        ...reminderData,
        type: 'independent',
        active: 1
      });

      console.log('✅ Recordatorio independiente creado:', response.data);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Error creando recordatorio: ${errorMsg}`);
      console.error('Error creating independent reminder:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // OPERACIONES DE TUTOR
  // =====================================

  /**
   * Registrar o actualizar tutor
   */
  const registerTutor = async (tutorData: {
    name: string;
    phone: string;
    relationship?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/register-tutor`, {
        userId,
        ...tutorData
      });

      const registeredTutor = response.data.tutor;

      setTutor(registeredTutor);
      await saveLocalTutor(registeredTutor);

      return registeredTutor;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Error registrando tutor: ${errorMsg}`);
      console.error('Error registering tutor:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Solicitar registro de medicamento (requiere aprobación del tutor)
   * El tutor recibirá un SMS con la solicitud
   */
  const requestMedicationRegistration = async (medicationData: {
    medicationName: string;
    dosage?: string;
    frequency?: string;
    schedule?: string;
    notes?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/medication-requests`, {
        userId,
        name: medicationData.medicationName,
        dosage: medicationData.dosage,
        frequency: medicationData.frequency,
        schedule: medicationData.schedule,
        notes: medicationData.notes
      });

      console.log('📱 Solicitud enviada al tutor:', response.data);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Error enviando solicitud: ${errorMsg}`);
      console.error('Error requesting medication:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enviar alerta manual al tutor (ej: emergencia)
   */
  const sendAlertToTutor = async (type: string, message: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/alert-tutor`, {
        userId,
        type,
        message
      });

      console.log('📱 Alerta enviada:', response.data);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Error enviando alerta: ${errorMsg}`);
      console.error('Error sending alert:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar solicitud pendiente (agregar más información)
   */
  const updateMedicationRequest = async (requestId: number, updates: {
    name?: string;
    dosage?: string;
    frequency?: string;
    schedule?: string;
    notes?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.put(`${API_URL}/medication-requests/${requestId}`, updates);

      console.log('📝 Solicitud actualizada:', response.data);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Error actualizando solicitud: ${errorMsg}`);
      console.error('Error updating request:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // INICIALIZACIÓN
  // =====================================

  useEffect(() => {
    // Cargar datos al montar el componente
    const init = async () => {
      await loadLocalMedications();
      await loadLocalTutor();
      
      // Intentar sincronizar con servidor
      await fetchMedications();
      await fetchTutor();
    };

    init();
  }, [userId]);

  // =====================================
  // RETORNO DEL HOOK
  // =====================================

  return {
    // Estado
    medications,
    tutor,
    loading,
    error,

  // Operaciones de medicamentos
  fetchMedications,
  createMedication,
  deleteMedication,
  markMedicationTaken,
  getTodayStatus,
  requestMedicationRegistration, // Nueva: solicitar registro con aprobación del tutor
  updateMedicationState: async (id: number, updates: Partial<Medication>) => {
    const updatedMedications = medications.map(med => 
      med.id === id ? { ...med, ...updates } : med
    );
    setMedications(updatedMedications);
    await saveLocalMedications(updatedMedications);
    return updatedMedications.find(m => m.id === id);
  },    // Operaciones de tutor
    registerTutor,
    fetchTutor,
    sendAlertToTutor,
    updateMedicationRequest, // Nueva: actualizar solicitud pendiente
  };
};
