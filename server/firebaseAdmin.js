/**
 * Firebase Admin SDK - Servicio de Notificaciones Push
 * Permite enviar notificaciones FCM desde el servidor
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let firebaseInitialized = false;

/**
 * Inicializar Firebase Admin SDK
 */
export function initializeFirebase() {
  if (firebaseInitialized) {
    console.log('ℹ️  Firebase Admin SDK ya está inicializado');
    return true;
  }

  try {
    const serviceAccountPath = join(__dirname, 'firebase-service-account.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK inicializado correctamente');
    console.log(`   Proyecto: ${serviceAccount.project_id}`);
    return true;
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin SDK:', error.message);
    if (error.code === 'ENOENT') {
      console.error('   Archivo firebase-service-account.json no encontrado');
      console.error('   Descárgalo desde Firebase Console y colócalo en la carpeta server/');
    }
    return false;
  }
}

/**
 * Enviar notificación push FCM a un token específico
 * @param {string} token - Token FCM del dispositivo
 * @param {Object} notification - { title, body, imageUrl?, icon? }
 * @param {Object} data - Datos personalizados
 * @param {Object} options - Opciones avanzadas: { sound?, priority?, channelId?, color?, vibrate?, badge? }
 */
export async function sendFCMNotification(token, notification, data = {}, options = {}) {
  if (!firebaseInitialized) {
    throw new Error('Firebase Admin SDK no está inicializado');
  }

  try {
    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl, // URL de imagen grande
      },
      data: {
        ...data,
        // Convertir todos los valores a string (requisito de FCM)
        ...Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : JSON.stringify(value),
          ])
        ),
      },
      android: {
        priority: options.priority || 'high',
        notification: {
          channelId: options.channelId || 'default',
          sound: options.sound || 'default',
          priority: options.priority || 'high',
          defaultSound: options.sound === undefined,
          defaultVibrateTimings: options.vibrate === undefined,
          color: options.color, // Color del icono (ej: '#FF5722')
          icon: notification.icon, // Icono personalizado
          imageUrl: notification.imageUrl,
          tag: options.tag, // Para agrupar notificaciones
          ...(options.vibrate && { vibrateTimingsMillis: options.vibrate }), // [300, 200, 300]
        },
      },
      apns: {
        payload: {
          aps: {
            sound: options.sound || 'default',
            badge: options.badge, // Número en el icono de la app
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notificación FCM enviada exitosamente:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Error enviando notificación FCM:', error);
    
    // Errores comunes
    if (error.code === 'messaging/invalid-registration-token') {
      console.error('   Token FCM inválido o expirado');
    } else if (error.code === 'messaging/registration-token-not-registered') {
      console.error('   Token FCM no registrado (app desinstalada?)');
    }
    
    throw error;
  }
}

/**
 * Enviar notificación a múltiples tokens
 * @param {Array<string>} tokens - Array de tokens FCM
 * @param {Object} notification - { title, body, imageUrl?, icon? }
 * @param {Object} data - Datos personalizados
 * @param {Object} options - Opciones avanzadas: { sound?, priority?, channelId?, color?, vibrate?, badge? }
 */
export async function sendFCMNotificationToMultipleTokens(tokens, notification, data = {}, options = {}) {
  if (!firebaseInitialized) {
    throw new Error('Firebase Admin SDK no está inicializado');
  }

  if (!tokens || tokens.length === 0) {
    console.log('⚠️  No hay tokens para enviar notificación');
    return { success: false, error: 'No tokens provided' };
  }

  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: {
        ...Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : JSON.stringify(value),
          ])
        ),
      },
      android: {
        priority: options.priority || 'high',
        notification: {
          channelId: options.channelId || 'default',
          sound: options.sound || 'default',
          priority: options.priority || 'high',
          defaultSound: options.sound === undefined,
          defaultVibrateTimings: options.vibrate === undefined,
          color: options.color,
          icon: notification.icon,
          imageUrl: notification.imageUrl,
          tag: options.tag,
          ...(options.vibrate && { vibrateTimingsMillis: options.vibrate }),
        },
      },
      apns: {
        payload: {
          aps: {
            sound: options.sound || 'default',
            badge: options.badge,
          },
        },
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`✅ Notificaciones enviadas: ${response.successCount}/${tokens.length}`);
    if (response.failureCount > 0) {
      console.log(`⚠️  Fallos: ${response.failureCount}`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`   Token ${idx}: ${resp.error?.message}`);
        }
      });
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    console.error('❌ Error enviando notificaciones múltiples:', error);
    throw error;
  }
}

/**
 * Enviar notificación a un usuario (obtiene sus tokens de la BD)
 * @param {string} userId - ID del usuario
 * @param {Object} notification - { title, body, imageUrl?, icon? }
 * @param {Object} data - Datos personalizados
 * @param {Function} getDeviceTokensFunc - Función para obtener tokens del usuario
 * @param {Object} options - Opciones avanzadas: { sound?, priority?, channelId?, color?, vibrate?, badge? }
 */
export async function sendNotificationToUser(userId, notification, data = {}, getDeviceTokensFunc, options = {}) {
  try {
    // Obtener tokens del usuario desde la base de datos
    const deviceTokens = getDeviceTokensFunc(userId);
    
    if (!deviceTokens || deviceTokens.length === 0) {
      console.log(`⚠️  Usuario ${userId} no tiene tokens FCM registrados`);
      return { success: false, error: 'No device tokens found' };
    }

    const tokens = deviceTokens.map(dt => dt.token);
    console.log(`📤 Enviando notificación a usuario ${userId} (${tokens.length} dispositivos)`);

    return await sendFCMNotificationToMultipleTokens(tokens, notification, data, options);
  } catch (error) {
    console.error(`❌ Error enviando notificación a usuario ${userId}:`, error);
    throw error;
  }
}

/**
 * Verificar si Firebase está inicializado
 */
export function isFirebaseInitialized() {
  return firebaseInitialized;
}

export default {
  initializeFirebase,
  sendFCMNotification,
  sendFCMNotificationToMultipleTokens,
  sendNotificationToUser,
  isFirebaseInitialized,
};
