/**
 * Script de prueba para enviar notificaciones FCM
 * Uso: node test-fcm-notification.js <userId> <mensaje>
 */

import * as db from './database.js';

const userId = process.argv[2] || 'usuario123';
const message = process.argv[3] || 'Esta es una notificación de prueba desde Firebase!';

console.log('\n🧪 TEST DE NOTIFICACIONES FCM');
console.log('================================\n');

async function sendTestNotification() {
  try {
    // Obtener tokens del usuario
    const tokens = db.getDeviceTokens(userId);
    
    if (!tokens || tokens.length === 0) {
      console.log('❌ No hay tokens registrados para el usuario:', userId);
      console.log('💡 Asegúrate de que:');
      console.log('   1. La app esté abierta en el dispositivo');
      console.log('   2. Firebase se haya inicializado correctamente');
      console.log('   3. El token FCM se haya enviado al servidor');
      return;
    }

    console.log(`✅ Usuario: ${userId}`);
    console.log(`📱 Tokens encontrados: ${tokens.length}\n`);
    
    tokens.forEach((tokenData, index) => {
      console.log(`Token ${index + 1}:`);
      console.log(`  - Token: ${tokenData.token.substring(0, 50)}...`);
      console.log(`  - Plataforma: ${tokenData.platform}`);
      console.log(`  - Registrado: ${tokenData.registered_at}\n`);
    });

    console.log('📤 Para enviar una notificación FCM, necesitas:');
    console.log('   1. Configurar Firebase Admin SDK en el servidor');
    console.log('   2. Implementar el endpoint /notifications/send-fcm');
    console.log('   3. O usar la consola de Firebase para enviar notificaciones de prueba\n');
    
    console.log('🔗 Enviar notificación desde consola de Firebase:');
    console.log('   https://console.firebase.google.com/project/julie-assistant-37b3e/notification\n');
    
    console.log('📋 Token FCM para copiar:');
    console.log(tokens[0].token);
    console.log('\n✨ Copia el token de arriba y úsalo en la consola de Firebase para enviar una notificación de prueba\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

sendTestNotification();
