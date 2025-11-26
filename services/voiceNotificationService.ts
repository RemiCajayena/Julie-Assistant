/**
 * Servicio de Notificaciones por Voz
 * Anuncia las notificaciones usando el asistente virtual Julie
 * Utiliza Google Cloud TTS para voces naturales en español
 */

import axios from 'axios';
import { Audio } from 'expo-av';

export interface VoiceNotification {
  type: 'medication' | 'medication_reminder' | 'appointment' | 'appointment_reminder' | 'reminder' | 'general';
  medicationName?: string;
  dosage?: string;
  appointmentTitle?: string;
  location?: string;
  customMessage?: string;
  // Para notificaciones agrupadas
  grouped?: boolean;
  medications?: Array<{ name: string; dosage?: string }>;
}

// Configuración del servidor
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.207:3000';

const getAlternativeUrls = () => {
  // URLs alternativas en caso de que la principal falle
  return [
    'http://192.168.1.207:3000',  // IP principal
    'http://10.0.2.2:3000',        // Emulador Android
    'http://localhost:3000',       // Localhost
  ];
};

// Referencia al sonido actual
let currentSound: Audio.Sound | null = null;

/**
 * Función auxiliar para reproducir audio con Google Cloud TTS
 */
async function speakWithGoogleTTS(text: string): Promise<void> {
  try {
    // Detener audio anterior si existe
    if (currentSound) {
      console.log('🛑 Deteniendo audio anterior...');
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (err) {
        console.log('⚠️ Error deteniendo audio anterior:', err);
      }
      currentSound = null;
    }

    // Configurar audio para reproducción
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    console.log('🎙️ Generando audio con Google Cloud TTS...');

    // Intentar con la URL principal primero
    const urls = getAlternativeUrls();
    let audioBuffer: ArrayBuffer | null = null;

    for (const url of urls) {
      try {
        console.log(`🔄 Intentando TTS con: ${url}`);
        const response = await axios.post(
          `${url}/tts`,
          {
            text,
            voice: 'es-US-Neural2-A', // Voz neural de Google en español
          },
          {
            responseType: 'arraybuffer',
            timeout: 10000, // 10 segundos de timeout
          }
        );

        if (response?.data) {
          audioBuffer = response.data;
          console.log('✅ Audio generado exitosamente con:', url);
          break;
        }
      } catch (error: any) {
        console.log(`⚠️ Error con ${url}:`, error?.message || error);
      }
    }

    if (!audioBuffer) {
      throw new Error('No se pudo generar el audio con ninguna URL');
    }

    // Convertir a base64 y reproducir
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/mpeg;base64,${base64Audio}` },
      {
        shouldPlay: true,
        volume: 1.0,
        rate: 1.0,
      },
      (status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('✅ Audio completado');
          sound.unloadAsync();
          if (currentSound === sound) {
            currentSound = null;
          }
        }
      }
    );

    currentSound = sound;
    console.log('▶️ Reproduciendo audio (Google Cloud - voz nativa español)...');
  } catch (error) {
    console.error('❌ Error en TTS con Google Cloud:', error);
    throw error;
  }
}

/**
 * Anunciar recordatorio de medicamento
 */
export async function announceMedicationReminder(
  medicationName: string,
  dosage?: string
): Promise<void> {
  try {
    const dosageText = dosage ? `, ${dosage}` : '';
    const message = `Hola, soy Julie. Es hora de tomar tu medicamento: ${medicationName}${dosageText}. Por favor, no olvides tomarlo.`;

    console.log('🔊 Anunciando medicamento:', message);
    await speakWithGoogleTTS(message);
  } catch (error) {
    console.error('❌ Error anunciando medicamento:', error);
  }
}

/**
 * Anunciar múltiples medicamentos agrupados
 */
export async function announceGroupedMedications(
  medications: Array<{ name: string; dosage?: string }>,
  userName?: string
): Promise<void> {
  try {
    // Obtener nombre de usuario desde AsyncStorage si no se proporciona
    if (!userName) {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      userName = await AsyncStorage.getItem('userName') || '';
    }

    const greeting = userName ? `Don ${userName}, ` : '';
    
    // Construir lista de medicamentos de forma natural
    const medicationList = medications.map((med, index) => {
      const dosageText = med.dosage ? ` ${med.dosage} de` : '';
      const medication = `${dosageText}${dosageText ? '' : ' '}${med.name}`;
      
      if (index === 0) {
        return medication;
      } else if (index === medications.length - 1) {
        return ` y ${medication}`;
      } else {
        return `, ${medication}`;
      }
    }).join('');

    const message = `Hola, soy Julie. ${greeting}es hora de tomar${medicationList}. Por favor, no olvides tomarlos.`;

    console.log('🔊 Anunciando medicamentos agrupados:', message);
    await speakWithGoogleTTS(message);
  } catch (error) {
    console.error('❌ Error anunciando medicamentos agrupados:', error);
  }
}

/**
 * Anunciar recordatorio de cita médica
 */
export async function announceAppointmentReminder(
  appointmentTitle: string,
  timeUntil: string,
  location?: string
): Promise<void> {
  try {
    const locationText = location ? ` en ${location}` : '';
    const message = `Hola, soy Julie. Tienes una cita médica ${timeUntil}: ${appointmentTitle}${locationText}. No olvides asistir.`;

    console.log('🔊 Anunciando cita médica:', message);
    await speakWithGoogleTTS(message);
  } catch (error) {
    console.error('❌ Error anunciando cita:', error);
  }
}

/**
 * Anunciar recordatorio genérico
 */
export async function announceGenericReminder(
  message: string
): Promise<void> {
  try {
    const fullMessage = `Hola, soy Julie. ${message}`;

    console.log('🔊 Anunciando recordatorio:', fullMessage);
    await speakWithGoogleTTS(fullMessage);
  } catch (error) {
    console.error('❌ Error anunciando recordatorio:', error);
  }
}

/**
 * Anunciar notificación según su tipo
 */
export async function announceNotification(
  notification: VoiceNotification
): Promise<void> {
  console.log('🔊 announceNotification llamado con tipo:', notification.type);
  
  // Verificar si es una notificación agrupada
  if (notification.grouped && notification.medications && notification.medications.length > 0) {
    console.log(`📦 Anunciando ${notification.medications.length} medicamentos agrupados`);
    await announceGroupedMedications(notification.medications);
    return;
  }
  
  switch (notification.type) {
    case 'medication':
    case 'medication_reminder':
      if (notification.medicationName) {
        await announceMedicationReminder(
          notification.medicationName,
          notification.dosage
        );
      } else {
        console.warn('⚠️ Notificación de medicamento sin nombre');
      }
      break;

    case 'appointment':
    case 'appointment_reminder':
      if (notification.appointmentTitle) {
        await announceAppointmentReminder(
          notification.appointmentTitle,
          'pronto',
          notification.location
        );
      } else {
        console.warn('⚠️ Notificación de cita sin título');
      }
      break;

    case 'reminder':
    case 'general':
      if (notification.customMessage) {
        await announceGenericReminder(notification.customMessage);
      } else {
        console.warn('⚠️ Notificación sin mensaje');
      }
      break;

    default:
      console.warn('⚠️ Tipo de notificación desconocido:', notification.type);
      // Intentar anunciar el mensaje de todas formas
      if (notification.customMessage) {
        await announceGenericReminder(notification.customMessage);
      }
  }
}

/**
 * Detener cualquier anuncio en curso
 */
export async function stopAnnouncement(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
      console.log('🔇 Anuncio detenido');
    }
  } catch (error) {
    console.error('❌ Error deteniendo anuncio:', error);
  }
}

/**
 * Verificar si hay un anuncio en curso
 */
export async function isAnnouncing(): Promise<boolean> {
  try {
    if (!currentSound) return false;
    const status = await currentSound.getStatusAsync();
    return status.isLoaded && status.isPlaying;
  } catch (error) {
    console.error('❌ Error verificando estado de anuncio:', error);
    return false;
  }
}

/**
 * Anunciar lista de medicamentos pendientes
 */
export async function announcePendingMedications(
  medications: Array<{ name: string; dosage?: string }>
): Promise<void> {
  try {
    if (medications.length === 0) {
      const message = 'Hola, soy Julie. No tienes medicamentos pendientes en este momento.';
      await speakWithGoogleTTS(message);
      return;
    }

    const medicationList = medications
      .map((med, index) => {
        const dosageText = med.dosage ? `, ${med.dosage}` : '';
        return `${index + 1}. ${med.name}${dosageText}`;
      })
      .join('. ');

    const message = `Hola, soy Julie. Tienes ${medications.length} medicamento${
      medications.length > 1 ? 's' : ''
    } pendiente${medications.length > 1 ? 's' : ''}: ${medicationList}.`;

    console.log('🔊 Anunciando medicamentos pendientes:', message);
    await speakWithGoogleTTS(message);
  } catch (error) {
    console.error('❌ Error anunciando medicamentos pendientes:', error);
  }
}

/**
 * Confirmar toma de medicamento
 */
export async function confirmMedicationTaken(medicationName: string): Promise<void> {
  try {
    const message = `Hola. Perfecto. He registrado que tomaste ${medicationName}. Recuerda mantener tu tratamiento constante.`;

    console.log('🔊 Confirmando toma de medicamento:', message);
    await speakWithGoogleTTS(message);
  } catch (error) {
    console.error('❌ Error confirmando medicamento:', error);
  }
}

/**
 * Anunciar próxima cita
 */
export async function announceNextAppointment(
  appointmentTitle: string,
  date: Date,
  location?: string
): Promise<void> {
  try {
    const dateStr = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    const locationText = location ? ` en ${location}` : '';
    const message = `Hola, soy Julie. Tu próxima cita médica es: ${appointmentTitle}, el ${dateStr}${locationText}.`;

    console.log('🔊 Anunciando próxima cita:', message);
    await speakWithGoogleTTS(message);
  } catch (error) {
    console.error('❌ Error anunciando próxima cita:', error);
  }
}
