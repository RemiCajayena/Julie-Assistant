/**
 * Servicio de Confirmación de Medicamentos
 * Espera confirmación del usuario después de un recordatorio
 * Si no hay confirmación en 2 minutos, envía alerta al tutor
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.73:3000';

interface PendingConfirmation {
  medicationIds: string[];
  medicationNames: string[];
  reminderIds: string[];
  timestamp: number;
  timeoutId?: NodeJS.Timeout;
}

// Mapa de confirmaciones pendientes
const pendingConfirmations = new Map<string, PendingConfirmation>();

// Configuración
const CONFIRMATION_TIMEOUT = 2 * 60 * 1000; // 2 minutos

/**
 * Registrar un recordatorio que espera confirmación
 */
export function registerPendingMedication(
  medicationIds: string[],
  medicationNames: string[],
  reminderIds: string[]
): void {
  const key = medicationIds.join('-');
  
  // Cancelar timeout anterior si existe
  if (pendingConfirmations.has(key)) {
    const existing = pendingConfirmations.get(key)!;
    if (existing.timeoutId) {
      clearTimeout(existing.timeoutId);
    }
  }

  console.log(`⏳ Esperando confirmación de: ${medicationNames.join(', ')}`);

  // Programar alerta si no hay confirmación
  const timeoutId = setTimeout(async () => {
    await sendMissedMedicationAlert(medicationIds, medicationNames, reminderIds);
    pendingConfirmations.delete(key);
  }, CONFIRMATION_TIMEOUT);

  pendingConfirmations.set(key, {
    medicationIds,
    medicationNames,
    reminderIds,
    timestamp: Date.now(),
    timeoutId: timeoutId as any,
  });
}

/**
 * Confirmar que el medicamento fue tomado
 */
export async function confirmMedicationTaken(
  medicationIds?: string[]
): Promise<boolean> {
  try {
    let confirmed = false;

    if (medicationIds && medicationIds.length > 0) {
      // Confirmar medicamentos específicos
      const key = medicationIds.join('-');
      if (pendingConfirmations.has(key)) {
        const pending = pendingConfirmations.get(key)!;
        if (pending.timeoutId) {
          clearTimeout(pending.timeoutId);
        }
        pendingConfirmations.delete(key);
        confirmed = true;
        console.log(`✅ Confirmación recibida para: ${pending.medicationNames.join(', ')}`);
      }
    } else {
      // Confirmar el medicamento más reciente
      if (pendingConfirmations.size > 0) {
        const entries = Array.from(pendingConfirmations.entries());
        // Ordenar por timestamp (más reciente primero)
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        const [key, pending] = entries[0];
        if (pending.timeoutId) {
          clearTimeout(pending.timeoutId);
        }
        pendingConfirmations.delete(key);
        confirmed = true;
        console.log(`✅ Confirmación recibida para: ${pending.medicationNames.join(', ')}`);
        
        // Registrar en servidor
        await registerMedicationTaken(pending.medicationIds, pending.reminderIds);
      }
    }

    return confirmed;
  } catch (error) {
    console.error('❌ Error confirmando medicamento:', error);
    return false;
  }
}

/**
 * Registrar en el servidor que el medicamento fue tomado
 */
async function registerMedicationTaken(
  medicationIds: string[],
  reminderIds: string[]
): Promise<void> {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) return;

    await axios.post(`${API_URL}/medications/taken`, {
      userId,
      medicationIds,
      reminderIds,
      timestamp: new Date().toISOString(),
    });

    console.log('📝 Medicamento registrado como tomado en servidor');
  } catch (error) {
    console.error('❌ Error registrando medicamento tomado:', error);
  }
}

/**
 * Enviar alerta al tutor sobre medicamento no tomado
 */
async function sendMissedMedicationAlert(
  medicationIds: string[],
  medicationNames: string[],
  reminderIds: string[]
): Promise<void> {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) return;

    const medicationText = medicationNames.join(' y ');
    
    console.log(`⚠️ No se recibió confirmación de: ${medicationText}`);
    console.log(`📱 Enviando alerta al tutor...`);

    await axios.post(`${API_URL}/alerts/missed-medication`, {
      userId,
      medicationIds,
      medicationNames,
      reminderIds,
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Alerta enviada al tutor');
  } catch (error) {
    console.error('❌ Error enviando alerta:', error);
  }
}

/**
 * Obtener medicamentos pendientes de confirmación
 */
export function getPendingMedications(): PendingConfirmation[] {
  return Array.from(pendingConfirmations.values());
}

/**
 * Limpiar todas las confirmaciones pendientes
 */
export function clearAllPendingConfirmations(): void {
  for (const [key, pending] of pendingConfirmations) {
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }
  }
  pendingConfirmations.clear();
  console.log('🧹 Todas las confirmaciones pendientes limpiadas');
}

/**
 * Verificar si hay confirmaciones pendientes
 */
export function hasPendingConfirmations(): boolean {
  return pendingConfirmations.size > 0;
}
